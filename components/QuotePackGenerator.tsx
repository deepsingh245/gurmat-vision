import React, { useState } from 'react';
import { generateQuotePack, generateStatusImage, generateBackgroundVideo } from '../services/geminiService';
import { GurbaniQuote } from '../types';
import Button from './Button';

const QuotePackGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [quotes, setQuotes] = useState<GurbaniQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  
  // To store generated media URLs
  const [mediaUrls, setMediaUrls] = useState<{[key: number]: {img?: string, vid?: string}}>({});

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setQuotes([]);
    setMediaUrls({});
    try {
      const data = await generateQuotePack(topic, 5);
      setQuotes(data);
    } catch (e) {
      alert("Failed to generate quotes.");
    } finally {
      setLoading(false);
    }
  };

  const generateMedia = async (index: number, type: 'image' | 'video') => {
    setProcessingId(index);
    try {
      const quote = quotes[index];
      if (type === 'image') {
        const url = await generateStatusImage(quote.imagePrompt, '1K', '1:1');
        setMediaUrls(prev => ({...prev, [index]: {...prev[index], img: url}}));
      } else {
        const url = await generateBackgroundVideo(quote.videoPrompt, '9:16');
        setMediaUrls(prev => ({...prev, [index]: {...prev[index], vid: url}}));
      }
    } catch (e) {
      alert(`Failed to generate ${type}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="animate-fade-in-up space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-2xl mx-auto">
        <h3 className="text-xl font-bold text-gray-800 mb-2">🌿 Gurbani Quote Packs</h3>
        <p className="text-gray-500 mb-6">Enter a topic (e.g., "Peace", "Courage", "Love") and AI will generate 5 social-ready quotes.</p>
        
        <div className="flex gap-2">
          <input 
            type="text" 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic..."
            className="flex-1 p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-saffron-500"
          />
          <Button onClick={handleGenerate} isLoading={loading}>Generate Pack</Button>
        </div>
      </div>

      {quotes.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quotes.map((quote, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="text-saffron-600 font-gurmukhi text-lg mb-2 text-center">{quote.gurmukhi}</div>
                <div className="text-xs text-gray-400 italic mb-2 text-center">{quote.transliteration}</div>
                <p className="text-gray-800 font-medium text-center mb-4">"{quote.translation}"</p>
                <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600">
                  <strong>Reflection:</strong> {quote.reflection}
                </div>
              </div>
              
              {/* Media Preview Area */}
              {(mediaUrls[idx]?.img || mediaUrls[idx]?.vid) && (
                <div className="relative h-48 bg-black">
                  {mediaUrls[idx]?.vid ? (
                    <video src={mediaUrls[idx]?.vid} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={mediaUrls[idx]?.img} alt="Quote Bg" className="w-full h-full object-cover" />
                  )}
                </div>
              )}

              <div className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2 justify-between">
                <button 
                  onClick={() => generateMedia(idx, 'image')}
                  disabled={!!processingId}
                  className="flex-1 py-2 bg-white border border-gray-200 rounded hover:bg-gray-100 text-xs font-semibold text-gray-700"
                >
                  {processingId === idx ? '...' : '🎨 Image'}
                </button>
                <button 
                  onClick={() => generateMedia(idx, 'video')}
                  disabled={!!processingId}
                  className="flex-1 py-2 bg-white border border-gray-200 rounded hover:bg-gray-100 text-xs font-semibold text-gray-700"
                >
                  {processingId === idx ? '...' : '🎬 Video'}
                </button>
                <button 
                  onClick={() => navigator.clipboard.writeText(`${quote.gurmukhi}\n${quote.translation}`)}
                  className="py-2 px-3 text-gray-500 hover:text-navy-900"
                >
                  📋
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuotePackGenerator;