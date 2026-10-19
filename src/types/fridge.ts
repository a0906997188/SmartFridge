export type IngredientLocation = 
  | 'shelf_top'     // 冷藏上層
  | 'shelf_mid'     // 冷藏中層
  | 'shelf_bottom'  // 冷藏下層（肉類）
  | 'door'          // 門邊/醬料蛋架
  | 'freezer'       // 冷凍庫
  | 'pantry';       // 常溫

export type IngredientStatus = 'ok' | 'wait' | 'depleted';

export type IngredientCategory = 
  | 'dairy_egg'    // 蛋奶類
  | 'meat'         // 肉類
  | 'veg'          // 蔬菜
  | 'tofu_beans'   // 豆腐豆類
  | 'seafood'      // 海鮮
  | 'fruit'        // 水果
  | 'condiment'    // 調味醬料
  | 'other';       // 其他

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  location: IngredientLocation;
  status: IngredientStatus;
  confidence?: number;
  bbox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  freshnessTip?: string;
  expiryDays?: number; // 建立時預估還能放幾天
  expiresAt?: string; // 到期日 (ISO)，由 expiryDays 換算，每天自動倒數
  addedAt: string;
  source: 'photo' | 'manual';
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  isOwned: boolean;
  matchedIngredientName?: string;
  isMustKeep?: boolean; // 換菜必留勾選
}

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
  timerMinutes?: number;
  tip?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cookingTimeMinutes: number;
  difficulty: '超簡單' | '簡易' | '中等';
  equipment: ('電鍋' | '氣炸鍋' | '微波爐' | '單口瓦斯爐')[];
  tags: string[];
  caloriesEstimate: number;
  proteinGrams: number;
  ingredients: RecipeIngredient[];
  seasonings: string[];
  steps: RecipeStep[];
  tips?: string;
}

export type KitchenEquipment = '電鍋' | '氣炸鍋' | '微波爐' | '單口瓦斯爐';

export type DietaryStyle = 'none' | 'high_protein' | 'low_carb' | 'vegetarian' | 'no_seafood';

export interface UserPreferences {
  equipments: KitchenEquipment[];
  dietaryStyle: DietaryStyle;
  quickTimeOnly: boolean;
  excludedIngredients: string[];
  servings: number;
}

export interface StockDeductionItem {
  ingredientId: string;
  ingredientName: string;
  prevQuantity: number;
  usedQuantity: number;
  unit: string;
  newQuantity: number;
  wasDepleted: boolean;
}

export interface CookingHistoryLog {
  id: string;
  timestamp: string;
  recipeTitle: string;
  servings: number;
  deductions: StockDeductionItem[];
  reverted?: boolean;
}
