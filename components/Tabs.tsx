import React from 'react';

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string; icon?: string }[];
}

const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div className="flex space-x-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2
            ${activeTab === tab.id 
              ? 'bg-saffron-100 text-saffron-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;