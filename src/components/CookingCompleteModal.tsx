import React, { useState } from 'react';
import { X, Check, ArrowRight, Sparkles, ChefHat, AlertCircle, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Recipe, Ingredient, StockDeductionItem } from '../types/fridge';
import { getFoodEmoji } from '../data/initialData';

interface CookingCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  servings: number;
  ingredients: Ingredient[];
  onConfirmDeduction: (deductions: StockDeductionItem[], recipeTitle: string, servings: number) => void;
}

export const CookingCompleteModal: React.FC<CookingCompleteModalProps> = ({
  isOpen,
  onClose,
  recipe,
  servings,
  ingredients,
  onConfirmDeduction,
}) => {
  if (!isOpen || !recipe) return null;

  // Build initial deductions mapping each recipe ingredient to matching fridge stock
  const [deductions, setDeductions] = useState<StockDeductionItem[]>(() => {
    return recipe.ingredients
      .map((item) => {
        // Find in fridge by exact match or substring
        const found = ingredients.find(
          (ing) =>
            ing.status !== 'depleted' &&
            (ing.name === item.name ||
              item.name.includes(ing.name) ||
              ing.name.includes(item.name))
        );

        if (!found) return null;

        // Parse numerical deduction from amount text, e.g. "2 顆", "200g", "半顆"
        let used = 1;
        if (item.amount.includes('半') || item.amount.includes('0.5')) {
          used = 0.5;
        } else {
          const match = item.amount.match(/\d+(\.\d+)?/);
          if (match) {
            used = parseFloat(match[0]);
          }
        }

        // Adjust for servings
        if (servings > 1 && !item.amount.includes('半')) {
          used = Math.min(found.quantity, used * servings);
        }

        // Ensure used does not exceed stock, and remaining is never negative
        const actualUsed = Math.min(found.quantity, used);
        const newQty = Math.max(0, +(found.quantity - actualUsed).toFixed(1));

        return {
          ingredientId: found.id,
          ingredientName: found.name,
          prevQuantity: found.quantity,
          usedQuantity: actualUsed,
          unit: found.unit,
          newQuantity: newQty,
          wasDepleted: newQty <= 0,
        };
      })
      .filter(Boolean) as StockDeductionItem[];
  });

  const handleAdjustUsed = (id: string, delta: number) => {
    setDeductions((prev) =>
      prev.map((item) => {
        if (item.ingredientId !== id) return item;
        const target = ingredients.find((i) => i.id === id);
        const maxStock = target ? target.quantity : item.prevQuantity;
        const newUsed = Math.max(0, Math.min(maxStock, +(item.usedQuantity + delta).toFixed(1)));
        const newQty = Math.max(0, +(maxStock - newUsed).toFixed(1));
        return {
          ...item,
          usedQuantity: newUsed,
          newQuantity: newQty,
          wasDepleted: newQty <= 0,
        };
      })
    );
  };

  const handleConfirm = () => {
    // Launch festive confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#2E9E6A', '#42C085', '#E8833A', '#FAF8F3'],
      });
    } catch (e) {
      // ignore
    }

    onConfirmDeduction(deductions, recipe.title, servings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
      <div 
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEFEA] bg-[#FAF8F3]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E3F4EC] text-[#1F7A50] flex items-center justify-center min-w-[40px] min-h-[40px]">
              <ChefHat className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#2B2B2B]">
                大功告成！確認扣除食材庫存
              </h2>
              <p className="text-sm text-[#666666]">
                料理：{recipe.title} ({servings} 人份)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="關閉扣庫存確認"
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="bg-[#FAF8F3] border border-[#EAEFEA] rounded-2xl p-3.5 text-sm text-[#555] flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-[#2E9E6A] shrink-0 mt-0.5" />
            <span>
              系統自動比對並試算本次消耗食材。您可以微調實際用量，確認後將自動更新冰箱庫存，剩餘為 0 之食材將自動移至「已用完」。
            </span>
          </div>

          {deductions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-base">
              此食譜未匹配到任何庫存食材，無需扣除庫存。
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[#666] tracking-wide">
                預估消耗食材明細 ({deductions.length} 項)
              </h4>

              {deductions.map((item) => (
                <div
                  key={item.ingredientId}
                  className="bg-white border-2 border-[#E2E8E5] rounded-2xl p-4 space-y-2.5 hover:border-[#2E9E6A]/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{getFoodEmoji(item.ingredientName)}</span>
                      <b className="text-base text-[#2B2B2B]">{item.ingredientName}</b>
                    </div>

                    {/* Quantity preview: 4 -> 2 */}
                    <div className="flex items-center gap-2 text-base font-bold">
                      <span className="text-gray-400 line-through">
                        {item.prevQuantity}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className={item.wasDepleted ? 'text-red-500 font-extrabold' : 'text-[#2E9E6A]'}>
                        {item.newQuantity} {item.unit}
                      </span>
                      {item.wasDepleted && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold ml-1">
                          已用完
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fine tune used amount */}
                  <div className="flex items-center justify-between text-sm bg-[#F9FBF9] p-3 rounded-xl">
                    <span className="text-gray-600 font-medium">
                      本次扣除用量：
                      <strong className="text-[#2B2B2B] ml-1 text-base">
                        {item.usedQuantity} {item.unit}
                      </strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`減少 ${item.ingredientName} 扣除用量`}
                        onClick={() => handleAdjustUsed(item.ingredientId, item.unit.includes('g') ? -50 : -0.5)}
                        className="w-11 h-11 rounded-xl bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center cursor-pointer min-w-[44px] min-h-[44px]"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        aria-label={`增加 ${item.ingredientName} 扣除用量`}
                        onClick={() => handleAdjustUsed(item.ingredientId, item.unit.includes('g') ? 50 : 0.5)}
                        className="w-11 h-11 rounded-xl bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center cursor-pointer min-w-[44px] min-h-[44px]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-[#EAEFEA] bg-[#FAF8F3] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-3 min-h-[44px] border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-100 text-base cursor-pointer"
          >
            取消
          </button>

          <button
            onClick={handleConfirm}
            className="flex-1 py-3.5 px-6 min-h-[44px] bg-[#2E9E6A] hover:bg-[#258257] active:scale-[0.99] text-white rounded-xl font-extrabold text-base flex items-center justify-center gap-2 shadow-md shadow-[#2E9E6A]/20 cursor-pointer transition-all"
          >
            <Check className="w-5 h-5 stroke-[2.4]" />
            <span>確認扣除並更新庫存</span>
          </button>
        </div>
      </div>
    </div>
  );
};
