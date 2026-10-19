import React, { useState } from 'react';
import {
  Settings,
  History,
  RotateCcw,
  Trash2,
  Check,
  Plus,
  X,
  Sliders,
  ShieldCheck,
  Sparkles,
  Layers,
  Utensils
} from 'lucide-react';
import {
  UserPreferences,
  CookingHistoryLog,
  KitchenEquipment,
  DietaryStyle,
} from '../types/fridge';
import { getFoodEmoji } from '../data/initialData';

interface SettingsViewProps {
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: UserPreferences) => void;
  cookingLogs: CookingHistoryLog[];
  onRevertLog: (logId: string) => void;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  preferences,
  onUpdatePreferences,
  cookingLogs,
  onRevertLog,
  onResetData,
}) => {
  const [activeTab, setActiveTab] = useState<'preferences' | 'logs'>('preferences');
  const [newExcluded, setNewExcluded] = useState('');

  const equipments: KitchenEquipment[] = ['電鍋', '氣炸鍋', '微波爐', '單口瓦斯爐'];

  const toggleEquipment = (eq: KitchenEquipment) => {
    const prev = preferences.equipments;
    const next = prev.includes(eq)
      ? prev.length > 1 ? prev.filter((e) => e !== eq) : prev
      : [...prev, eq];
    onUpdatePreferences({ ...preferences, equipments: next });
  };

  const handleAddExcluded = () => {
    if (!newExcluded.trim()) return;
    if (!preferences.excludedIngredients.includes(newExcluded.trim())) {
      onUpdatePreferences({
        ...preferences,
        excludedIngredients: [...preferences.excludedIngredients, newExcluded.trim()],
      });
    }
    setNewExcluded('');
  };

  const handleRemoveExcluded = (item: string) => {
    onUpdatePreferences({
      ...preferences,
      excludedIngredients: preferences.excludedIngredients.filter((e) => e !== item),
    });
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8E5] shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#2B2B2B]">偏好與紀錄</h2>
          <p className="text-sm text-[#666666] mt-0.5 font-medium">
            設定個人下廚設備偏好，並管理食材扣除歷史
          </p>
        </div>

        {/* Segmented Control */}
        <div className="flex items-center bg-[#F1F7F4] p-1 rounded-xl border border-[#D5E5DC]">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-3.5 py-2 min-h-[44px] rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'preferences'
                ? 'bg-white text-[#2E9E6A] shadow-xs'
                : 'text-[#666666] hover:text-[#2E9E6A]'
            }`}
          >
            偏好設定
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-2 min-h-[44px] rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-white text-[#2E9E6A] shadow-xs'
                : 'text-[#666666] hover:text-[#2E9E6A]'
            }`}
          >
            <span>扣除紀錄</span>
            {cookingLogs.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#2E9E6A] text-white text-xs font-bold flex items-center justify-center">
                {cookingLogs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Preferences */}
      {activeTab === 'preferences' && (
        <div className="space-y-4">
          {/* Equipments */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-[#E2E8E5] shadow-xs space-y-3">
            <h3 className="text-lg font-bold text-[#2B2B2B] flex items-center gap-2">
              <Utensils className="w-5 h-5 text-[#2E9E6A]" />
              <span>常駐廚房設備</span>
            </h3>
            <p className="text-sm text-gray-500">預設套用於食譜推薦過濾條件</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {equipments.map((eq) => {
                const checked = preferences.equipments.includes(eq);
                return (
                  <button
                    key={eq}
                    onClick={() => toggleEquipment(eq)}
                    className={`p-3.5 min-h-[44px] rounded-2xl border-2 text-left font-bold text-base flex items-center justify-between cursor-pointer transition-all ${
                      checked
                        ? 'border-[#2E9E6A] bg-[#F1F9F5] text-[#1F7A50]'
                        : 'border-[#EAEFEA] bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span>
                      {eq === '電鍋' ? '🍲' : eq === '微波爐' ? '📡' : eq === '氣炸鍋' ? '🍟' : '🔥'} {eq}
                    </span>
                    <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                      checked ? 'bg-[#2E9E6A] text-white' : 'border border-gray-300'
                    }`}>
                      {checked && '✓'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dietary Style (Task 3.1: with no_seafood option) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-[#E2E8E5] shadow-xs space-y-3">
            <h3 className="text-lg font-bold text-[#2B2B2B] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#2E9E6A]" />
              <span>預設飲食風格</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'none', label: '🍽️ 一般均衡' },
                { id: 'high_protein', label: '💪 高蛋白增肌' },
                { id: 'low_carb', label: '🥑 低醣生酮' },
                { id: 'vegetarian', label: '🌱 全素蔬食' },
                { id: 'no_seafood', label: '🚫🐟 海鮮排除' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    onUpdatePreferences({ ...preferences, dietaryStyle: item.id as DietaryStyle })
                  }
                  className={`p-3.5 min-h-[44px] rounded-2xl border-2 font-bold text-sm text-center cursor-pointer transition-all ${
                    preferences.dietaryStyle === item.id
                      ? 'border-[#2E9E6A] bg-[#F1F9F5] text-[#1F7A50]'
                      : 'border-[#EAEFEA] bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Excluded Ingredients (Task 3.2) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-[#E2E8E5] shadow-xs space-y-3">
            <h3 className="text-lg font-bold text-[#2B2B2B]">常用排除食材黑名單</h3>
            <p className="text-sm text-gray-500">這些食材不會出現在任何生成的食譜食材或步驟中</p>

            <div className="flex gap-2">
              <input
                type="text"
                value={newExcluded}
                onChange={(e) => setNewExcluded(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddExcluded()}
                placeholder="例如：香菜、苦瓜、海鮮、青椒"
                className="flex-1 px-4 py-3 text-base border-2 border-[#DCE4E0] rounded-xl focus:border-[#2E9E6A] focus:outline-none"
              />
              <button
                onClick={handleAddExcluded}
                className="px-5 py-3 min-h-[44px] bg-[#2E9E6A] text-white text-sm font-bold rounded-xl cursor-pointer hover:bg-[#258257]"
              >
                新增排除
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {preferences.excludedIngredients.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 text-red-700 text-sm font-semibold rounded-full border border-red-200"
                >
                  <span>不吃 {item}</span>
                  <button
                    onClick={() => handleRemoveExcluded(item)}
                    aria-label={`移除排除食材 ${item}`}
                    className="hover:text-red-900 cursor-pointer p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Data Reset */}
          <div className="bg-[#FAF8F3] rounded-3xl p-5 border border-gray-200 space-y-2">
            <h4 className="text-base font-bold text-[#2B2B2B]">展示與資料管理</h4>
            <p className="text-sm text-gray-500">若想重新測試完整流程，可一鍵重置回預設示範食材與設定。</p>
            <button
              onClick={() => {
                if (window.confirm('確定要還原為預設示範資料嗎？')) {
                  onResetData();
                }
              }}
              className="px-5 py-3 min-h-[44px] bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-sm rounded-xl cursor-pointer"
            >
              還原為預設示範資料
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Cooking & Stock Deduction History (Task 4.5: 保留至少最近 10 筆變動紀錄，可隨時復原) */}
      {activeTab === 'logs' && (
        <div className="space-y-3">
          {cookingLogs.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-[#E2E8E5] space-y-2">
              <History className="w-10 h-10 text-gray-300 mx-auto" />
              <h3 className="text-lg font-bold text-gray-700">尚無扣除紀錄</h3>
              <p className="text-sm text-gray-400">當你在料理詳情頁點選「煮完了！確認扣庫存」時，系統將在此記錄變動，並提供一鍵復原。</p>
            </div>
          ) : (
            cookingLogs.slice(0, 20).map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8E5] shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b pb-2.5">
                  <div>
                    <h4 className="font-bold text-lg text-[#2B2B2B]">{log.recipeTitle}</h4>
                    <span className="text-sm text-gray-400">
                      {log.timestamp} · {log.servings} 人份
                    </span>
                  </div>

                  {log.reverted ? (
                    <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-500 font-semibold">
                      已還原庫存
                    </span>
                  ) : (
                    <button
                      onClick={() => onRevertLog(log.id)}
                      className="px-4 py-2 min-h-[44px] text-sm font-bold text-[#E8833A] bg-[#FFF1E6] rounded-xl border border-[#F2B98A] hover:bg-[#ffe5d1] cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>復原此筆扣除</span>
                    </button>
                  )}
                </div>

                {/* Deductions breakdown */}
                <div className="space-y-2 text-sm">
                  {log.deductions.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-gray-700">
                      <span className="flex items-center gap-2 font-medium">
                        <span className="text-lg">{getFoodEmoji(d.ingredientName)}</span>
                        <span className="font-bold">{d.ingredientName}</span>
                      </span>
                      <span className="font-semibold text-gray-600">
                        扣除 {d.usedQuantity} {d.unit}（原 {d.prevQuantity} → 現 {d.newQuantity}）
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
