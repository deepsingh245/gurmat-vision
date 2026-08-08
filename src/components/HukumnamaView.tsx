import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2 } from 'lucide-react';
import { HukumnamaData } from '@/types';
import { useShare } from '@/hooks/useShare';

interface HukumnamaViewProps {
  data: HukumnamaData | null;
  loading: boolean;
}

const HukumnamaView: React.FC<HukumnamaViewProps> = ({ data, loading }) => {
  const { t } = useTranslation();
  const { shareText } = useShare();
  const [language, setLanguage] = useState<'gurmukhi' | 'punjabi' | 'english'>('gurmukhi');

  const handleShare = () => {
    if (!data) return;
    const text = `${data.gurmukhi}\n\n${data.punjabi ? data.punjabi + '\n\n' : ''}${data.english}\n\n— Hukumnama AI Studio (${data.date})`;
    shareText('Hukumnama', text);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-96">
        <div className="w-16 h-16 border-4 border-saffron-200 border-t-saffron-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-600 font-medium animate-pulse">{t('hukumnama.loading')}</p>
        <p className="text-xs text-gray-400 mt-2">{t('hukumnama.loadingPowered')}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-12 text-gray-500">
        {t('hukumnama.noData')}
      </div>
    );
  }

  const LANG_TABS: { id: 'gurmukhi' | 'punjabi' | 'english'; label: string }[] = [
    { id: 'gurmukhi', label: t('hukumnama.langGurmukhi') },
    { id: 'punjabi',  label: t('hukumnama.langPunjabi')  },
    { id: 'english',  label: t('hukumnama.langEnglish')  },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-saffron-100">
      <div className="bg-linear-to-r from-saffron-500 to-saffron-600 p-6 text-white text-center">
        <h2 className="text-2xl font-bold font-gurmukhi">ਮੁੱਖਵਾਕ</h2>
        <p className="text-saffron-100 text-sm mt-1">{data.date}</p>
        <p className="mt-2 text-sm opacity-90 italic">"{data.summary}"</p>
      </div>

      <div className="p-4 bg-gray-50 flex justify-center gap-2 border-b border-gray-200">
        {LANG_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setLanguage(id)}
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
              language === id ? 'bg-saffron-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-8 text-center min-h-100 flex items-center justify-center bg-amber-50/30">
        {language === 'gurmukhi' && (
          <p className="text-2xl leading-loose font-gurmukhi text-gray-800 whitespace-pre-wrap">{data.gurmukhi}</p>
        )}
        {language === 'punjabi' && (
          <p className="text-xl leading-relaxed font-gurmukhi text-gray-700 whitespace-pre-wrap">{data.punjabi}</p>
        )}
        {language === 'english' && (
          <p className="text-lg leading-relaxed font-serif text-gray-800 whitespace-pre-wrap">{data.english}</p>
        )}
      </div>

      <div className="px-6 pb-5 flex justify-end">
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-saffron-600 border border-saffron-200 hover:bg-saffron-50 transition-colors"
        >
          <Share2 className="w-4 h-4" /> Share on WhatsApp
        </button>
      </div>
    </div>
  );
};

export default HukumnamaView;
