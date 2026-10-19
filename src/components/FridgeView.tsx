import React, { useState } from 'react';
import { Camera, Plus, CheckCircle2, AlertCircle, LayoutGrid, ListFilter, Sparkles, AlertTriangle, ChevronRight, Layers } from 'lucide-react';
import { Ingredient, IngredientLocation } from '../types/fridge';
import { getFoodEmoji, getLocationLabel } from '../data/initialData';

interface FridgeViewProps {
  ingredients: Ingredient[];
  onOpenScan: () => void;
  onOpenAdd: () => void;
  onEditIngredient: (item: Ingredient) => void;
  onBatchConfirmPending: () => void;
  onUpdateQuantity: (id: string, delta: number) => void;
}

export const FridgeView: React.FC<FridgeViewProps> = ({
  ingredients,
  onOpenScan,
  onOpenAdd,
  onEditIngredient,
  onBatchConfirmPending,
  onUpdateQuantity,
}) => {
  // Task 5: Toggle between Scheme B (Visual Fridge) and Scheme A (Clean List) - both strictly preserved
  const [viewStyle, setViewStyle] = useState<'visual' | 'list'>('visual');
  const [filterTab, setFilterTab] = useState<'all' | 'ok' | 'wait' | 'depleted'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeIngredients = ingredients.filter((i) => i.status !== 'depleted');
  const pendingIngredients = ingredients.filter((i) => i.status === 'wait');
  const depletedIngredients = ingredients.filter((i) => i.status === 'depleted');

  // Filtered for list view
  const filteredList = ingredients.filter((item) => {
    if (filterTab === 'ok' && item.status !== 'ok') return false;
    if (filterTab === 'wait' && item.status !== 'wait') return false;
    if (filterTab === 'depleted' && item.status !== 'depleted') return false;
    if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group by fridge shelf for Visual Mode (Scheme B)
  const shelves: { id: IngredientLocation; title: string; subtitle: string }[] = [
    { id: 'shelf_top', title: '冷藏上層', subtitle: '乳製品、蛋類、常備料理' },
    { id: 'shelf_mid', title: '冷藏中層', subtitle: '新鮮蔬果、蕈菇、熟食保鮮' },
    { id: 'shelf_bottom', title: '冷藏下層（肉類保鮮）', subtitle: '生鮮肉品、低溫專區' },
    { id: 'door', title: '冰箱門邊', subtitle: '常備醬料、開罐飲料' },
    { id: 'freezer', title: '冷凍庫', subtitle: '冷凍肉品、微波即食' },
    { id: 'pantry', title: '常溫 / 乾貨區', subtitle: '未冷藏豆腐、根莖類、乾貨' },
  ];

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-150">
      {/* Top Summary Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8E5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#2B2B2B] tracking-tight">我的冰箱</h1>
            <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-[#E3F4EC] text-[#1F7A50]">
              盤點完成
            </span>
          </div>
          <p className="text-sm text-[#666666] mt-1 font-medium">
            共 <span className="font-bold text-[#2B2B2B] text-base">{activeIngredients.length}</span> 項庫存食材
            {pendingIngredients.length > 0 && (
              <span className="text-[#E8833A] font-bold ml-1.5">
                · {pendingIngredients.length} 項待確認
              </span>
            )}
          </p>
        </div>

        {/* View Mode Segmented Control */}
        <div className="flex items-center bg-[#F1F7F4] p-1 rounded-xl self-start sm:self-auto border border-[#D5E5DC]">
          <button
            onClick={() => setViewStyle('visual')}
            className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg text-sm font-bold transition-all cursor-pointer ${
              viewStyle === 'visual'
                ? 'bg-white text-[#2E9E6A] shadow-xs'
                : 'text-[#666666] hover:text-[#2E9E6A]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>視覺化冰箱</span>
          </button>
          <button
            onClick={() => setViewStyle('list')}
            className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg text-sm font-bold transition-all cursor-pointer ${
              viewStyle === 'list'
                ? 'bg-white text-[#2E9E6A] shadow-xs'
                : 'text-[#666666] hover:text-[#2E9E6A]'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>清爽清單</span>
          </button>
        </div>
      </div>

      {/* Pending Items Alert Banner */}
      {pendingIngredients.length > 0 && (
        <div className="bg-[#FFF1E6] border border-[#F2B98A] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#E8833A] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-base font-bold text-[#9A4D12]">
                有 {pendingIngredients.length} 項 AI 辨識食材待確認
              </h4>
              <p className="text-sm text-[#9A4D12]/80 mt-0.5">
                系統已自動標記低信心項目，需確認後才會計入食譜推薦食材庫存中。
              </p>
            </div>
          </div>
          <button
            onClick={onBatchConfirmPending}
            className="w-full sm:w-auto px-4 py-2 min-h-[44px] bg-[#E8833A] text-white text-sm font-bold rounded-xl shadow-xs hover:bg-[#d6722c] cursor-pointer whitespace-nowrap transition-colors flex items-center justify-center"
          >
            一鍵全部核可為正常
          </button>
        </div>
      )}

      {/* Primary Action Buttons (Thumb-friendly >=44px) */}
      <div className="flex items-stretch gap-3">
        <button
          onClick={onOpenScan}
          className="flex-1 min-h-[48px] bg-[#2E9E6A] hover:bg-[#258559] active:scale-[0.99] text-white rounded-2xl py-3.5 px-4 font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-[#2E9E6A]/20 transition-all cursor-pointer"
        >
          <Camera className="w-5 h-5 stroke-[2.2]" />
          <span>📷 拍照盤點冰箱</span>
        </button>

        <button
          onClick={onOpenAdd}
          className="bg-white hover:bg-[#F1F7F4] text-[#2B2B2B] hover:text-[#2E9E6A] border-2 border-[#DCE4E0] active:scale-[0.99] rounded-2xl py-3.5 px-4 font-bold text-base min-h-[48px] flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-5 h-5 stroke-[2.2]" />
          <span>手動新增</span>
        </button>
      </div>

      {/* Scheme B: Visual Fridge Layout */}
      {viewStyle === 'visual' && (
        <div className="bg-white border-3 border-[#CFD8D3] rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8E5] pb-2">
            <span className="text-sm font-bold text-[#777777] tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2E9E6A]" /> 雙門分層智能冷藏庫
            </span>
            <span className="text-sm text-[#777777]">點選任一食材晶片可直接修改</span>
          </div>

          <div className="space-y-4">
            {shelves.map((shelf) => {
              const shelfItems = ingredients.filter(
                (item) => item.location === shelf.id && item.status !== 'depleted'
              );

              return (
                <div key={shelf.id} className="border-b-2 border-[#E8ECE9] pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-[#555555] flex items-center gap-1.5">
                      <span>{shelf.title}</span>
                      <span className="text-xs text-gray-400 font-normal">({shelf.subtitle})</span>
                    </span>
                    <span className="text-sm text-[#2E9E6A] font-semibold">
                      {shelfItems.length} 項
                    </span>
                  </div>

                  {shelfItems.length === 0 ? (
                    <div className="py-2 text-sm text-gray-400 italic">
                      此層目前空空如也，點上方按鈕新增食材
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {shelfItems.map((item) => {
                        const isPending = item.status === 'wait';
                        return (
                          <div
                            key={item.id}
                            onClick={() => onEditIngredient(item)}
                            role="button"
                            tabIndex={0}
                            className={`group inline-flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-full text-base font-semibold transition-all cursor-pointer shadow-xs active:scale-95 ${
                              isPending
                                ? 'bg-[#FFF1E6] border-2 border-dashed border-[#F2B98A] text-[#9A4D12] hover:bg-[#ffe5d1]'
                                : 'bg-[#F1F7F4] border-1.5 border-[#BFE0CF] text-[#2B2B2B] hover:bg-[#E3EFE8]'
                            }`}
                          >
                            <span className="text-xl">{getFoodEmoji(item.name, item.category)}</span>
                            <span>{item.name}</span>
                            <span className="text-sm text-[#666666] font-normal">
                              {item.quantity} {item.unit}
                            </span>
                            {isPending && (
                              <span className="text-xs font-bold bg-[#E8833A] text-white px-2 py-0.5 rounded-full ml-0.5">
                                待確認
                              </span>
                            )}
                            {item.expiryDays && item.expiryDays <= 3 && (
                              <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-0.5">
                                {item.expiryDays}天內過期
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scheme A: Clean List Layout */}
      {viewStyle === 'list' && (
        <div className="space-y-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'all'
                  ? 'bg-[#2E9E6A] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              全部 ({ingredients.length})
            </button>
            <button
              onClick={() => setFilterTab('ok')}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'ok'
                  ? 'bg-[#2E9E6A] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              正常庫存 ({activeIngredients.filter((i) => i.status === 'ok').length})
            </button>
            <button
              onClick={() => setFilterTab('wait')}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'wait'
                  ? 'bg-[#E8833A] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              ⚠️ 待確認 ({pendingIngredients.length})
            </button>
            <button
              onClick={() => setFilterTab('depleted')}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'depleted'
                  ? 'bg-gray-700 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              已用完 ({depletedIngredients.length})
            </button>
          </div>

          {/* List Cards */}
          <div className="space-y-2">
            {filteredList.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-[#E2E8E5]">
                <p className="text-base text-gray-500 font-medium">沒有符合條件的食材</p>
                <button
                  onClick={onOpenAdd}
                  className="mt-3 px-5 py-2.5 min-h-[44px] bg-[#F1F7F4] text-[#2E9E6A] text-sm font-bold rounded-xl cursor-pointer hover:bg-[#E3EFE8]"
                >
                  新增食材
                </button>
              </div>
            ) : (
              filteredList.map((item) => {
                const isPending = item.status === 'wait';
                const isDepleted = item.status === 'depleted';

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 border border-[#E2E8E5] shadow-xs flex items-center justify-between gap-3 hover:border-[#2E9E6A]/50 transition-all"
                  >
                    {/* Left Food Info */}
                    <div
                      onClick={() => onEditIngredient(item)}
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 min-h-[44px]"
                    >
                      <span className="text-3xl shrink-0 p-2.5 rounded-2xl bg-[#FAF8F3]">
                        {getFoodEmoji(item.name, item.category)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold text-base text-[#2B2B2B] truncate ${isDepleted ? 'line-through text-gray-400' : ''}`}>
                            {item.name}
                          </h3>
                          <span className="text-base font-semibold text-[#555]">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-sm text-[#777]">
                          <span>{getLocationLabel(item.location)}</span>
                          {item.freshnessTip && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-[140px] text-gray-500">{item.freshnessTip}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Controls & Status Badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Quick Qty +/- */}
                      {!isDepleted && (
                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            aria-label={`減少 ${item.name} 數量`}
                            className="px-3 py-2 text-gray-600 hover:bg-gray-200 font-bold text-base cursor-pointer min-w-[36px] min-h-[40px] flex items-center justify-center"
                            title="減少"
                          >
                            -
                          </button>
                          <span className="px-2 text-sm font-bold text-gray-800 min-w-[24px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            aria-label={`增加 ${item.name} 數量`}
                            className="px-3 py-2 text-gray-600 hover:bg-gray-200 font-bold text-base cursor-pointer min-w-[36px] min-h-[40px] flex items-center justify-center"
                            title="增加"
                          >
                            +
                          </button>
                        </div>
                      )}

                      {/* Status Tag */}
                      {isPending ? (
                        <span
                          onClick={() => onEditIngredient(item)}
                          className="text-sm px-3 py-1.5 rounded-xl font-bold bg-[#FFF1E6] text-[#9A4D12] border border-[#F2B98A] cursor-pointer hover:bg-[#ffe5d1] min-h-[40px] flex items-center"
                        >
                          待確認
                        </span>
                      ) : isDepleted ? (
                        <span className="text-sm px-3 py-1.5 rounded-xl font-medium bg-gray-100 text-gray-500 min-h-[40px] flex items-center">
                          已用完
                        </span>
                      ) : (
                        <span className="text-sm px-3 py-1.5 rounded-xl font-bold bg-[#E3F4EC] text-[#1F7A50] min-h-[40px] flex items-center">
                          正常
                        </span>
                      )}

                      <button
                        onClick={() => onEditIngredient(item)}
                        aria-label={`編輯 ${item.name}`}
                        className="p-2 text-gray-400 hover:text-gray-700 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
