import React from 'react';
import { Smartphone, Monitor, ChefHat, Sparkles } from 'lucide-react';

interface HeaderProps {
  isPhoneFrame: boolean;
  setIsPhoneFrame: (v: boolean) => void;
  stockCount: number;
  pendingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isPhoneFrame,
  setIsPhoneFrame,
  stockCount,
  pendingCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FAF8F3]/95 backdrop-blur-md border-b border-[#E2E8E5] px-4 py-3 transition-all">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#2E9E6A] to-[#42C085] flex items-center justify-center text-white shadow-sm shadow-[#2E9E6A]/20 min-w-[44px] min-h-[44px]">
            <ChefHat className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-[#2B2B2B]">FridgeChef</span>
              <span className="text-sm bg-[#2E9E6A]/10 text-[#2E9E6A] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 inline" /> 智慧廚房
              </span>
            </div>
            <p className="text-sm text-[#666666] font-medium hidden sm:block">
              冰箱拍照即時盤點 · 條件精準推薦 · 煮完自動扣庫存
            </p>
          </div>
        </div>

        {/* Status / View Toggle */}
        <div className="flex items-center gap-2">
          {/* Quick Stats Pill */}
          <div className="hidden md:flex items-center gap-2 text-sm font-medium bg-white px-3.5 py-2 rounded-xl border border-[#E2E8E5] shadow-xs">
            <span className="text-[#2B2B2B]">庫存：<strong className="text-[#2E9E6A] text-base">{stockCount}</strong> 項</span>
            {pendingCount > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-[#E8833A] font-bold">待確認 {pendingCount} 項</span>
              </>
            )}
          </div>

          {/* Phone Frame Toggle */}
          <button
            onClick={() => setIsPhoneFrame(!isPhoneFrame)}
            aria-label={isPhoneFrame ? '切換為全螢幕檢視' : '切換為手機單手操作預覽'}
            className={`flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 min-h-[44px] rounded-xl transition-all cursor-pointer border ${
              isPhoneFrame
                ? 'bg-[#2E9E6A] text-white border-[#2E9E6A] shadow-sm'
                : 'bg-white text-[#555] border-[#DCE4E0] hover:bg-[#F1F7F4] hover:text-[#2E9E6A]'
            }`}
          >
            {isPhoneFrame ? (
              <>
                <Monitor className="w-4 h-4" />
                <span className="hidden sm:inline">全螢幕檢視</span>
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">手機預覽 (375px)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
