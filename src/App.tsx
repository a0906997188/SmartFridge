import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { FridgeView } from './components/FridgeView';
import { CameraScanModal } from './components/CameraScanModal';
import { RecipeFinderView } from './components/RecipeFinderView';
import { EditIngredientModal } from './components/EditIngredientModal';
import { CookingCompleteModal } from './components/CookingCompleteModal';
import { SettingsView } from './components/SettingsView';
import {
  Ingredient,
  UserPreferences,
  CookingHistoryLog,
  StockDeductionItem,
  Recipe,
} from './types/fridge';
import { INITIAL_INGREDIENTS, INITIAL_PREFERENCES } from './data/initialData';
import { RotateCcw, CheckCircle, X } from 'lucide-react';

export default function App() {
  // Persistence with localStorage
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    try {
      const saved = localStorage.getItem('fc_ingredients');
      return saved ? JSON.parse(saved) : INITIAL_INGREDIENTS;
    } catch {
      return INITIAL_INGREDIENTS;
    }
  });

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem('fc_preferences');
      return saved ? JSON.parse(saved) : INITIAL_PREFERENCES;
    } catch {
      return INITIAL_PREFERENCES;
    }
  });

  const [cookingLogs, setCookingLogs] = useState<CookingHistoryLog[]>(() => {
    try {
      const saved = localStorage.getItem('fc_cooking_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('fc_ingredients', JSON.stringify(ingredients));
    } catch (e) {
      console.error(e);
    }
  }, [ingredients]);

  useEffect(() => {
    try {
      localStorage.setItem('fc_preferences', JSON.stringify(preferences));
    } catch (e) {
      console.error(e);
    }
  }, [preferences]);

  useEffect(() => {
    try {
      localStorage.setItem('fc_cooking_logs', JSON.stringify(cookingLogs));
    } catch (e) {
      console.error(e);
    }
  }, [cookingLogs]);

  // UI state
  const [currentTab, setCurrentTab] = useState<NavTab>('fridge');
  const [isPhoneFrame, setIsPhoneFrame] = useState(false);

  // Modals state
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completeRecipe, setCompleteRecipe] = useState<Recipe | null>(null);
  const [completeServings, setCompleteServings] = useState<number>(1);

  // Toast notification state
  const [toast, setToast] = useState<{
    id: string;
    message: string;
    undoAction?: () => void;
  } | null>(null);

  const showToast = (message: string, undoAction?: () => void) => {
    const id = String(Date.now());
    setToast({ id, message, undoAction });
    setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 4500);
  };

  // Counts
  const stockCount = ingredients.filter((i) => i.status !== 'depleted').length;
  const pendingCount = ingredients.filter((i) => i.status === 'wait').length;

  // Actions
  const handleBatchConfirmPending = () => {
    const updated = ingredients.map((item) =>
      item.status === 'wait' ? { ...item, status: 'ok' as const } : item
    );
    setIngredients(updated);
    showToast(`已將 ${pendingCount} 項待確認食材轉為正常庫存！`);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setIngredients((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newQty = Math.max(0, +(item.quantity + delta).toFixed(1));
        return {
          ...item,
          quantity: newQty,
          status: newQty === 0 ? 'depleted' : item.status,
        };
      })
    );
  };

  const handleSaveIngredient = (saved: Ingredient) => {
    setIngredients((prev) => {
      const idx = prev.findIndex((i) => i.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    showToast(`已儲存食材「${saved.name}」！`);
  };

  const handleDeleteIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    showToast('已刪除食材');
  };

  const handleScanConfirm = (scannedItems: Ingredient[]) => {
    // Append scanned items
    setIngredients((prev) => [...scannedItems, ...prev]);
    setIsScanModalOpen(false);
    setCurrentTab('fridge');
    showToast(`成功盤點加入 ${scannedItems.length} 項食材！`);
  };

  // Cooking Complete flow
  const handleCookCompleted = (recipe: Recipe, servings: number) => {
    setCompleteRecipe(recipe);
    setCompleteServings(servings);
    setIsCompleteModalOpen(true);
  };

  const handleConfirmDeduction = (
    deductions: StockDeductionItem[],
    recipeTitle: string,
    servings: number
  ) => {
    // 1. Update ingredients state (Quantity non-negative, depleted if 0)
    setIngredients((prev) =>
      prev.map((ing) => {
        const matched = deductions.find((d) => d.ingredientId === ing.id);
        if (!matched) return ing;
        const finalQty = Math.max(0, matched.newQuantity);
        return {
          ...ing,
          quantity: finalQty,
          status: finalQty === 0 ? 'depleted' : ing.status,
        };
      })
    );

    // 2. Add to logs (Task 4.5: retain at least 10 latest records, up to 30)
    const newLog: CookingHistoryLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      recipeTitle,
      servings,
      deductions,
      reverted: false,
    };
    setCookingLogs((prev) => [newLog, ...prev].slice(0, 30));

    // 3. Show toast with Undo
    showToast(`已成功扣除「${recipeTitle}」使用食材！`, () => {
      handleRevertLog(newLog.id);
    });
  };

  const handleRevertLog = (logId: string) => {
    const log = cookingLogs.find((l) => l.id === logId);
    if (!log || log.reverted) return;

    // Restore quantities
    setIngredients((prev) =>
      prev.map((ing) => {
        const item = log.deductions.find((d) => d.ingredientId === ing.id);
        if (!item) return ing;
        return {
          ...ing,
          quantity: item.prevQuantity,
          status: 'ok',
        };
      })
    );

    // Mark log as reverted
    setCookingLogs((prev) =>
      prev.map((l) => (l.id === logId ? { ...l, reverted: true } : l))
    );

    showToast(`已復原「${log.recipeTitle}」的食材扣除！`);
  };

  const handleResetData = () => {
    setIngredients(INITIAL_INGREDIENTS);
    setPreferences(INITIAL_PREFERENCES);
    setCookingLogs([]);
    showToast('已還原為預設示範食材');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#2B2B2B] flex flex-col items-center overflow-x-hidden w-full">
      {/* Outer Shell: Either Phone Mock Frame or Responsive Web Container */}
      <div
        className={`w-full transition-all duration-300 min-h-screen flex flex-col ${
          isPhoneFrame
            ? 'max-w-[395px] my-4 shadow-2xl rounded-[38px] border-8 border-gray-900 bg-[#FAF8F3] overflow-hidden relative'
            : 'max-w-3xl mx-auto'
        }`}
      >
        {/* Header */}
        <Header
          isPhoneFrame={isPhoneFrame}
          setIsPhoneFrame={setIsPhoneFrame}
          stockCount={stockCount}
          pendingCount={pendingCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-5">
          {currentTab === 'fridge' && (
            <FridgeView
              ingredients={ingredients}
              onOpenScan={() => setIsScanModalOpen(true)}
              onOpenAdd={() => {
                setSelectedIngredient(null);
                setIsEditModalOpen(true);
              }}
              onEditIngredient={(item) => {
                setSelectedIngredient(item);
                setIsEditModalOpen(true);
              }}
              onBatchConfirmPending={handleBatchConfirmPending}
              onUpdateQuantity={handleUpdateQuantity}
            />
          )}

          {currentTab === 'camera' && (
            <div className="pt-2">
              <CameraScanModal
                isOpen={true}
                onClose={() => setCurrentTab('fridge')}
                onConfirmIngredients={handleScanConfirm}
              />
            </div>
          )}

          {currentTab === 'recipes' && (
            <RecipeFinderView
              ingredients={ingredients}
              preferences={preferences}
              onUpdatePreferences={setPreferences}
              onCookCompleted={handleCookCompleted}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              preferences={preferences}
              onUpdatePreferences={setPreferences}
              cookingLogs={cookingLogs}
              onRevertLog={handleRevertLog}
              onResetData={handleResetData}
            />
          )}
        </main>

        {/* Bottom Navigation */}
        <Navigation
          currentTab={currentTab}
          onChangeTab={(tab) => {
            if (tab === 'camera') {
              setIsScanModalOpen(true);
            } else {
              setCurrentTab(tab);
            }
          }}
          pendingCount={pendingCount}
        />
      </div>

      {/* Camera Scan Modal (when launched from button) */}
      {isScanModalOpen && currentTab !== 'camera' && (
        <CameraScanModal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          onConfirmIngredients={handleScanConfirm}
        />
      )}

      {/* Edit / Add Modal */}
      {isEditModalOpen && (
        <EditIngredientModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedIngredient(null);
          }}
          ingredient={selectedIngredient}
          onSave={handleSaveIngredient}
          onDelete={handleDeleteIngredient}
        />
      )}

      {/* Cooking Complete Deduction Modal */}
      {isCompleteModalOpen && (
        <CookingCompleteModal
          isOpen={isCompleteModalOpen}
          onClose={() => {
            setIsCompleteModalOpen(false);
            setCompleteRecipe(null);
          }}
          recipe={completeRecipe}
          servings={completeServings}
          ingredients={ingredients}
          onConfirmDeduction={handleConfirmDeduction}
        />
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-18 z-50 left-4 right-4 max-w-md mx-auto bg-gray-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2.5 text-base font-semibold">
            <CheckCircle className="w-5 h-5 text-[#2E9E6A] shrink-0" />
            <span>{toast.message}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {toast.undoAction && (
              <button
                onClick={() => {
                  toast.undoAction?.();
                  setToast(null);
                }}
                aria-label="復原上一步操作"
                className="px-3.5 py-1.5 min-h-[44px] bg-[#E8833A] text-white text-sm font-bold rounded-xl hover:bg-[#d4732c] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>復原</span>
              </button>
            )}
            <button
              onClick={() => setToast(null)}
              aria-label="關閉通知"
              className="text-gray-400 hover:text-white p-2 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
