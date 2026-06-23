import React, { useState } from 'react';
import { generateStatusImage } from '../services/geminiService';
import { HukumnamaData } from '../types';
import Button from './Button';
import { DEFAULT_IMAGE_PROMPT_TEMPLATE } from '../constants';

interface StatusGeneratorProps {
  hukumnama: HukumnamaData | null;
}

const StatusGenerator: React.FC<StatusGeneratorProps> = ({ hukumnama }) => {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [showTextOverlay, setShowTextOverlay] = useState(true);

  const handleGenerate = async () => {
    if (!hukumnama && !customPrompt) return;
    
    setLoading(true);
    try {
      const promptToUse = customPrompt || DEFAULT_IMAGE_PROMPT_TEMPLATE(hukumnama?.summary || "Sikh spirituality");
      const url = await generateStatusImage(promptToUse, size, '9:16');
      setImageUrl(url);
    } catch (error) {
      alert("Failed to generate image. Please try again. Ensure you have selected a paid project API key.");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `hukumnama-status-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">🖼️</span> Status Configuration
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
              <textarea 
                className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-saffron-500 outline-none"
                rows={4}
                placeholder={hukumnama ? `Using daily summary: ${hukumnama.summary}...` : "Describe your status background..."}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
              <div className="flex space-x-2">
                {(['1K', '2K', '4K'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`px-3 py-1 rounded-md text-sm border ${size === s ? 'bg-saffron-50 border-saffron-500 text-saffron-700' : 'border-gray-200 text-gray-600'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="overlay" 
                checked={showTextOverlay} 
                onChange={(e) => setShowTextOverlay(e.target.checked)} 
                className="rounded text-saffron-600 focus:ring-saffron-500"
              />
              <label htmlFor="overlay" className="text-sm text-gray-700">Preview with Text Overlay</label>
            </div>

            <Button onClick={handleGenerate} isLoading={loading} className="w-full">
              {loading ? 'Generating Art...' : 'Generate Status'}
            </Button>
            
            <p className="text-xs text-gray-500 mt-2">
              * Requires a paid project API key selection.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 rounded-2xl flex items-center justify-center min-h-[500px] relative overflow-hidden shadow-inner border border-gray-200">
        {imageUrl ? (
          <div className="relative h-full w-full flex items-center justify-center p-4">
             {/* This container simulates the 9:16 aspect ratio roughly */}
             <div className="relative aspect-[9/16] h-full max-h-[600px] shadow-2xl rounded-lg overflow-hidden group">
                <img src={imageUrl} alt="Generated Status" className="w-full h-full object-cover" />
                
                {/* Text Overlay Simulation */}
                {showTextOverlay && hukumnama && (
                  <div className="absolute inset-0 bg-black/30 flex flex-col justify-center items-center p-6 text-center">
                    <div className="border-y-2 border-white/60 py-4 w-full backdrop-blur-sm bg-black/10">
                      <p className="text-white font-gurmukhi text-lg mb-2 drop-shadow-md line-clamp-6">
                        {hukumnama.gurmukhi}
                      </p>
                      <p className="text-saffron-200 text-xs uppercase tracking-widest mt-2 font-bold">Today's Hukumnama</p>
                    </div>
                  </div>
                )}
                
                {/* Download Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                   <Button variant="secondary" onClick={downloadImage}>
                     Download Image
                   </Button>
                </div>
             </div>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <p className="text-4xl mb-2">🎨</p>
            <p>Generated image will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusGenerator;