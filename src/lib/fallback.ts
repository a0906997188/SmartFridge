// Shared fallback (demo) data used by the server when no GEMINI_API_KEY is set,
// and by the browser when no backend is reachable (e.g. GitHub Pages).
// Fallback helper functions
export function getFallbackDetectionResult() {
  return {
    ingredients: [
      {
        name: '雞蛋',
        quantity: 4,
        unit: '顆',
        category: 'dairy_egg',
        location: 'shelf_top',
        confidence: 0.96,
        status: 'ok',
        bbox: [180, 120, 360, 420],
        freshnessTip: '冷藏保存良好，蛋殼完整，建議兩週內食用完畢',
      },
      {
        name: '牛奶',
        quantity: 1,
        unit: '半瓶',
        category: 'dairy_egg',
        location: 'shelf_top',
        confidence: 0.92,
        status: 'ok',
        bbox: [150, 520, 420, 820],
        freshnessTip: '開封後請儘速於 3 天內飲用',
      },
      {
        name: '高麗菜',
        quantity: 0.5,
        unit: '半顆',
        category: 'veg',
        location: 'shelf_mid',
        confidence: 0.88,
        status: 'ok',
        bbox: [430, 80, 680, 440],
        freshnessTip: '切面保鮮膜包覆，水分充足',
      },
      {
        name: '香菇',
        quantity: 6,
        unit: '朵',
        category: 'veg',
        location: 'shelf_mid',
        confidence: 0.71,
        status: 'wait',
        bbox: [450, 500, 670, 780],
        freshnessTip: '照片局部陰影，請確認數量與乾燥度',
      },
      {
        name: '雞胸肉',
        quantity: 300,
        unit: 'g',
        category: 'meat',
        location: 'shelf_bottom',
        confidence: 0.68,
        status: 'wait',
        bbox: [700, 150, 920, 520],
        freshnessTip: '冷藏肉品，請確認份量約 300g 或一盒',
      },
      {
        name: '板豆腐',
        quantity: 1,
        unit: '塊',
        category: 'tofu_beans',
        location: 'pantry',
        confidence: 0.94,
        status: 'ok',
        bbox: [710, 560, 910, 860],
        freshnessTip: '盒裝完整，高蛋白質良伴',
      },
    ],
  };
}

export function getFallbackRecipes(
  ingredients: any[],
  equipments: string[],
  dietaryStyle: string,
  quickTimeOnly: boolean
) {
  const hasChicken = ingredients.some((i) => i.name.includes('雞') || i.name.includes('肉'));
  const hasEgg = ingredients.some((i) => i.name.includes('蛋'));
  const hasTofu = ingredients.some((i) => i.name.includes('豆腐'));
  const hasCabbage = ingredients.some((i) => i.name.includes('高麗菜') || i.name.includes('菜'));

  const allowedEquip = equipments.length ? equipments : ['電鍋'];
  const primaryEquip = allowedEquip.includes('電鍋') ? '電鍋' : allowedEquip[0];
  const secondEquip = allowedEquip.includes('微波爐') ? '微波爐' : primaryEquip;

  const recipes = [];

  // Recipe 1: 蒜香雞肉蒸豆腐
  recipes.push({
    id: 'recipe-fallback-1',
    title: `${primaryEquip}蒜香清蒸雞肉豆腐`,
    description: `免顧火零油煙！利用${primaryEquip}加熱鎖住雞肉多汁與豆腐滑嫩，優質高蛋白質。`,
    cookingTimeMinutes: quickTimeOnly ? 12 : 15,
    difficulty: '超簡單',
    equipment: [primaryEquip],
    tags: ['高蛋白增肌', '免開火', '極速15分鐘'],
    caloriesEstimate: 360,
    proteinGrams: 38,
    ingredients: [
      { name: '雞胸肉', amount: '200g 切片', isOwned: hasChicken, matchedIngredientName: '雞胸肉' },
      { name: '板豆腐', amount: '半塊 切厚片', isOwned: hasTofu, matchedIngredientName: '板豆腐' },
      { name: '香菇', amount: '3 朵 切片', isOwned: true, matchedIngredientName: '香菇' },
    ],
    seasonings: ['薄鹽醬油 1 大匙', '蒜泥 1 小匙', '白胡椒 少許', '香油 1/2 小匙'],
    steps: [
      {
        stepNumber: 1,
        instruction: '板豆腐切塊平鋪於耐熱容器底部，上方交錯放上切片雞胸肉與香菇。',
        timerMinutes: 0,
        tip: '豆腐鋪底可完整吸附蒸煮出的甘甜雞汁！',
      },
      {
        stepNumber: 2,
        instruction: '淋上醬油、蒜泥與少許胡椒粉調味。',
        timerMinutes: 0,
      },
      {
        stepNumber: 3,
        instruction:
          primaryEquip === '電鍋'
            ? '電鍋外鍋加半杯水（約 80ml），按下開關蒸煮至跳起，悶 3 分鐘即可。'
            : primaryEquip === '微波爐'
            ? '加微波保鮮蓋，微波（700W）加熱 5 分鐘至雞肉全熟即可。'
            : `${primaryEquip}加熱 12 分鐘至食材熟透。`,
        timerMinutes: quickTimeOnly ? 10 : 12,
        tip: '料理跳起後稍微悶 2 分鐘肉質更軟嫩！',
      },
    ],
    tips: '撒上少許白胡椒增添香氣。',
  });

  // Recipe 2: 溫野菜烘蛋
  recipes.push({
    id: 'recipe-fallback-2',
    title: `${secondEquip}香菇溫野菜嫩蛋`,
    description: '10分鐘超快出菜！高麗菜與香菇吸飽蛋香，低醣脆甜又飽足。',
    cookingTimeMinutes: 10,
    difficulty: '超簡單',
    equipment: [secondEquip],
    tags: ['極速15分鐘', '高纖低卡', '快速出菜'],
    caloriesEstimate: 210,
    proteinGrams: 16,
    ingredients: [
      { name: '雞蛋', amount: '2 顆 打散', isOwned: hasEgg, matchedIngredientName: '雞蛋' },
      { name: '高麗菜', amount: '約 1/4 顆 撕小塊', isOwned: hasCabbage, matchedIngredientName: '高麗菜' },
      { name: '香菇', amount: '2 朵 切片', isOwned: true, matchedIngredientName: '香菇' },
    ],
    seasonings: ['橄欖油 1 茶匙', '鹽 1/4 茶匙', '黑胡椒粒 適量'],
    steps: [
      {
        stepNumber: 1,
        instruction: '在耐熱深碗中放入洗淨的高麗菜片與香菇，淋上少許油與微量水。',
        timerMinutes: 0,
      },
      {
        stepNumber: 2,
        instruction:
          secondEquip === '微波爐'
            ? '覆蓋微波保鮮蓋（留氣孔），微波加熱 2 分鐘至高麗菜稍微軟化。'
            : `${secondEquip}先預熱蒸熟蔬菜約 3 分鐘。`,
        timerMinutes: 2,
      },
      {
        stepNumber: 3,
        instruction:
          secondEquip === '微波爐'
            ? '取出淋上打散並調味的蛋液，稍微搖勻，再次微波加熱 2 分鐘至蛋液凝固即成。'
            : '淋上打勻的蛋液，繼續加熱 4 分鐘至蛋液凝固。',
        timerMinutes: 2,
      },
    ],
    tips: '出爐撒上黑胡椒粒，香氣倍增！',
  });

  return recipes;
}

export function getFallbackSwappedRecipe(
  originalRecipe: any,
  mustKeep: string[],
  swapReason: string,
  equipments: string[],
  dietaryStyle: string,
  quickTimeOnly: boolean
) {
  const allowedEquip = equipments.length ? equipments : ['電鍋'];
  const equip = allowedEquip.includes('電鍋') ? '電鍋' : allowedEquip[0];

  const kept1 = mustKeep[0] || '板豆腐';
  const kept2 = mustKeep[1] || '高麗菜';

  return {
    id: 'swapped-fallback-' + Date.now(),
    title: `${equip}清爽和風鮮蔬蒸豆腐`,
    description: `針對「${swapReason || '換個口味'}」量身替換：嚴格保留指定食材【${mustKeep.join('、') || kept1}】，免油煙清爽低負擔！`,
    cookingTimeMinutes: quickTimeOnly ? 10 : 12,
    difficulty: '超簡單',
    equipment: [equip],
    tags: ['動態換菜', '客製化調整', '清爽低負擔', '極速15分鐘'],
    caloriesEstimate: 220,
    proteinGrams: 22,
    ingredients: [
      { name: kept1, amount: '1 份', isOwned: true, matchedIngredientName: kept1 },
      { name: kept2, amount: '適量', isOwned: true, matchedIngredientName: kept2 },
      { name: '雞蛋', amount: '1 顆', isOwned: true, matchedIngredientName: '雞蛋' },
    ],
    seasonings: ['薄鹽和風醬油 1 大匙', '白芝麻 少許', '香油 數滴'],
    steps: [
      {
        stepNumber: 1,
        instruction: `依據換菜理由，本道料理改用${equip}料理，完全避免繁複步驟與油膩感。`,
        timerMinutes: 0,
      },
      {
        stepNumber: 2,
        instruction: `將必留食材【${kept1}】與其他食材排入蒸盤，淋上和風醬汁。`,
        timerMinutes: 0,
      },
      {
        stepNumber: 3,
        instruction: `放入${equip}加熱 8 ~ 10 分鐘至食材熟透，取出後滴上少許香油即可享用。`,
        timerMinutes: 8,
        tip: '純蒸煮能鎖住食材自然甜味，清甜爽口！',
      },
    ],
    tips: '保留指定食材之餘，做法更加省時省力！',
  };
}

