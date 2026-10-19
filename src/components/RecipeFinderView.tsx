import React, { useState } from 'react';
import {
  Sparkles,
  Flame,
  Clock,
  ChevronRight,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Pause,
  CheckCircle,
  Circle,
  Check,
  X,
  ChefHat,
  ArrowLeft,
  SlidersHorizontal,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  RefreshCw,
} from 'lucide-react';
import {
  Ingredient,
  Recipe,
  UserPreferences,
  KitchenEquipment,
  DietaryStyle,
  RecipeIngredient,
  RecipeStep,
} from '../types/fridge';
import { getFoodEmoji } from '../data/initialData';
import { postApi } from '../lib/api';
import { getDaysLeft } from '../lib/expiry';

interface RecipeFinderViewProps {
  ingredients: Ingredient[];
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: UserPreferences) => void;
  onCookCompleted: (recipe: Recipe, servings: number) => void;
}

export const RecipeFinderView: React.FC<RecipeFinderViewProps> = ({
  ingredients,
  preferences,
  onUpdatePreferences,
  onCookCompleted,
}) => {
  // Navigation internal step: 'filter' | 'list' | 'detail'
  const [step, setStep] = useState<'filter' | 'list' | 'detail'>('filter');

  // Filter conditions
  const [selectedEquipments, setSelectedEquipments] = useState<KitchenEquipment[]>(
    preferences.equipments || ['電鍋', '微波爐']
  );
  const [dietaryStyle, setDietaryStyle] = useState<DietaryStyle>(preferences.dietaryStyle || 'none');
  const [quickTimeOnly, setQuickTimeOnly] = useState<boolean>(preferences.quickTimeOnly || false);
  const [excludedList, setExcludedList] = useState<string[]>(preferences.excludedIngredients || ['香菜']);
  const [newExcludedInput, setNewExcludedInput] = useState('');
  const [servings, setServings] = useState<number>(preferences.servings || 1);

  // Recipes state
  const [isLoading, setIsLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeRecipeIndex, setActiveRecipeIndex] = useState<number>(0);
  const [historyRecipes, setHistoryRecipes] = useState<{ [recipeId: string]: Recipe[] }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFallbackSource, setIsFallbackSource] = useState(false);

  // Detail / Kitchen cooking mode state
  const [checkedIngredients, setCheckedIngredients] = useState<{ [name: string]: boolean }>({});
  const [mustKeepIngredients, setMustKeepIngredients] = useState<{ [name: string]: boolean }>({});
  const [completedSteps, setCompletedSteps] = useState<{ [stepNumber: number]: boolean }>({});
  const [currentCookingStep, setCurrentCookingStep] = useState<number>(1);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Swap modal state
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapReason, setSwapReason] = useState('換個口味');
  const [customSwapReason, setCustomSwapReason] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapErrorMessage, setSwapErrorMessage] = useState<string | null>(null);

  // Task 3.6: 只有狀態為 ok 的食材計入推薦；wait 狀態的食材不計入
  const validOkIngredients = ingredients.filter((i) => i.status === 'ok');
  const pendingCount = ingredients.filter((i) => i.status === 'wait').length;

  // Equipments list
  const equipmentOptions: { id: KitchenEquipment; name: string; emoji: string; desc: string }[] = [
    { id: '電鍋', name: '電鍋', emoji: '🍲', desc: '純蒸煮、無油煙免顧火' },
    { id: '微波爐', name: '微波爐', emoji: '📡', desc: '極速加熱、溫野菜嫩蛋' },
    { id: '氣炸鍋', name: '氣炸鍋', emoji: '🍟', desc: '逼油酥脆、免開火' },
    { id: '單口瓦斯爐', name: '單口瓦斯爐', emoji: '🔥', desc: '快速熱鍋快炒或煎封' },
  ];

  // Dietary styles (Task 3.1: 新增「海鮮排除」選項)
  const dietaryOptions: { id: DietaryStyle; label: string; desc: string; emoji: string }[] = [
    { id: 'none', label: '一般均衡', desc: '無特殊飲食限制', emoji: '🍽️' },
    { id: 'high_protein', label: '高蛋白增肌', desc: '提升雞肉、蛋奶、豆腐蛋白質', emoji: '💪' },
    { id: 'low_carb', label: '低醣生酮', desc: '降低精緻碳水，多蔬菜好油', emoji: '🥑' },
    { id: 'vegetarian', label: '全素蔬食', desc: '無肉、無海鮮、純植物性', emoji: '🌱' },
    { id: 'no_seafood', label: '海鮮排除', desc: '嚴格排除魚蝦蟹貝海味', emoji: '🚫🐟' },
  ];

  const toggleEquipment = (eq: KitchenEquipment) => {
    setSelectedEquipments((prev) =>
      prev.includes(eq) ? (prev.length > 1 ? prev.filter((e) => e !== eq) : prev) : [...prev, eq]
    );
  };

  const handleAddExcluded = () => {
    if (!newExcludedInput.trim()) return;
    if (!excludedList.includes(newExcludedInput.trim())) {
      setExcludedList([...excludedList, newExcludedInput.trim()]);
    }
    setNewExcludedInput('');
  };

  const handleRemoveExcluded = (item: string) => {
    setExcludedList(excludedList.filter((e) => e !== item));
  };

  // Generate recipes via API
  const handleGenerateRecipes = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setStep('list');

    // Save preferences
    const updatedPrefs: UserPreferences = {
      equipments: selectedEquipments,
      dietaryStyle,
      quickTimeOnly,
      excludedIngredients: excludedList,
      servings,
    };
    onUpdatePreferences(updatedPrefs);

    try {
      const data = await postApi('/api/generate-recipes', {
        // Task 3.6: only 'ok'; daysLeft lets the AI prioritise items about to expire
        ingredients: validOkIngredients.map((i) => ({ ...i, daysLeft: getDaysLeft(i) })),
        equipments: selectedEquipments,
        dietaryStyle,
        quickTimeOnly,
        excludedIngredients: excludedList,
        servings,
      });
      if (data.source === 'fallback') {
        setIsFallbackSource(true);
      } else {
        setIsFallbackSource(false);
      }

      if (data.error || !data.recipes) {
        setErrorMessage(data.message || '食譜生成遭遇異常，請檢查條件或重試。');
        return;
      }

      setRecipes(data.recipes);
      setActiveRecipeIndex(0);
    } catch (err: any) {
      console.error('Failed to generate recipes:', err);
      // Task 2.3: 不得清空已確認的清單，提供重試
      setErrorMessage(err?.message || '食譜生成連線失敗，請點擊重試。');
    } finally {
      setIsLoading(false);
    }
  };

  // Select recipe to enter cooking detail
  const handleOpenDetail = (index: number) => {
    setActiveRecipeIndex(index);
    setStep('detail');
    setCompletedSteps({});
    setCurrentCookingStep(1);
    stopSpeaking();

    // Default all owned ingredients checked, and first 2 as must-keep
    const current = recipes[index];
    if (current) {
      const checked: { [k: string]: boolean } = {};
      const keeps: { [k: string]: boolean } = {};
      current.ingredients.forEach((ing, i) => {
        checked[ing.name] = ing.isOwned;
        if (i < 2 && ing.isOwned) keeps[ing.name] = true;
      });
      setCheckedIngredients(checked);
      setMustKeepIngredients(keeps);
    }
  };

  // Web Speech API for step read-aloud
  const speakStep = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-TW';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Handle Dynamic Recipe Swap (Task 4)
  const handleConfirmSwap = async () => {
    const current = recipes[activeRecipeIndex];
    if (!current) return;

    setIsSwapping(true);
    setSwapErrorMessage(null);
    const chosenReason = customSwapReason.trim() || swapReason;
    const keptList = Object.keys(mustKeepIngredients).filter((k) => mustKeepIngredients[k]);

    try {
      const data = await postApi('/api/swap-recipe', {
        originalRecipe: current,
        mustKeepIngredients: keptList,
        swapReason: chosenReason,
        equipments: selectedEquipments,
        dietaryStyle,
        quickTimeOnly,
        excludedIngredients: excludedList,
        allFridgeIngredients: validOkIngredients,
      });
      if (data.error || !data.recipe) {
        setSwapErrorMessage(data.message || '換菜失敗，請重試。');
        return;
      }

      if (data.source === 'fallback') {
        setIsFallbackSource(true);
      }

      // Record previous recipe in history for undo (Task 4.2)
      setHistoryRecipes((prev) => ({
        ...prev,
        [data.recipe.id]: [...(prev[current.id] || []), current],
      }));

      // Replace current recipe
      const newRecipes = [...recipes];
      newRecipes[activeRecipeIndex] = data.recipe;
      setRecipes(newRecipes);

      setIsSwapModalOpen(false);
      setCustomSwapReason('');

      // Re-initialize checklist
      const checked: { [k: string]: boolean } = {};
      const keeps: { [k: string]: boolean } = {};
      data.recipe.ingredients.forEach((ing: any, i: number) => {
        checked[ing.name] = ing.isOwned;
        if (i < 2 && ing.isOwned) keeps[ing.name] = true;
      });
      setCheckedIngredients(checked);
      setMustKeepIngredients(keeps);
    } catch (err: any) {
      console.error('Swap recipe failed:', err);
      setSwapErrorMessage(err?.message || '換菜連線逾時，請重試。');
    } finally {
      setIsSwapping(false);
    }
  };

  // Undo Swap
  const handleUndoSwap = (currentId: string) => {
    const list = historyRecipes[currentId];
    if (!list || list.length === 0) return;
    const previous = list[list.length - 1];
    const newRecipes = [...recipes];
    newRecipes[activeRecipeIndex] = previous;
    setRecipes(newRecipes);
    setHistoryRecipes((prev) => ({
      ...prev,
      [previous.id]: list.slice(0, -1),
    }));
  };

  const currentRecipe = recipes[activeRecipeIndex];

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-150">
      {/* Step Navigation Bar */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-[#E2E8E5] shadow-xs">
        <div className="flex items-center gap-2">
          {step !== 'filter' && (
            <button
              onClick={() => setStep(step === 'detail' ? 'list' : 'filter')}
              aria-label="返回上一頁"
              className="p-2 -ml-1 text-gray-500 hover:text-gray-800 rounded-xl hover:bg-gray-100 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <span className="font-extrabold text-lg text-[#2B2B2B]">
            {step === 'filter' && '條件設定'}
            {step === 'list' && '推薦料理食譜'}
            {step === 'detail' && (currentRecipe?.title || '食譜詳情')}
          </span>
        </div>

        {/* Step indicator breadcrumbs */}
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <span className={`px-2.5 py-1 rounded-full ${step === 'filter' ? 'bg-[#2E9E6A] text-white' : 'text-gray-400'}`}>
            1. 條件
          </span>
          <span className="text-gray-300">›</span>
          <span className={`px-2.5 py-1 rounded-full ${step === 'list' ? 'bg-[#2E9E6A] text-white' : 'text-gray-400'}`}>
            2. 食譜
          </span>
          <span className="text-gray-300">›</span>
          <span className={`px-2.5 py-1 rounded-full ${step === 'detail' ? 'bg-[#2E9E6A] text-white' : 'text-gray-400'}`}>
            3. 烹飪
          </span>
        </div>
      </div>

      {/* Task 1.3: Fallback notice if demo data */}
      {isFallbackSource && (
        <div className="bg-[#FFF1E6] border border-[#F2B98A] text-[#9A4D12] p-3.5 rounded-2xl flex items-center gap-2.5 text-sm font-semibold">
          <Info className="w-5 h-5 text-[#E8833A] shrink-0" />
          <span>示範資料，未連接 AI（目前使用高品質離線示範食譜庫）</span>
        </div>
      )}

      {/* STEP 1: Filter Conditions Setting (Scheme C) */}
      {step === 'filter' && (
        <div className="bg-white border-2 border-[#E2E8E5] rounded-3xl p-5 sm:p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-extrabold text-[#2B2B2B]">你的下廚條件是？</h2>
            <p className="text-sm text-[#666666] mt-1 font-medium">
              依照現有 <span className="font-bold text-[#2E9E6A]">{validOkIngredients.length}</span> 項正常庫存食材推薦
              {pendingCount > 0 && (
                <span className="text-[#E8833A] ml-1.5">（⚠️ {pendingCount} 項待確認食材已自動略過，不計入推薦）</span>
              )}
            </p>
          </div>

          {/* Equipment Options */}
          <div>
            <label className="block text-sm font-bold text-[#666666] uppercase tracking-wider mb-2.5">
              可使用設備（可多選）
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {equipmentOptions.map((eq) => {
                const isSelected = selectedEquipments.includes(eq.id);
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => toggleEquipment(eq.id)}
                    className={`flex items-center gap-3 p-4 min-h-[44px] rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#2E9E6A] bg-[#F1F9F5] shadow-xs'
                        : 'border-[#EAEFEA] bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl shrink-0">{eq.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <b className={`text-base ${isSelected ? 'text-[#1F7A50]' : 'text-[#2B2B2B]'}`}>
                          {eq.name}
                        </b>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          isSelected ? 'bg-[#2E9E6A] text-white' : 'border border-gray-300'
                        }`}>
                          {isSelected && '✓'}
                        </span>
                      </div>
                      <small className="text-sm text-gray-500 block truncate">{eq.desc}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dietary Style (Task 3.1: with no_seafood) */}
          <div>
            <label className="block text-sm font-bold text-[#666666] uppercase tracking-wider mb-2.5">
              飲食風格（單選）
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {dietaryOptions.map((opt) => {
                const isSelected = dietaryStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDietaryStyle(opt.id)}
                    className={`p-3.5 min-h-[44px] rounded-2xl border-2 text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#2E9E6A] bg-[#F1F9F5] shadow-xs'
                        : 'border-[#EAEFEA] bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{opt.emoji}</span>
                    <b className={`text-base block ${isSelected ? 'text-[#1F7A50]' : 'text-[#2B2B2B]'}`}>
                      {opt.label}
                    </b>
                    <span className="text-xs text-gray-500 block mt-0.5">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick 15 min toggle & Servings */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            {/* Quick 15 min */}
            <div className="flex items-center justify-between p-4 bg-[#FAF8F3] rounded-2xl border border-[#EAEFEA]">
              <div>
                <b className="text-base text-[#2B2B2B] flex items-center gap-1.5">
                  ⚡ 極速 15 分鐘出菜
                </b>
                <p className="text-sm text-gray-500 mt-0.5">限制總烹飪時間在 15 分鐘以內</p>
              </div>
              <button
                type="button"
                aria-label="切換極速15分鐘出菜"
                onClick={() => setQuickTimeOnly(!quickTimeOnly)}
                className={`w-14 h-8 rounded-full transition-colors relative cursor-pointer min-h-[32px] ${
                  quickTimeOnly ? 'bg-[#2E9E6A]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-transform shadow-xs ${
                    quickTimeOnly ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Servings */}
            <div className="flex items-center justify-between p-4 bg-[#FAF8F3] rounded-2xl border border-[#EAEFEA]">
              <div>
                <b className="text-base text-[#2B2B2B]">烹飪份量</b>
                <p className="text-sm text-gray-500 mt-0.5">自動等比調配食材用量</p>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setServings(num)}
                    className={`px-4 py-2 min-h-[44px] rounded-xl font-bold text-sm cursor-pointer ${
                      servings === num
                        ? 'bg-[#2E9E6A] text-white shadow-xs'
                        : 'bg-white border text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {num} 人份
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Excluded Ingredients (Task 3.2: Blacklist for Vegetables & Ingredients) */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-sm font-bold text-[#666666] uppercase tracking-wider mb-2">
              🚫 排除食材禁忌（嚴格杜絕於食材與步驟）
            </label>
            <div className="flex gap-2 mb-2.5">
              <input
                type="text"
                value={newExcludedInput}
                onChange={(e) => setNewExcludedInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddExcluded()}
                placeholder="輸入不吃或過敏食材，如：青椒、苦瓜、香菜、洋蔥"
                className="flex-1 px-4 py-3 border-2 border-[#DCE4E0] rounded-xl text-base focus:border-[#2E9E6A] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddExcluded}
                className="px-5 py-3 min-h-[44px] bg-[#FAF8F3] hover:bg-gray-200 text-[#2B2B2B] border border-gray-300 rounded-xl font-bold text-sm cursor-pointer"
              >
                加入排除
              </button>
            </div>

            {/* Excluded chips */}
            <div className="flex flex-wrap gap-2">
              {excludedList.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 text-red-700 text-sm font-semibold rounded-full border border-red-200"
                >
                  <span>不吃 {item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveExcluded(item)}
                    aria-label={`移除不吃 ${item}`}
                    className="hover:text-red-900 cursor-pointer p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              onClick={handleGenerateRecipes}
              className="w-full min-h-[48px] bg-[#2E9E6A] hover:bg-[#258559] active:scale-[0.99] text-white font-extrabold text-base py-4 rounded-2xl shadow-md shadow-[#2E9E6A]/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Sparkles className="w-5 h-5" />
              <span>依目前庫存推薦食譜</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Recommended Recipes List */}
      {step === 'list' && (
        <div className="space-y-4">
          {/* Error & Retry banner */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleGenerateRecipes}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm min-h-[44px] flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
                <span>重試</span>
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-[#E2E8E5] space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#E3F4EC] text-[#2E9E6A] flex items-center justify-center mx-auto animate-bounce">
                <ChefHat className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#2B2B2B]">主廚 AI 正在為你客製推薦食譜…</h3>
                <p className="text-sm text-gray-500 mt-1">
                  比對 {validOkIngredients.length} 項正常庫存 · 嚴格過濾可用設備與排除禁忌
                </p>
              </div>
              <div className="max-w-xs mx-auto space-y-2 pt-2">
                <div className="h-4 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-4/5 mx-auto" />
              </div>
            </div>
          ) : recipes.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-[#E2E8E5] space-y-3">
              <AlertTriangle className="w-10 h-10 text-[#E8833A] mx-auto" />
              <h3 className="text-lg font-bold text-[#2B2B2B]">未找到符合條件的食譜</h3>
              <p className="text-sm text-gray-500">建議放寬時間限制、新增更多設備，或補充冰箱庫存食材。</p>
              <button
                onClick={() => setStep('filter')}
                className="px-6 py-3 min-h-[44px] bg-[#2E9E6A] text-white font-bold text-sm rounded-xl shadow-xs"
              >
                調整搜尋條件
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-bold text-[#666666]">
                  為你精選 {recipes.length} 道嚴格合規料理
                </span>
                <button
                  onClick={() => setStep('filter')}
                  className="text-sm font-bold text-[#2E9E6A] hover:underline flex items-center gap-1 cursor-pointer min-h-[44px]"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>調整條件</span>
                </button>
              </div>

              {recipes.map((recipe, index) => {
                const ownedCount = recipe.ingredients.filter((i) => i.isOwned).length;
                const totalIngCount = recipe.ingredients.length;

                return (
                  <div
                    key={recipe.id}
                    className="bg-white border-2 border-[#E2E8E5] hover:border-[#2E9E6A] rounded-3xl p-5 shadow-xs transition-all space-y-3.5"
                  >
                    {/* Header: Title & Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          {recipe.tags.map((t) => (
                            <span
                              key={t}
                              className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E3F4EC] text-[#1F7A50]"
                            >
                              {t}
                            </span>
                          ))}
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FAF8F3] text-gray-600 border border-gray-200">
                            {recipe.difficulty}
                          </span>
                        </div>
                        <h3 className="text-xl font-extrabold text-[#2B2B2B] tracking-tight">
                          {recipe.title}
                        </h3>
                      </div>

                      {/* Equipment Badges */}
                      <div className="flex gap-1 shrink-0">
                        {recipe.equipment.map((eq) => (
                          <span
                            key={eq}
                            className="text-sm bg-[#FAF8F3] border border-gray-200 px-3 py-1.5 rounded-xl font-bold text-[#2B2B2B] flex items-center gap-1"
                          >
                            <span>{eq === '電鍋' ? '🍲' : eq === '微波爐' ? '📡' : eq === '氣炸鍋' ? '🍟' : '🔥'}</span>
                            <span className="hidden sm:inline">{eq}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-[#555] leading-relaxed">{recipe.description}</p>

                    {/* Stats bar */}
                    <div className="flex items-center gap-4 text-sm font-semibold text-[#666] bg-[#FAF8F3] p-3 rounded-xl border border-[#EAEFEA]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-[#2E9E6A]" />
                        <span>約 {recipe.cookingTimeMinutes} 分鐘</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>🔥 {recipe.caloriesEstimate} 大卡</span>
                      </div>
                      <div className="flex items-center gap-1 text-[#1F7A50]">
                        <span>💪 蛋白質 {recipe.proteinGrams}g</span>
                      </div>
                    </div>

                    {/* Ingredients summary chips */}
                    <div>
                      <div className="text-xs font-bold text-gray-500 mb-1.5">
                        所需食材 (冰箱符合 {ownedCount}/{totalIngCount})：
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recipe.ingredients.map((ing, i) => (
                          <span
                            key={i}
                            className={`text-sm px-3 py-1.5 rounded-full flex items-center gap-1 ${
                              ing.isOwned
                                ? 'bg-[#E3F4EC] text-[#1F7A50] font-bold border border-[#BFE0CF]'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            <span>{getFoodEmoji(ing.name)}</span>
                            <span>{ing.name}</span>
                            <span className="text-xs opacity-75">{ing.amount}</span>
                            {ing.isOwned && <span className="text-xs font-bold">✓</span>}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setActiveRecipeIndex(index);
                          setIsSwapModalOpen(true);
                        }}
                        className="px-4 py-3 min-h-[44px] bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>換一道</span>
                      </button>

                      <button
                        onClick={() => handleOpenDetail(index)}
                        className="flex-1 py-3 px-5 min-h-[44px] bg-[#2E9E6A] hover:bg-[#258559] text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
                      >
                        <span>開始烹飪此道</span>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Kitchen Mode Cooking Detail (Big Font & Step-by-Step) */}
      {step === 'detail' && currentRecipe && (
        <div className="space-y-4">
          {/* Top Recipe Card */}
          <div className="bg-white border-2 border-[#E2E8E5] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {currentRecipe.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E3F4EC] text-[#1F7A50]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <h2 className="text-2xl font-extrabold text-[#2B2B2B]">{currentRecipe.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{currentRecipe.description}</p>
              </div>

              {/* Undo swap if history exists (Task 4.2) */}
              {historyRecipes[currentRecipe.id] && historyRecipes[currentRecipe.id].length > 0 && (
                <button
                  onClick={() => handleUndoSwap(currentRecipe.id)}
                  className="px-3.5 py-2 text-sm font-bold text-[#E8833A] bg-[#FFF1E6] rounded-xl border border-[#F2B98A] cursor-pointer hover:bg-[#ffe5d1] min-h-[44px]"
                >
                  復原上一道
                </button>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center bg-[#FAF8F3] p-3 rounded-2xl border border-[#EAEFEA]">
              <div>
                <span className="text-xs text-gray-500 block">預估時間</span>
                <b className="text-base text-[#2E9E6A]">{currentRecipe.cookingTimeMinutes} 分鐘</b>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">熱量</span>
                <b className="text-base text-[#2B2B2B]">{currentRecipe.caloriesEstimate} kcal</b>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">蛋白質</span>
                <b className="text-base text-[#1F7A50]">{currentRecipe.proteinGrams} g</b>
              </div>
            </div>

            {/* Ingredients Checklist with "Must Keep" option */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-[#2B2B2B] flex items-center gap-1.5">
                  <span>食材準備與必留設定</span>
                  <span className="text-xs text-gray-400 font-normal">(🌟 標記換菜必留食材)</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentRecipe.ingredients.map((ing, i) => {
                  const isChecked = !!checkedIngredients[ing.name];
                  const isKept = !!mustKeepIngredients[ing.name];

                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all min-h-[44px] ${
                        isChecked ? 'bg-[#F1F9F5] border-[#BFE0CF]' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div
                        onClick={() =>
                          setCheckedIngredients((prev) => ({ ...prev, [ing.name]: !isChecked }))
                        }
                        className="flex items-center gap-2 cursor-pointer flex-1"
                      >
                        <span className="text-xl">{getFoodEmoji(ing.name)}</span>
                        <div>
                          <b className="text-base text-[#2B2B2B] block">{ing.name}</b>
                          <span className="text-sm text-gray-500">{ing.amount}</span>
                        </div>
                      </div>

                      {/* Must-keep Star button for dynamic swapping */}
                      <button
                        type="button"
                        onClick={() =>
                          setMustKeepIngredients((prev) => ({ ...prev, [ing.name]: !isKept }))
                        }
                        title={isKept ? '已設為換菜必留食材' : '點擊設為換菜必留食材'}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 cursor-pointer transition-colors min-h-[40px] ${
                          isKept
                            ? 'bg-[#E8833A] text-white shadow-xs'
                            : 'bg-white border text-gray-400 hover:text-gray-700'
                        }`}
                      >
                        <span>🌟 必留</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Seasonings list */}
              {currentRecipe.seasonings && currentRecipe.seasonings.length > 0 && (
                <div className="mt-3 p-3 bg-[#FAF8F3] rounded-xl border border-gray-200 text-sm">
                  <span className="font-bold text-gray-700 block mb-1">常備調味料：</span>
                  <span className="text-gray-600">{currentRecipe.seasonings.join('、')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Kitchen Big Font Steps Mode (Kitchen-friendly ≥ 18px text) */}
          <div className="bg-white border-2 border-[#E2E8E5] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#2B2B2B]">烹飪分步動作</h3>
                <p className="text-sm text-gray-500">大字體友善廚房操作 · 支援語音朗讀</p>
              </div>
              <button
                onClick={() => {
                  const currentText = currentRecipe.steps[currentCookingStep - 1]?.instruction;
                  if (currentText) speakStep(currentText);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  isSpeaking
                    ? 'bg-[#E8833A] text-white'
                    : 'bg-[#F1F7F4] text-[#2E9E6A] border border-[#BFE0CF] hover:bg-[#E3EFE8]'
                }`}
              >
                {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                <span>{isSpeaking ? '停止語音' : '朗讀步驟'}</span>
              </button>
            </div>

            {/* Steps list */}
            <div className="space-y-3">
              {currentRecipe.steps.map((stepItem) => {
                const isCompleted = !!completedSteps[stepItem.stepNumber];
                const isCurrent = currentCookingStep === stepItem.stepNumber;

                return (
                  <div
                    key={stepItem.stepNumber}
                    onClick={() => setCurrentCookingStep(stepItem.stepNumber)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      isCompleted
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : isCurrent
                        ? 'bg-[#F1F9F5] border-[#2E9E6A] shadow-sm ring-1 ring-[#2E9E6A]'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        aria-label={`標記第 ${stepItem.stepNumber} 步完成`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCompletedSteps((prev) => ({
                            ...prev,
                            [stepItem.stepNumber]: !isCompleted,
                          }));
                        }}
                        className="mt-0.5 cursor-pointer text-gray-400 hover:text-[#2E9E6A] min-w-[36px] min-h-[36px] flex items-center justify-center"
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6 text-[#2E9E6A] fill-[#2E9E6A] text-white" />
                        ) : (
                          <Circle className="w-6 h-6" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#2E9E6A] text-white">
                            第 {stepItem.stepNumber} 步
                          </span>
                          {stepItem.timerMinutes && stepItem.timerMinutes > 0 && (
                            <span className="text-xs font-bold text-[#E8833A] bg-[#FFF1E6] px-2 py-0.5 rounded-full border border-[#F2B98A] flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>需計時 {stepItem.timerMinutes} 分鐘</span>
                            </span>
                          )}
                        </div>

                        {/* Kitchen Reading Font (Large ≥ 18px) */}
                        <p className={`text-lg font-bold leading-relaxed text-[#2B2B2B] ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                          {stepItem.instruction}
                        </p>

                        {stepItem.tip && (
                          <p className="text-sm text-[#2E9E6A] font-semibold mt-1.5 flex items-center gap-1">
                            <span>💡 小撇步：</span>
                            <span>{stepItem.tip}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chef tips */}
            {currentRecipe.tips && (
              <div className="p-4 bg-[#FAF8F3] rounded-2xl border border-amber-200 text-sm text-amber-900 flex items-start gap-2">
                <ChefHat className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <b>主廚提味叮嚀：</b> {currentRecipe.tips}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Kitchen Action Bar */}
          <div className="sticky bottom-20 z-20 bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-[#E2E8E5] shadow-xl flex items-center gap-3">
            <button
              onClick={() => setIsSwapModalOpen(true)}
              className="px-5 py-3.5 min-h-[48px] bg-white border-2 border-gray-300 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 text-base flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>換一道菜</span>
            </button>

            <button
              onClick={() => onCookCompleted(currentRecipe, servings)}
              className="flex-1 py-3.5 px-4 min-h-[48px] bg-[#2E9E6A] hover:bg-[#258559] active:scale-[0.99] text-white rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 shadow-md shadow-[#2E9E6A]/20 cursor-pointer transition-all"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>🍳 煮完了！確認扣庫存</span>
            </button>
          </div>
        </div>
      )}

      {/* DYNAMIC SWAP RECIPE MODAL (Task 4.1 & 4.2) */}
      {isSwapModalOpen && currentRecipe && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-xl font-bold text-[#2B2B2B]">換一道菜：告知主廚原因</h3>
                <p className="text-sm text-gray-500">將針對原因重新生成，並保證保留你勾選的必留食材</p>
              </div>
              <button
                onClick={() => setIsSwapModalOpen(false)}
                aria-label="關閉換菜面板"
                className="p-2 text-gray-400 hover:text-gray-700 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {swapErrorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{swapErrorMessage}</span>
              </div>
            )}

            {/* Swap Reasons Pills */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">換菜主要原因：</label>
              <div className="grid grid-cols-2 gap-2">
                {['不喜歡這個口味', '不想開火／想純蒸或微波', '太油膩／想更清爽', '步驟太麻煩／想要3步內', '想多消耗特定食材'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSwapReason(r);
                      setCustomSwapReason('');
                    }}
                    className={`p-3 min-h-[44px] rounded-xl border text-sm font-bold text-center cursor-pointer transition-all ${
                      swapReason === r && !customSwapReason
                        ? 'border-[#2E9E6A] bg-[#F1F9F5] text-[#1F7A50]'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Custom Reason */}
              <input
                type="text"
                value={customSwapReason}
                onChange={(e) => setCustomSwapReason(e.target.value)}
                placeholder="或自填其他換菜理由（例如：家裡剛好沒醬油了）"
                className="w-full mt-2.5 px-3 py-2.5 border rounded-xl text-sm focus:border-[#2E9E6A] focus:outline-none"
              />
            </div>

            {/* Kept Ingredients Display (Task 4.1) */}
            <div className="bg-[#FAF8F3] p-3.5 rounded-2xl border border-gray-200">
              <span className="text-sm font-bold text-gray-700 block mb-1">
                🌟 本次換菜將保留食材（100% 傳遞給新食譜）：
              </span>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.keys(mustKeepIngredients).filter((k) => mustKeepIngredients[k]).length === 0 ? (
                  <span className="text-sm text-gray-400 italic">尚未勾選必留食材（由主廚自由發揮）</span>
                ) : (
                  Object.keys(mustKeepIngredients)
                    .filter((k) => mustKeepIngredients[k])
                    .map((name) => (
                      <span
                        key={name}
                        className="text-sm font-bold px-3 py-1 rounded-full bg-[#E3F4EC] text-[#1F7A50] border border-[#BFE0CF]"
                      >
                        {getFoodEmoji(name)} {name}
                      </span>
                    ))
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSwapModalOpen(false)}
                className="flex-1 py-3.5 min-h-[44px] border rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                取消
              </button>

              <button
                type="button"
                onClick={handleConfirmSwap}
                disabled={isSwapping}
                className="flex-2 py-3.5 min-h-[44px] bg-[#2E9E6A] hover:bg-[#258559] text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSwapping ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>主廚重出新菜中…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>立即生成新食譜</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
