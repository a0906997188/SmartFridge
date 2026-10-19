import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { getFallbackDetectionResult, getFallbackRecipes, getFallbackSwappedRecipe } from './src/lib/fallback';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

// Enable CORS for external frontend deployment (e.g. GitHub Pages)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Task 2.1: Model constant definition
const MODEL_NAME = 'gemini-3.8-flash';

// Initialize shared Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

/**
 * Health check
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ error: false, message: '服務正常運行', hasApiKey: !!apiKey, model: MODEL_NAME });
});

/**
 * Helper: Validation & Sanitization functions for Task 3 & 4
 */
const SEAFOOD_KEYWORDS = ['海鮮', '魚', '鮭魚', '鱈魚', '鱸魚', '鮪魚', '鯛魚', '蝦', '蝦仁', '蟹', '蛤', '蛤蜊', '透抽', '花枝', '魷魚', '干貝', '蚵', '牡蠣', '生蠔'];
const FORBIDDEN_FIRE_KEYWORDS = ['明火', '爐火', '瓦斯爐', '開火', '起油鍋', '熱鍋', '大火', '中火', '小火', '大火快炒', '爆香煎炒', '烤箱'];

function checkRecipeCompliance(
  recipe: any,
  allowedEquipments: string[],
  excludedIngredients: string[],
  dietaryStyle: string,
  quickTimeOnly: boolean
): { compliant: boolean; issues: string[] } {
  const issues: string[] = [];

  // 1. Time check
  if (quickTimeOnly && recipe.cookingTimeMinutes > 15) {
    issues.push(`烹調時間 (${recipe.cookingTimeMinutes} 分鐘) 超過 15 分鐘極速限制`);
  }

  // 2. Equipment check
  const usedEquip = Array.isArray(recipe.equipment) ? recipe.equipment : [recipe.equipment];
  for (const eq of usedEquip) {
    if (!allowedEquipments.includes(eq)) {
      issues.push(`使用了未被允許的設備：${eq}（僅限：${allowedEquipments.join('、')}）`);
    }
  }

  // 3. Fire / open flame check for microwave/steamer only
  const onlyElectricOrMicrowave = allowedEquipments.every((e) => e === '電鍋' || e === '微波爐');
  const allStepsText = (recipe.steps || []).map((s: any) => s.instruction || '').join(' ');
  if (onlyElectricOrMicrowave) {
    for (const kw of FORBIDDEN_FIRE_KEYWORDS) {
      if (allStepsText.includes(kw) || recipe.title.includes(kw)) {
        issues.push(`僅使用電鍋/微波爐，但步驟或名稱出現了火爐字詞：${kw}`);
      }
    }
  }

  // 4. Excluded ingredients & seafood check
  const fullExcluded = [...excludedIngredients];
  if (dietaryStyle === 'no_seafood') {
    fullExcluded.push(...SEAFOOD_KEYWORDS);
  }

  const allIngredientsText = (recipe.ingredients || [])
    .map((i: any) => i.name || '')
    .join(' ');

  for (const ex of fullExcluded) {
    const cleanEx = ex.trim();
    if (!cleanEx) continue;
    if (allIngredientsText.includes(cleanEx) || allStepsText.includes(cleanEx) || recipe.title.includes(cleanEx)) {
      issues.push(`包含被排除的食材禁忌：${cleanEx}`);
    }
  }

  return {
    compliant: issues.length === 0,
    issues,
  };
}

/**
 * POST /api/identify-ingredients
 * Recognizes fridge food from photo using Gemini 3.8 Flash multi-modal
 */
app.post('/api/identify-ingredients', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: true, message: '缺少圖片資料 (imageBase64)' });
    }

    // Task 1.3: If no API key, return fallback data with source: "fallback"
    if (!ai) {
      console.warn('GEMINI_API_KEY not configured, using smart fallback detection');
      const fallbackResult = getFallbackDetectionResult();
      return res.json({
        error: false,
        message: '展示模式：使用示範資料',
        source: 'fallback',
        ingredients: fallbackResult.ingredients,
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `你是一位專業的料理與冰箱食材辨識 AI。請仔細辨識這張冰箱內部照片中所有的食材與食品。
針對每項食材請回傳：
1. name: 食材繁體中文名稱 (例如: 雞蛋, 高麗菜, 板豆腐, 牛奶, 雞胸肉, 香菇, 青蔥, 洋蔥, 蒜頭, 番茄, 豬絞肉)
2. quantity: 估計數量 (數值，例如 4, 0.5, 1, 300, 6)
3. unit: 單位 (例如: 顆, 半顆, 塊, 瓶, g, 朵, 根, 包, 盒)
4. category: 分類，必須是以下之一: meat (肉類), veg (蔬菜), dairy_egg (蛋奶), tofu_beans (豆腐豆類), seafood (海鮮), condiment (調味料), other (其他)
5. location: 建議或在照片中的放置位置，必須是以下之一: shelf_top (冷藏上層), shelf_mid (冷藏中層), shelf_bottom (冷藏下層肉類), door (門邊), freezer (冷凍庫), pantry (常溫)
6. confidence: 辨識信心度 0.0 ~ 1.0 (如果模糊或被遮擋低於 0.75，若無法判斷信心度請填 0.5)
7. status: 若 confidence >= 0.75 則為 'ok'，若 confidence < 0.75 則為 'wait' (待確認)
8. bbox: 該食材在圖片中的邊界框 [ymin, xmin, ymax, xmax]（數值為 0 到 1000 的整數）。若無法精確看清框線位置，可省略此欄位或回傳 null。
9. freshnessTip: 食材保存小叮嚀或預估賞味期 (例如: "建議冷藏3天內料理完畢")

請嚴格依照 JSON Schema 輸出繁體中文食材清單。`;

    // Attempt Gemini call with retry
    let parsed: any = null;
    let attempts = 0;
    while (attempts < 2 && !parsed) {
      attempts++;
      try {
        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              { text: prompt },
            ],
          },
          config: {
            systemInstruction: '你是一位精確的廚房食材視覺辨識專家，嚴格以繁體中文與 JSON Schema 輸出。',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  category: { type: Type.STRING },
                  location: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  status: { type: Type.STRING },
                  bbox: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                  },
                  freshnessTip: { type: Type.STRING },
                },
                required: ['name', 'quantity', 'unit', 'category', 'location'],
              },
            },
          },
        });

        const text = response.text || '[]';
        parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) parsed = null;
      } catch (e) {
        console.warn(`Identify ingredients attempt ${attempts} failed:`, e);
      }
    }

    if (!parsed) {
      return res.status(500).json({
        error: true,
        message: 'AI 辨識結構解析失敗，請重新拍攝或重試。',
      });
    }

    return res.json({
      error: false,
      message: '辨識成功',
      source: 'ai',
      ingredients: parsed,
    });
  } catch (error: any) {
    console.error('Error identifying ingredients:', error);
    return res.status(500).json({
      error: true,
      message: error?.message || '辨識過程發生連線錯誤，請點擊重試。',
    });
  }
});

/**
 * POST /api/generate-recipes
 * Generates custom recipes based on available ingredients and user preferences (Task 2 & 3)
 */
app.post('/api/generate-recipes', async (req: Request, res: Response) => {
  try {
    const {
      ingredients = [],
      equipments = ['電鍋', '微波爐'],
      dietaryStyle = 'none',
      quickTimeOnly = false,
      excludedIngredients = [],
      servings = 1,
    } = req.body;

    // Filter only ingredients with status 'ok' (Task 3.6)
    const validIngredients = ingredients.filter((i: any) => i.status !== 'wait' && i.status !== 'depleted');

    if (!validIngredients.length) {
      return res.status(400).json({
        error: true,
        message: '冰箱內無已確認 (ok) 的食材可供推薦，請先確認待確認食材或新增食材。',
      });
    }

    // Task 1.3: If no API key, return fallback data with source: "fallback"
    if (!ai) {
      console.warn('GEMINI_API_KEY not configured, using fallback recipes');
      const fallbackList = getFallbackRecipes(validIngredients, equipments, dietaryStyle, quickTimeOnly);
      return res.json({
        error: false,
        message: '展示模式：使用示範食譜庫',
        source: 'fallback',
        recipes: fallbackList,
      });
    }

    const availableNames = validIngredients
      .map((i: any) => `${i.name} (現有約 ${i.quantity} ${i.unit})`)
      .join('、');
    const expiringNames = validIngredients
      .filter((i: any) => typeof i.daysLeft === 'number' && i.daysLeft <= 3)
      .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
      .map((i: any) => (i.daysLeft < 0 ? `${i.name} (已過期，請先確認是否可食用)` : `${i.name} (剩 ${i.daysLeft} 天)`))
      .join('、');
    const equipStr = equipments.join('、') || '電鍋、單口瓦斯爐';

    // Build dietary requirement string
    let dietaryRequirement = '';
    if (dietaryStyle === 'high_protein') dietaryRequirement = '風格：高蛋白增肌（蛋白質每份需大於 25g）';
    else if (dietaryStyle === 'low_carb') dietaryRequirement = '風格：低醣生酮（嚴格避免精緻澱粉、加糖）';
    else if (dietaryStyle === 'vegetarian') dietaryRequirement = '風格：全素蔬食（完全不使用肉類、海鮮、動物油）';
    else if (dietaryStyle === 'no_seafood') dietaryRequirement = '風格：海鮮排除（嚴格禁止使用任何海鮮、魚類、蝦蟹貝類）';

    // Build full exclusions
    const fullExcluded = [...excludedIngredients];
    if (dietaryStyle === 'no_seafood') {
      fullExcluded.push(...SEAFOOD_KEYWORDS);
    }
    const excludedStr = fullExcluded.length ? fullExcluded.join('、') : '無';

    const onlyElectricOrMicrowave = equipments.every((e: string) => e === '電鍋' || e === '微波爐');

    const promptGenerator = (extraGuidance = '') => `請根據使用者冰箱內的現有食材，推薦 2 ~ 3 道美味、實作性高、廚房友善的家常食譜。

【使用者條件與嚴格限制】
- 現有食材：${availableNames}
${expiringNames ? `- ⏰ 即將過期食材（請優先使用，至少一道食譜要用到）：${expiringNames}
` : ''}- 限制可用設備：【${equipStr}】（極其嚴格！每道食譜使用的設備必須僅限於此清單中。若無瓦斯爐，絕不能要求開火煎炒或使用烤箱！）
- 排除食材禁忌：【${excludedStr}】（嚴格！食譜與步驟絕對不得出現這些食材或其同義詞）
- 時間限制：${quickTimeOnly ? '極速 15 分鐘出菜（總時間必須在 15 分鐘以內）' : '一般家常時間'}
- 飲食風格：${dietaryRequirement || '一般均衡美味'}
- 份量：${servings} 人份
${onlyElectricOrMicrowave ? '- ⚠️ 警告：目前設備只有【電鍋/微波爐】，步驟中絕對禁止出現「明火」、「爐火」、「開火」、「熱鍋」、「大火快炒」等字眼！' : ''}
${extraGuidance}

【要求輸出規格】
每道食譜包含：id, title, description, cookingTimeMinutes (整數), difficulty, equipment (陣列，必須在 ${equipStr} 內), tags, caloriesEstimate, proteinGrams, ingredients (包含 name, amount, isOwned), seasonings, steps (stepNumber, instruction, timerMinutes, tip), tips。`;

    // Attempt Gemini call with programmatic verification and 1 retry
    let verifiedRecipes: any[] = [];
    let attempts = 0;
    let retryGuidance = '';

    while (attempts < 2 && verifiedRecipes.length === 0) {
      attempts++;
      try {
        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: promptGenerator(retryGuidance),
          config: {
            systemInstruction: '你是一位星級主廚，嚴格遵守繁體中文、JSON Schema 與廚房設備禁忌規範。',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  cookingTimeMinutes: { type: Type.INTEGER },
                  difficulty: { type: Type.STRING },
                  equipment: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  caloriesEstimate: { type: Type.INTEGER },
                  proteinGrams: { type: Type.INTEGER },
                  ingredients: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        amount: { type: Type.STRING },
                        isOwned: { type: Type.BOOLEAN },
                        matchedIngredientName: { type: Type.STRING },
                      },
                      required: ['name', 'amount', 'isOwned'],
                    },
                  },
                  seasonings: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  steps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        stepNumber: { type: Type.INTEGER },
                        instruction: { type: Type.STRING },
                        timerMinutes: { type: Type.INTEGER },
                        tip: { type: Type.STRING },
                      },
                      required: ['stepNumber', 'instruction'],
                    },
                  },
                  tips: { type: Type.STRING },
                },
                required: ['id', 'title', 'cookingTimeMinutes', 'equipment', 'ingredients', 'steps'],
              },
            },
          },
        });

        const text = response.text || '[]';
        const rawList = JSON.parse(text);

        if (Array.isArray(rawList)) {
          // Programmatic compliance check (Task 3.3, 3.4, 3.5)
          const compliantList = [];
          const violations: string[] = [];

          for (const item of rawList) {
            const check = checkRecipeCompliance(
              item,
              equipments,
              excludedIngredients,
              dietaryStyle,
              quickTimeOnly
            );
            if (check.compliant) {
              compliantList.push(item);
            } else {
              violations.push(...check.issues);
            }
          }

          if (compliantList.length > 0) {
            verifiedRecipes = compliantList;
          } else {
            retryGuidance = `\n上一輪生成的食譜違反了以下規則，請務必改正重新生成：\n${violations.join('\n')}`;
          }
        }
      } catch (err) {
        console.warn(`Generate recipes attempt ${attempts} failed:`, err);
      }
    }

    if (verifiedRecipes.length === 0) {
      // Fallback guarantee to never leave user stranded
      const fallbackList = getFallbackRecipes(validIngredients, equipments, dietaryStyle, quickTimeOnly);
      return res.json({
        error: false,
        message: '為確保 100% 符合您的廚房設備與飲食限制，已切換為安全備援食譜。',
        source: 'fallback',
        recipes: fallbackList,
      });
    }

    return res.json({
      error: false,
      message: '食譜生成成功',
      source: 'ai',
      recipes: verifiedRecipes,
    });
  } catch (error: any) {
    console.error('Error generating recipes:', error);
    return res.status(500).json({
      error: true,
      message: error?.message || '食譜生成失敗，請點擊重試。',
    });
  }
});

/**
 * POST /api/swap-recipe
 * Dynamic recipe swapping with retention of "must-keep" ingredients & reason adjustments (Task 4)
 */
app.post('/api/swap-recipe', async (req: Request, res: Response) => {
  try {
    const {
      originalRecipe,
      mustKeepIngredients = [],
      swapReason = '換個口味',
      equipments = ['電鍋', '微波爐'],
      dietaryStyle = 'none',
      quickTimeOnly = false,
      excludedIngredients = [],
      allFridgeIngredients = [],
    } = req.body;

    if (!originalRecipe) {
      return res.status(400).json({ error: true, message: '缺少原食譜資料' });
    }

    // Task 1.3: Fallback if no API key
    if (!ai) {
      console.warn('GEMINI_API_KEY not configured, using fallback swapped recipe');
      const swapped = getFallbackSwappedRecipe(
        originalRecipe,
        mustKeepIngredients,
        swapReason,
        equipments,
        dietaryStyle,
        quickTimeOnly
      );
      return res.json({
        error: false,
        message: '展示模式：使用示範換菜結果',
        source: 'fallback',
        recipe: swapped,
      });
    }

    const validFridge = allFridgeIngredients.filter((i: any) => i.status !== 'wait' && i.status !== 'depleted');
    const fridgeListStr = validFridge.map((i: any) => `${i.name} (${i.quantity} ${i.unit})`).join('、');
    const keepListStr = mustKeepIngredients.length > 0 ? mustKeepIngredients.join('、') : '無指定，由主廚自由搭配';
    const equipStr = equipments.join('、') || '電鍋、微波爐';

    // Full exclusions
    const fullExcluded = [...excludedIngredients];
    if (dietaryStyle === 'no_seafood') {
      fullExcluded.push(...SEAFOOD_KEYWORDS);
    }
    const excludedStr = fullExcluded.length ? fullExcluded.join('、') : '無';
    const onlyElectricOrMicrowave = equipments.every((e: string) => e === '電鍋' || e === '微波爐');

    const promptGenerator = (extraMsg = '') => `使用者想把原本的食譜「${originalRecipe.title}」換掉！

【換菜原因與反饋】
使用者提出的換菜理由是：「${swapReason}」
（若是不想開火，請只用微波或電鍋；若是太油，請改清蒸或水煮；若是太麻煩，請簡化在 3 步以內）

【必留食材條件（必須 100% 保留）】
使用者指定「必須保留」的食材：【${keepListStr}】
新食譜的食材清單中，必須包含上述所有必留食材！

【其他嚴格限制】
- 冰箱現有其他食材：${fridgeListStr}
- 限制可用設備：【${equipStr}】（嚴格遵守，絕不得超越）
- 排除食材禁忌：【${excludedStr}】（嚴禁出現）
- 時間限制：${quickTimeOnly ? '極速 15 分鐘以內' : '一般時間'}
- 風格：${dietaryStyle}
${onlyElectricOrMicrowave ? '- ⚠️ 目前只有【電鍋/微波爐】，步驟中絕對禁止出現「明火」、「爐火」、「開火」、「熱鍋」等字眼！' : ''}
${extraMsg}

請生成 1 道嶄新的食譜物件。`;

    let finalRecipe: any = null;
    let attempts = 0;
    let retryMsg = '';

    while (attempts < 2 && !finalRecipe) {
      attempts++;
      try {
        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: promptGenerator(retryMsg),
          config: {
            systemInstruction: '你是一位注重客人反饋的星級主廚，嚴格遵守繁體中文、JSON Schema 與必留食材要求。',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                cookingTimeMinutes: { type: Type.INTEGER },
                difficulty: { type: Type.STRING },
                equipment: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                caloriesEstimate: { type: Type.INTEGER },
                proteinGrams: { type: Type.INTEGER },
                ingredients: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      amount: { type: Type.STRING },
                      isOwned: { type: Type.BOOLEAN },
                      matchedIngredientName: { type: Type.STRING },
                    },
                    required: ['name', 'amount', 'isOwned'],
                  },
                },
                seasonings: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      stepNumber: { type: Type.INTEGER },
                      instruction: { type: Type.STRING },
                      timerMinutes: { type: Type.INTEGER },
                      tip: { type: Type.STRING },
                    },
                    required: ['stepNumber', 'instruction'],
                  },
                },
                tips: { type: Type.STRING },
              },
              required: ['id', 'title', 'cookingTimeMinutes', 'equipment', 'ingredients', 'steps'],
            },
          },
        });

        const text = response.text || '{}';
        const recipe = JSON.parse(text);

        // Verification for Task 4.1 & Task 3
        const check = checkRecipeCompliance(
          recipe,
          equipments,
          excludedIngredients,
          dietaryStyle,
          quickTimeOnly
        );

        // Also check if must-keep ingredients are retained
        const ingNames = (recipe.ingredients || []).map((i: any) => i.name || '');
        const missingKept = mustKeepIngredients.filter(
          (k: string) => !ingNames.some((n: string) => n.includes(k) || k.includes(n))
        );

        if (check.compliant && missingKept.length === 0) {
          finalRecipe = recipe;
        } else {
          const reasons = [...check.issues];
          if (missingKept.length > 0) {
            reasons.push(`未包含使用者指定必留的食材：${missingKept.join('、')}`);
          }
          retryMsg = `\n上一輪生成的換菜食譜有以下問題，請修正並重新輸出：\n${reasons.join('\n')}`;
        }
      } catch (err) {
        console.warn(`Swap recipe attempt ${attempts} failed:`, err);
      }
    }

    if (!finalRecipe) {
      finalRecipe = getFallbackSwappedRecipe(
        originalRecipe,
        mustKeepIngredients,
        swapReason,
        equipments,
        dietaryStyle,
        quickTimeOnly
      );
      return res.json({
        error: false,
        message: '為確保完全保留必留食材並避開限制，已啟用備援換菜食譜。',
        source: 'fallback',
        recipe: finalRecipe,
      });
    }

    return res.json({
      error: false,
      message: '換菜成功',
      source: 'ai',
      recipe: finalRecipe,
    });
  } catch (error: any) {
    console.error('Error swapping recipe:', error);
    return res.status(500).json({
      error: true,
      message: error?.message || '換菜失敗，請點擊重試。',
    });
  }
});

// Fullstack Express + Vite integration
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FridgeChef server listening on port ${PORT}`);
  });
}

// In local or Cloud Run, run standalone server; in Vercel serverless, export app
if (process.env.VERCEL !== '1' && process.env.VERCEL !== 'true') {
  startServer();
}

export default app;
