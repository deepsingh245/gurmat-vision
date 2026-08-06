import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, Loader2 } from 'lucide-react';
import { VoiceRecorder } from '@/services/voiceRecorder';
import { processVoiceIntent } from '@/services/geminiService';
import { VoiceIntentResult } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import Button from './Button';

const VoiceCommand: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [recording, setRecording]   = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult]         = useState<VoiceIntentResult | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const recorder = React.useRef(new VoiceRecorder());

  if (!user) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-4 py-16 animate-fade-in-up">
        <Mic className="w-12 h-12 mx-auto text-gray-400" />
        <p className="font-semibold text-gray-700">{t('voice.signInRequired')}</p>
        <Button onClick={() => window.dispatchEvent(new Event('hukumnama:require-auth'))}>
          {t('auth.signIn')}
        </Button>
      </div>
    );
  }

  const toggleRecording = async () => {
    if (recording) {
      setRecording(false);
      setProcessing(true);
      setError(null);
      try {
        const audioBlob = await recorder.current.stop();
        const response = await processVoiceIntent(audioBlob);
        setResult(response);
      } catch (e) {
        console.error(e);
        setError(t('voice.errorProcess'));
      } finally {
        setProcessing(false);
      }
    } else {
      try {
        await recorder.current.start();
        setRecording(true);
        setResult(null);
        setError(null);
      } catch {
        setError(t('voice.errorMic'));
      }
    }
  };

  return (
    <div className="max-w-xl mx-auto text-center space-y-8 animate-fade-in-up">
      <div className="bg-gradient-to-br from-navy-900 to-navy-800 rounded-3xl p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_50%_50%,white,transparent_70%)]" />

        <h3 className="text-2xl font-bold mb-2 relative z-10">{t('voice.heading')}</h3>
        <p className="text-navy-200 mb-2 relative z-10">{t('voice.subtitle')}</p>
        <p className="text-navy-300 text-sm mb-8 relative z-10 italic">{t('voice.hint')}</p>

        <button
          onClick={toggleRecording}
          disabled={processing}
          className={`relative justify-self-center z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
            recording
              ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-pulse'
              : 'bg-saffron-500 hover:bg-saffron-400 shadow-[0_0_20px_rgba(255,193,7,0.4)]'
          }`}
        >
          {processing ? (
            <Loader2 className="animate-spin h-10 w-10 text-white" />
          ) : recording ? (
            <Square className="w-9 h-9 text-white" fill="currentColor" />
          ) : (
            <Mic className="w-9 h-9 text-white" />
          )}
        </button>
        <p className="mt-4 text-sm font-medium relative z-10">
          {recording ? t('voice.listening') : processing ? t('voice.thinking') : t('voice.tapToSpeak')}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white text-left p-6 rounded-2xl shadow-sm border border-gray-100">
          <h4 className="font-bold text-gray-500 text-xs uppercase mb-4">{t('voice.analysisHeading')}</h4>

          <div className="mb-4">
            <span className="block text-xs text-gray-400 mb-1">{t('voice.transcript')}</span>
            <div className="text-lg text-gray-900 font-medium">"{result.transcript}"</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="block text-xs text-gray-400 mb-1">{t('voice.intent')}</span>
              <div className="text-navy-800 font-bold font-mono text-sm">{result.intent}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="block text-xs text-gray-400 mb-1">{t('voice.parameters')}</span>
              <div className="text-navy-800 font-mono text-xs">
                {JSON.stringify(result.parameters).replace(/["{}]/g, '').replace(/:/g, ': ').replace(/,/g, ', ')}
              </div>
            </div>
          </div>

          <div>
            <span className="block text-xs text-gray-400 mb-1">{t('voice.generatedPrompt')}</span>
            <div className="bg-gray-900 text-gray-300 p-3 rounded-lg font-mono text-xs break-all">
              {result.suggestedPrompt}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-gray-400 text-center">{t('voice.switchTabHint')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceCommand;
