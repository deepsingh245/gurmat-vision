import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string; icon?: LucideIcon }[];
}

const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div className="flex justify-between bg-white p-1 rounded-xl shadow-sm border border-gray-100 mb-6 min-w-max">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`shrink-0 py-2 flex-1 px-3 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap
            ${activeTab === tab.id
              ? 'bg-saffron-100 text-saffron-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
        >
          {tab.icon && <tab.icon className="w-4 h-4" />}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
