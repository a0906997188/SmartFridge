import React from 'react';
import { Refrigerator, Camera, UtensilsCrossed, Settings, Sparkles } from 'lucide-react';

export type NavTab = 'fridge' | 'camera' | 'recipes' | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  pendingCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onChangeTab,
  pendingCount,
}) => {
  const tabs = [
    {
      id: 'fridge' as NavTab,
      label: '我的冰箱',
      icon: Refrigerator,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      id: 'camera' as NavTab,
      label: '拍照盤點',
      icon: Camera,
      special: true,
    },
    {
      id: 'recipes' as NavTab,
      label: '找食譜',
      icon: UtensilsCrossed,
    },
    {
      id: 'settings' as NavTab,
      label: '設定紀錄',
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8ECE9] shadow-lg max-w-4xl mx-auto pb-safe">
      <div className="flex items-center justify-around h-18 px-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          if (tab.special) {
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className="relative -top-3.5 flex flex-col items-center group cursor-pointer focus:outline-none min-w-[56px] min-h-[56px]"
                aria-label={tab.label}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                  isActive
                    ? 'bg-[#2E9E6A] text-white ring-4 ring-[#2E9E6A]/20'
                    : 'bg-gradient-to-tr from-[#2E9E6A] to-[#38b77c] text-white hover:scale-105'
                }`}>
                  <Icon className="w-7 h-7" />
                </div>
                <span className={`text-xs font-bold mt-1 tracking-tight ${
                  isActive ? 'text-[#2E9E6A]' : 'text-[#555555]'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1 transition-colors cursor-pointer focus:outline-none ${
                isActive ? 'text-[#2E9E6A]' : 'text-[#666666] hover:text-[#2E9E6A]'
              }`}
              aria-label={tab.label}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 transition-transform ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#E8833A] text-white text-xs font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs mt-1 font-semibold ${
                isActive ? 'font-bold text-[#2E9E6A]' : ''
              }`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E9E6A] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
