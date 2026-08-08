import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, Loader2, Zap } from 'lucide-react';
import { VoiceRecorder } from '@/services/voiceRecorder';
import { processVoiceIntent } from '@/services/geminiService';
import { VoiceIntentResult } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import Button from './Button';

const INTENT_LABELS: Record<string, string> = {
  create_quote_pack:     'Quotes',
  create_status_image:   'Status Image',
  create_hukumnama_post: 'Post',
  create_video:          'Video',
};

const VoiceCommand: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [recording, setRecording]   = useState(false);
  const [processing, setProcessing] = useState(false);
  const [executing, setExecuting]   = useState(false);
  const [result, setResult]         = useState<VoiceIntentResult | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const recorder = useRef(new VoiceRecorder());
  const execTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (execTimer.current) clearTimeout(execTimer.current); }, []);

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

  const dispatchIntent = (response: VoiceIntentResult) => {
    setExecuting(true);
    execTimer.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('hukumnama:voice-intent', { detail: response }));
    }, 1500);
  };

  const toggleRecording = async () => {
    if (recording) {
      setRecording(false);
      setProcessing(true);
      setError(null);
      try {
        const audioBlob = await recorder.current.stop();
        const response = await processVoiceIntent(audioBlob);
        setResult(response);
        if (response.intent !== 'unknown') {
          dispatchIntent(response);
        }
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
        setExecuting(false);
        if (execTimer.current) clearTimeout(execTimer.current);
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

          <div className="mt-4 flex items-center justify-center gap-2">
            {result.intent === 'unknown' ? (
              <p className="text-xs text-red-500 text-center">Couldn't understand the command — please try again.</p>
            ) : executing ? (
              <>
                <Loader2 className="w-4 h-4 text-saffron-500 animate-spin" />
                <p className="text-xs text-saffron-600 font-medium">
                  Switching to {INTENT_LABELS[result.intent] ?? result.intent}…
                </p>
              </>
            ) : (
              <button
                onClick={() => dispatchIntent(result)}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-saffron-500 hover:bg-saffron-600 px-4 py-2 rounded-full transition-colors"
              >
                <Zap className="w-3.5 h-3.5" /> Execute
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceCommand;
