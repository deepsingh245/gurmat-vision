import React from 'react';
import { Clapperboard } from 'lucide-react';
import { HukumnamaData } from '@/types';

interface VideoGeneratorProps {
  hukumnama: HukumnamaData | null;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = (_props) => {
  return (
    <div className="flex items-center justify-center min-h-80 animate-fade-in-up">
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 bg-saffron-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Clapperboard className="w-8 h-8 text-saffron-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Video Generator — Coming Soon</h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          AI video generation is temporarily unavailable while we upgrade our rendering pipeline. Check back soon!
        </p>
      </div>
    </div>
  );
};

export default VideoGenerator;
