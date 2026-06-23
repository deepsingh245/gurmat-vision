import React, { useState, useRef } from 'react';
import { generateBackgroundVideo, generateVideoFromImage, checkContentPolicy, ContentRejectedError } from '@/services/geminiService';
import { HukumnamaData } from '@/types';
import { DEFAULT_VIDEO_PROMPT_TEMPLATE, CREDIT_COSTS } from '@/constants';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/contexts/AuthContext';
import { saveGeneration } from '@/firebase/firestore';
import Button from './Button';

interface VideoGeneratorProps {
  hukumnama: HukumnamaData | null;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ hukumnama }) => {
  const { credits, canAfford, spend, refund } = useCredits();
  const { user } = useAuth();

  const [loading, setLoading]             = useState(false);
  const [videoUrl, setVideoUrl]           = useState<string | null>(null);
  const [customPrompt, setCustomPrompt]   = useState('');
  const [mode, setMode]                   = useState<'text-to-video' | 'image-to-video'>('text-to-video');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!canAfford(CREDIT_COSTS.VIDEO)) {
      setError(`Not enough credits. You need ${CREDIT_COSTS.VIDEO} but have ${credits}.`);
      return;
    }
    setLoading(true);
    setVideoUrl(null);
    setError(null);
    let spent = false;
    try {
      const effectivePrompt = mode === 'text-to-video'
        ? (customPrompt || DEFAULT_VIDEO_PROMPT_TEMPLATE(hukumnama?.summary || 'Spiritual ambiance'))
        : (customPrompt || 'Animate this peacefully');
      await checkContentPolicy(effectivePrompt);
      await spend(CREDIT_COSTS.VIDEO);
      spent = true;
      let url = '';
      if (mode === 'text-to-video') {
        const prompt = effectivePrompt;
        url = await generateBackgroundVideo(prompt, '9:16');
        if (user) saveGeneration(user.uid, 'video', prompt, url, CREDIT_COSTS.VIDEO).catch(() => {});
      } else if (mode === 'image-to-video' && uploadedImage) {
        const prompt = effectivePrompt;
        url = await generateVideoFromImage(uploadedImage, prompt, '9:16');
        if (user) saveGeneration(user.uid, 'video', prompt, url, CREDIT_COSTS.VIDEO).catch(() => {});
      }
      setVideoUrl(url);
    } catch (e) {
      if (spent) await refund(CREDIT_COSTS.VIDEO);
      setError(e instanceof ContentRejectedError
        ? e.message
        : 'Video generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setUploadedImage(e.target.files[0]);
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">🎥</span> Video Studio
            </h3>
            <span className="text-xs text-gray-400">⭐ {credits} credits</span>
          </div>

          <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
            <button
              className={`flex-1 py-1 text-xs font-bold rounded-md ${mode === 'text-to-video' ? 'bg-white shadow text-navy-900' : 'text-gray-500'}`}
              onClick={() => setMode('text-to-video')}
            >
              Text to Video
            </button>
            <button
              className={`flex-1 py-1 text-xs font-bold rounded-md ${mode === 'image-to-video' ? 'bg-white shadow text-navy-900' : 'text-gray-500'}`}
              onClick={() => setMode('image-to-video')}
            >
              Image to Video
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {mode === 'image-to-video' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full text-sm">
                  {uploadedImage ? uploadedImage.name : 'Upload Reference Image'}
                </Button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Animation Prompt</label>
              <textarea
                className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-saffron-500 outline-none"
                rows={4}
                placeholder={mode === 'image-to-video' ? 'Describe how to animate the image...' : 'Describe the scene (e.g., Golden Temple holy pond)...'}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </div>

            <Button
              onClick={handleGenerate}
              isLoading={loading}
              disabled={mode === 'image-to-video' && !uploadedImage}
              className="w-full"
            >
              {loading ? 'Generating Veo Video...' : `Generate Video — ${CREDIT_COSTS.VIDEO} credits`}
            </Button>

            <div className="bg-yellow-50 p-3 rounded-lg text-xs text-yellow-800 border border-yellow-200">
              <strong>Note:</strong> Video generation (Veo) takes 1–2 minutes. Please be patient.
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 rounded-2xl flex items-center justify-center min-h-125 relative overflow-hidden shadow-inner border border-gray-200">
        {videoUrl ? (
          <div className="relative h-full w-full flex items-center justify-center p-4">
            <div className="relative aspect-9/16 h-full max-h-150 shadow-2xl rounded-lg overflow-hidden bg-black">
              <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
              {hukumnama && (
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-linear-to-t from-black/80 to-transparent pointer-events-none">
                  <p className="text-white font-gurmukhi text-center text-sm drop-shadow-lg mb-2 line-clamp-4">
                    {hukumnama.gurmukhi}
                  </p>
                  <p className="text-saffron-300 text-center text-xs">Full Hukumnama Today</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <p className="text-4xl mb-2">🎬</p>
            <p>Generated video will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoGenerator;
