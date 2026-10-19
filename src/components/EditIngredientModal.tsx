import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Sparkles, MapPin, Tag } from 'lucide-react';
import { Ingredient, IngredientLocation, IngredientStatus, IngredientCategory } from '../types/fridge';
import { getFoodEmoji, getLocationLabel } from '../data/initialData';

interface EditIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient: Partial<Ingredient> | null;
  onSave: (ingredient: Ingredient) => void;
  onDelete?: (id: string) => void;
}

export const EditIngredientModal: React.FC<EditIngredientModalProps> = ({
  isOpen,
  onClose,
  ingredient,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState('個');
  const [category, setCategory] = useState<IngredientCategory>('veg');
  const [location, setLocation] = useState<IngredientLocation>('shelf_mid');
  const [status, setStatus] = useState<IngredientStatus>('ok');
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [freshnessTip, setFreshnessTip] = useState('');

  useEffect(() => {
    if (ingredient) {
      setName(ingredient.name || '');
      setQuantity(ingredient.quantity !== undefined ? ingredient.quantity : 1);
      setUnit(ingredient.unit || '個');
      setCategory(ingredient.category || 'veg');
      setLocation(ingredient.location || 'shelf_mid');
      setStatus(ingredient.status || 'ok');
      setExpiryDays(ingredient.expiryDays || 7);
      setFreshnessTip(ingredient.freshnessTip || '');
    } else {
      setName('');
      setQuantity(1);
      setUnit('個');
      setCategory('veg');
      setLocation('shelf_mid');
      setStatus('ok');
      setExpiryDays(7);
      setFreshnessTip('');
    }
  }, [ingredient, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const savedItem: Ingredient = {
      id: ingredient?.id || `ing-${Date.now()}`,
      name: name.trim(),
      quantity: Number(quantity) || 1,
      unit: unit.trim() || '份',
      category,
      location,
      status,
      confidence: ingredient?.confidence || 1.0,
      bbox: ingredient?.bbox,
      freshnessTip: freshnessTip.trim() || undefined,
      expiryDays: Number(expiryDays) || 7,
      addedAt: ingredient?.addedAt || '剛剛',
      source: ingredient?.source || 'manual',
    };

    onSave(savedItem);
    onClose();
  };

  const commonUnits = ['顆', '半顆', '塊', '瓶', 'g', '朵', '根', '包', '盒', '份'];
  const locations: { id: IngredientLocation; label: string }[] = [
    { id: 'shelf_top', label: '冷藏上層 (蛋/乳製品)' },
    { id: 'shelf_mid', label: '冷藏中層 (常備熟食/蔬菜)' },
    { id: 'shelf_bottom', label: '冷藏下層 (生鮮肉品)' },
    { id: 'door', label: '冰箱門邊 (醬料/飲品)' },
    { id: 'freezer', label: '冷凍庫 (肉排/海鮮)' },
    { id: 'pantry', label: '常溫區 (根莖/未冷藏豆腐)' },
  ];

  const categories: { id: IngredientCategory; label: string; emoji: string }[] = [
    { id: 'veg', label: '蔬菜', emoji: '🥬' },
    { id: 'meat', label: '肉品', emoji: '🍗' },
    { id: 'dairy_egg', label: '蛋奶', emoji: '🥚' },
    { id: 'tofu_beans', label: '豆腐豆類', emoji: '🧈' },
    { id: 'seafood', label: '海鮮', emoji: '🦐' },
    { id: 'fruit', label: '水果', emoji: '🍎' },
    { id: 'condiment', label: '調味料', emoji: '🧂' },
    { id: 'other', label: '其他', emoji: '📦' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div 
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEFEA]">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getFoodEmoji(name, category)}</span>
            <h2 className="text-lg font-bold text-[#2B2B2B]">
              {ingredient?.id ? '編輯食材庫存' : '手動新增食材'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="關閉食材編輯面板"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-[#2B2B2B] mb-1.5">
              食材名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：雞蛋、高麗菜、香菇、五花肉"
              className="w-full px-4 py-3 text-base border-2 border-[#DCE4E0] rounded-xl focus:border-[#2E9E6A] focus:outline-none transition-colors"
            />
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-[#2B2B2B] mb-1.5">
                數量
              </label>
              <div className="flex items-center border-2 border-[#DCE4E0] rounded-xl overflow-hidden focus-within:border-[#2E9E6A]">
                <button
                  type="button"
                  aria-label="減少數量"
                  onClick={() => setQuantity((q) => Math.max(0.1, +(q - (q <= 1 ? 0.5 : 1)).toFixed(1)))}
                  className="px-3 py-3 min-h-[44px] bg-[#F1F7F4] text-[#2E9E6A] font-bold text-lg hover:bg-[#E3EFE8] cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full text-center py-2 text-base font-bold focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="增加數量"
                  onClick={() => setQuantity((q) => +(q + (q < 1 ? 0.5 : 1)).toFixed(1))}
                  className="px-3 py-3 min-h-[44px] bg-[#F1F7F4] text-[#2E9E6A] font-bold text-lg hover:bg-[#E3EFE8] cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#2B2B2B] mb-1.5">
                單位
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="顆、g、包"
                className="w-full px-4 py-3 text-base border-2 border-[#DCE4E0] rounded-xl focus:border-[#2E9E6A] focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Units */}
          <div className="flex flex-wrap gap-2">
            {commonUnits.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`text-sm px-3.5 py-2 min-h-[36px] rounded-xl border cursor-pointer font-medium ${
                  unit === u
                    ? 'bg-[#2E9E6A] text-white border-[#2E9E6A]'
                    : 'bg-[#F9FBF9] text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-bold text-[#2B2B2B] mb-2">
              分類
            </label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`flex flex-col items-center justify-center p-2.5 min-h-[48px] rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer ${
                    category === c.id
                      ? 'border-[#2E9E6A] bg-[#F1F9F5] text-[#2E9E6A]'
                      : 'border-[#EAEFEA] bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl mb-0.5">{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Storage Location */}
          <div>
            <label className="block text-sm font-bold text-[#2B2B2B] mb-1.5">
              放置位置
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value as IngredientLocation)}
              className="w-full px-4 py-3 text-base border-2 border-[#DCE4E0] rounded-xl focus:border-[#2E9E6A] focus:outline-none bg-white cursor-pointer"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-bold text-[#2B2B2B] mb-1.5">
              庫存狀態
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('ok')}
                className={`py-3 px-3 min-h-[44px] rounded-xl border-2 text-sm font-bold text-center cursor-pointer ${
                  status === 'ok'
                    ? 'border-[#2E9E6A] bg-[#E3F4EC] text-[#1F7A50]'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                ✓ 正常庫存
              </button>
              <button
                type="button"
                onClick={() => setStatus('wait')}
                className={`py-3 px-3 min-h-[44px] rounded-xl border-2 text-sm font-bold text-center cursor-pointer ${
                  status === 'wait'
                    ? 'border-[#E8833A] bg-[#FFF1E6] text-[#9A4D12]'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                ⚠️ 待確認
              </button>
              <button
                type="button"
                onClick={() => setStatus('depleted')}
                className={`py-3 px-3 min-h-[44px] rounded-xl border-2 text-sm font-bold text-center cursor-pointer ${
                  status === 'depleted'
                    ? 'border-gray-400 bg-gray-100 text-gray-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                已用完
              </button>
            </div>
          </div>

          {/* Expiry Days & Tip */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-[#2B2B2B] mb-1.5">
                預估保存天數
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 border-2 border-[#DCE4E0] rounded-xl focus:border-[#2E9E6A] focus:outline-none text-base font-semibold"
                />
                <span className="text-sm text-gray-600 shrink-0">天</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-[#2B2B2B] mb-1.5">
                食材備註 / 狀態
              </label>
              <input
                type="text"
                value={freshnessTip}
                onChange={(e) => setFreshnessTip(e.target.value)}
                placeholder="例如：冷藏切半包覆"
                className="w-full px-4 py-2.5 border-2 border-[#DCE4E0] rounded-xl focus:border-[#2E9E6A] focus:outline-none text-sm"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-[#EAEFEA] bg-[#FAF8F3] flex items-center justify-between gap-3">
          {ingredient?.id && onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`確定要刪除「${name}」嗎？`)) {
                  onDelete(ingredient.id!);
                  onClose();
                }
              }}
              className="p-3 text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-1.5 font-bold text-sm cursor-pointer border border-red-200 min-h-[44px]"
            >
              <Trash2 className="w-4 h-4" />
              <span>刪除</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 min-h-[44px] border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-100 text-sm cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-3 min-h-[44px] bg-[#2E9E6A] text-white rounded-xl font-bold hover:bg-[#258257] shadow-sm text-sm cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>儲存食材</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
