import React, { useState } from 'react';
import { HukumnamaData } from '@/types';

interface HukumnamaViewProps {
  data: HukumnamaData | null;
  loading: boolean;
}

const HukumnamaView: React.FC<HukumnamaViewProps> = ({ data, loading }) => {
  const [language, setLanguage] = useState<'gurmukhi' | 'punjabi' | 'english'>('gurmukhi');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-96">
        <div className="w-16 h-16 border-4 border-saffron-200 border-t-saffron-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-600 font-medium animate-pulse">Fetching today's Hukumnama from Sri Darbar Sahib...</p>
        <p className="text-xs text-gray-400 mt-2">Powered by Gemini 2.5 Flash & Google Search</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-12 text-gray-500">
        No Hukumnama loaded. Please refresh or try again.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-saffron-100">
      <div className="bg-gradient-to-r from-saffron-500 to-saffron-600 p-6 text-white text-center">
        <h2 className="text-2xl font-bold font-gurmukhi">ਮੁੱਖਵਾਕ</h2>
        <p className="text-saffron-100 text-sm mt-1">{data.date}</p>
        <p className="mt-2 text-sm opacity-90 italic">"{data.summary}"</p>
      </div>

      <div className="p-4 bg-gray-50 flex justify-center gap-2 border-b border-gray-200">
        {(['gurmukhi', 'punjabi', 'english'] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
              language === lang ? 'bg-saffron-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      <div className="p-8 text-center min-h-[400px] flex items-center justify-center bg-amber-50/30">
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
    </div>
  );
};

export default HukumnamaView;
