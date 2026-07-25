import React from 'react';
import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'pa', label: 'ਪੰ' },
  { code: 'hi', label: 'हि' },
];

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const current = i18n.language;

  const change = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('hukumnama-lang', code);
  };

  return (
    <div className="flex items-center gap-0.5 bg-white/10 rounded-full p-1">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => change(code)}
          className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
            current === code
              ? 'bg-saffron-500 text-navy-900'
              : 'text-white/70 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
