import React, { useState } from 'react';
import { HukumnamaData, GeneratedPost } from '../types';
import { SOCIAL_TEMPLATES } from '../constants';
import { generateSocialPost, generateStatusImage } from '../services/geminiService';
import Button from './Button';

interface PostGeneratorProps {
  hukumnama: HukumnamaData | null;
}

const PostGenerator: React.FC<PostGeneratorProps> = ({ hukumnama }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(SOCIAL_TEMPLATES[0].id);
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

  const handleGenerateText = async () => {
    if (!hukumnama) return;
    setLoading(true);
    setGeneratedImage(null);
    try {
      const template = SOCIAL_TEMPLATES.find(t => t.id === selectedTemplate);
      const post = await generateSocialPost(hukumnama, template?.stylePrompt || '', language);
      setGeneratedPost(post);
    } catch (e) {
      alert("Error generating post text.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!generatedPost) return;
    setImgLoading(true);
    try {
      const url = await generateStatusImage(generatedPost.imagePrompt, '1K', '1:1');
      setGeneratedImage(url);
    } catch (e) {
      alert("Error generating image.");
    } finally {
      setImgLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 animate-fade-in-up">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">✍️ Create Hukumnama Post</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Choose Style</label>
              <div className="grid grid-cols-2 gap-2">
                {SOCIAL_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`p-2 text-xs rounded-lg border text-left transition-colors ${selectedTemplate === t.id ? 'bg-saffron-50 border-saffron-500 text-saffron-900' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="font-bold">{t.name}</div>
                    <div className="text-gray-500 line-clamp-1">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <div className="flex gap-2">
                {['English', 'Punjabi'].map(l => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium ${language === l ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleGenerateText} isLoading={loading} disabled={!hukumnama} className="w-full">
              Generate Text
            </Button>
          </div>
        </div>

        {generatedPost && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <h4 className="font-bold text-gray-800 mb-2">Generated Content</h4>
             <input className="w-full font-bold text-lg mb-2 border-b border-transparent hover:border-gray-200 outline-none" value={generatedPost.title} readOnly />
             <textarea className="w-full text-sm text-gray-600 min-h-[100px] mb-2 outline-none resize-none" value={generatedPost.body} readOnly />
             <div className="text-blue-600 text-sm mb-4">{generatedPost.hashtags.join(' ')}</div>
             
             <div className="flex gap-2">
               <Button variant="outline" onClick={() => navigator.clipboard.writeText(`${generatedPost.title}\n\n${generatedPost.body}\n\n${generatedPost.hashtags.join(' ')}`)} className="flex-1 text-xs">
                 Copy Text
               </Button>
               <Button variant="primary" onClick={handleGenerateImage} isLoading={imgLoading} className="flex-1 text-xs">
                 Generate Image
               </Button>
             </div>
          </div>
        )}
      </div>

      <div className="bg-gray-100 rounded-2xl flex items-center justify-center min-h-[500px] relative overflow-hidden shadow-inner border border-gray-200">
        {generatedImage ? (
           <div className="relative w-full max-w-sm aspect-square shadow-2xl bg-white p-2">
             <img src={generatedImage} alt="Post Background" className="w-full h-full object-cover" />
             {generatedPost && (
               <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/40 text-white">
                 <h2 className="font-bold text-xl mb-2 drop-shadow-lg">{generatedPost.title}</h2>
                 <p className="text-sm drop-shadow-md line-clamp-6">{generatedPost.body}</p>
                 <div className="absolute bottom-4 text-xs opacity-75">Hukumnama AI Studio</div>
               </div>
             )}
             <a href={generatedImage} download="post-image.png" className="absolute bottom-2 right-2 bg-white/90 p-2 rounded-full shadow text-gray-900 hover:bg-white">
               ⬇️
             </a>
           </div>
        ) : (
          <div className="text-center text-gray-400 p-8">
            <p className="text-4xl mb-2">📝</p>
            <p>Generate text first, then create an image.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostGenerator;