import { Ingredient, UserPreferences } from '../types/fridge';

export const INITIAL_PREFERENCES: UserPreferences = {
  equipments: ['電鍋', '微波爐'],
  dietaryStyle: 'none',
  quickTimeOnly: false,
  excludedIngredients: ['香菜'],
  servings: 1,
};

export const INITIAL_INGREDIENTS: Ingredient[] = [
  {
    id: 'ing-1',
    name: '雞蛋',
    quantity: 4,
    unit: '顆',
    category: 'dairy_egg',
    location: 'shelf_top',
    status: 'ok',
    confidence: 0.98,
    freshnessTip: '蛋殼完好，冷藏保存優良',
    expiryDays: 14,
    addedAt: '今天 08:30',
    source: 'photo',
    bbox: [160, 140, 360, 420],
  },
  {
    id: 'ing-2',
    name: '牛奶',
    quantity: 1,
    unit: '半瓶',
    category: 'dairy_egg',
    location: 'shelf_top',
    status: 'ok',
    confidence: 0.95,
    freshnessTip: '已開封，建議 3 天內飲用完畢',
    expiryDays: 3,
    addedAt: '今天 08:30',
    source: 'photo',
    bbox: [140, 520, 420, 800],
  },
  {
    id: 'ing-3',
    name: '高麗菜',
    quantity: 0.5,
    unit: '半顆',
    category: 'veg',
    location: 'shelf_mid',
    status: 'ok',
    confidence: 0.92,
    freshnessTip: '葉片爽脆，切口平整',
    expiryDays: 7,
    addedAt: '今天 08:30',
    source: 'photo',
    bbox: [440, 90, 670, 450],
  },
  {
    id: 'ing-4',
    name: '香菇',
    quantity: 6,
    unit: '朵',
    category: 'veg',
    location: 'shelf_mid',
    status: 'wait',
    confidence: 0.69,
    freshnessTip: '照片局部陰影，請確認數量與傘褶乾爽度',
    expiryDays: 4,
    addedAt: '今天 08:30',
    source: 'photo',
    bbox: [460, 500, 680, 800],
  },
  {
    id: 'ing-5',
    name: '雞胸肉',
    quantity: 300,
    unit: 'g',
    category: 'meat',
    location: 'shelf_bottom',
    status: 'wait',
    confidence: 0.65,
    freshnessTip: '保鮮盒內肉品，請確認份量約 300g 或一盒',
    expiryDays: 2,
    addedAt: '今天 08:30',
    source: 'photo',
    bbox: [720, 120, 920, 500],
  },
  {
    id: 'ing-6',
    name: '板豆腐',
    quantity: 1,
    unit: '塊',
    category: 'tofu_beans',
    location: 'pantry',
    status: 'ok',
    confidence: 0.96,
    freshnessTip: '未開封真空盒裝，非基因改造黃豆製成',
    expiryDays: 5,
    addedAt: '今天 08:30',
    source: 'photo',
    bbox: [720, 560, 920, 860],
  },
];

// Helper to get food emoji
export function getFoodEmoji(name: string, category?: string): string {
  const n = name.toLowerCase();
  if (n.includes('蛋')) return '🥚';
  if (n.includes('奶')) return '🥛';
  if (n.includes('高麗菜') || n.includes('白菜') || n.includes('菜')) return '🥬';
  if (n.includes('菇')) return '🍄';
  if (n.includes('雞') || n.includes('肉')) return '🍗';
  if (n.includes('牛')) return '🥩';
  if (n.includes('豬')) return '🥓';
  if (n.includes('魚') || n.includes('鮭') || n.includes('鱸')) return '🐟';
  if (n.includes('蝦')) return '🦐';
  if (n.includes('豆腐') || n.includes('豆干')) return '🧈';
  if (n.includes('番茄') || n.includes('西紅柿')) return '🍅';
  if (n.includes('蔥') || n.includes('蒜') || n.includes('薑')) return '🧄';
  if (n.includes('洋蔥')) return '🧅';
  if (n.includes('胡蘿蔔') || n.includes('紅蘿蔔')) return '🥕';
  if (n.includes('馬鈴薯') || n.includes('土豆')) return '🥔';
  if (n.includes('玉米')) return '🌽';
  if (n.includes('蘋果')) return '🍎';
  if (n.includes('醬油') || n.includes('油') || n.includes('醋')) return '🧂';
  if (n.includes('起司') || n.includes('芝士')) return '🧀';
  
  if (category === 'meat') return '🥩';
  if (category === 'veg') return '🥦';
  if (category === 'dairy_egg') return '🥚';
  if (category === 'tofu_beans') return '🧈';
  if (category === 'seafood') return '🦐';
  return '🥗';
}

export function getLocationLabel(location: string): string {
  switch (location) {
    case 'shelf_top': return '冷藏上層';
    case 'shelf_mid': return '冷藏中層';
    case 'shelf_bottom': return '冷藏下層（肉類）';
    case 'door': return '冰箱門邊';
    case 'freezer': return '冷凍庫';
    case 'pantry': return '常溫區';
    default: return '冷藏層';
  }
}

// Sample fridge demo image (clean SVG data URL representing a real kitchen fridge layout)
export const DEMO_FRIDGE_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="%23f4f8f5"/>
      <stop offset="100%" stop-color="%23e3ede7"/>
    </linearGradient>
    <linearGradient id="shelf" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="%23ffffff"/>
      <stop offset="100%" stop-color="%23dce8e0"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(%23bg)"/>
  
  <!-- Refrigerator interior walls -->
  <rect x="40" y="40" width="720" height="720" rx="30" fill="%23ffffff" stroke="%23b8cec2" stroke-width="8"/>
  
  <!-- Shelf 1 (Top) -->
  <rect x="60" y="270" width="680" height="18" rx="6" fill="url(%23shelf)" stroke="%23a4c2b0" stroke-width="2"/>
  <!-- Top Shelf Items: Eggs (left), Milk (right) -->
  <g transform="translate(140, 130)">
    <rect width="180" height="120" rx="14" fill="%23FFFBEA" stroke="%23E4D1A0" stroke-width="4"/>
    <text x="90" y="70" font-size="44" text-anchor="middle">🥚🥚</text>
    <text x="90" y="105" font-size="16" font-family="sans-serif" font-weight="bold" fill="%237A5C1E" text-anchor="middle">新鮮雞蛋 4 顆</text>
  </g>
  <g transform="translate(480, 110)">
    <rect width="140" height="150" rx="12" fill="%23EFF8FF" stroke="%23B9D9EB" stroke-width="4"/>
    <text x="70" y="80" font-size="52" text-anchor="middle">🥛</text>
    <text x="70" y="125" font-size="16" font-family="sans-serif" font-weight="bold" fill="%231E5B7A" text-anchor="middle">全脂牛奶 半瓶</text>
  </g>

  <!-- Shelf 2 (Mid) -->
  <rect x="60" y="490" width="680" height="18" rx="6" fill="url(%23shelf)" stroke="%23a4c2b0" stroke-width="2"/>
  <!-- Mid Shelf Items: Cabbage (left), Mushrooms (right) -->
  <g transform="translate(130, 320)">
    <circle cx="100" cy="80" r="70" fill="%23EBF8EE" stroke="%23A1DDB0" stroke-width="4"/>
    <text x="100" y="95" font-size="64" text-anchor="middle">🥬</text>
    <text x="100" y="165" font-size="16" font-family="sans-serif" font-weight="bold" fill="%231F6B38" text-anchor="middle">高麗菜 半顆</text>
  </g>
  <g transform="translate(480, 330)">
    <rect width="170" height="130" rx="14" fill="%23FFF6EB" stroke="%23F3CEAC" stroke-width="4"/>
    <text x="85" y="80" font-size="52" text-anchor="middle">🍄🍄</text>
    <text x="85" y="115" font-size="15" font-family="sans-serif" font-weight="bold" fill="%238C5320" text-anchor="middle">生鮮香菇 6 朵 (待確認)</text>
  </g>

  <!-- Shelf 3 (Bottom) -->
  <rect x="60" y="690" width="680" height="18" rx="6" fill="url(%23shelf)" stroke="%23a4c2b0" stroke-width="2"/>
  <!-- Bottom Shelf: Chicken Breast & Tofu -->
  <g transform="translate(130, 530)">
    <rect width="190" height="140" rx="14" fill="%23FFF1F1" stroke="%23F7B7B7" stroke-width="4"/>
    <text x="95" y="80" font-size="52" text-anchor="middle">🍗🥩</text>
    <text x="95" y="125" font-size="16" font-family="sans-serif" font-weight="bold" fill="%239E2E2E" text-anchor="middle">雞胸肉 300g (待確認)</text>
  </g>
  <g transform="translate(480, 540)">
    <rect width="160" height="130" rx="14" fill="%23F8F9FA" stroke="%23D0D8D4" stroke-width="4"/>
    <text x="80" y="75" font-size="52" text-anchor="middle">🧈</text>
    <text x="80" y="115" font-size="16" font-family="sans-serif" font-weight="bold" fill="%234A5550" text-anchor="middle">傳統板豆腐 1 塊</text>
  </g>
  
  <text x="400" y="750" font-size="16" font-family="sans-serif" fill="%23678074" text-anchor="middle">FridgeChef 冰箱智慧視覺辨識示範相片</text>
</svg>`;
