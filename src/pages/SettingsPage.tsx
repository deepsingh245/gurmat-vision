import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserDocument } from '@/firebase/firestore';
import { signOutUser } from '@/firebase/auth';
import type { UserLanguage } from '@/types';
import Button from '@/components/Button';

interface SettingsPageProps {
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { user, userDoc, refreshUserDoc } = useAuth();
  const [language, setLanguage]           = useState<UserLanguage>(userDoc?.language || 'english');
  const [saving, setSaving]               = useState(false);
  const [signingOut, setSigningOut]       = useState(false);
  const [saved, setSaved]                 = useState(false);

  const handleSaveLanguage = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserDocument(user.uid, { language });
      await refreshUserDoc();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutUser();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
        {t('nav.back')}
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('settings.title')}</h2>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <h3 className="font-semibold text-gray-700 text-sm mb-3">{t('settings.accountSection')}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t('settings.email')}</span>
            <span className="text-gray-900">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('settings.plan')}</span>
            <span className="text-gray-900 capitalize">{userDoc?.plan ?? 'free'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('settings.creditsLabel')}</span>
            <span className="text-gray-900 font-semibold">{userDoc?.credits ?? 0}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <h3 className="font-semibold text-gray-700 text-sm mb-3">{t('settings.languageSection')}</h3>
        <div className="flex gap-2 mb-4">
          {[
            { id: 'english' as UserLanguage, label: t('settings.langEnglish') },
            { id: 'punjabi' as UserLanguage, label: t('settings.langPunjabi') },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setLanguage(id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${
                language === id
                  ? 'bg-saffron-50 border-saffron-500 text-saffron-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button onClick={handleSaveLanguage} isLoading={saving} variant="outline" className="w-full text-sm">
          {saved ? t('settings.saved') : t('settings.saveLanguage')}
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-700 text-sm mb-3">{t('settings.actionsSection')}</h3>
        <Button
          onClick={handleSignOut}
          isLoading={signingOut}
          variant="outline"
          className="w-full text-sm border-red-200 text-red-600 hover:bg-red-50"
        >
          {t('settings.signOut')}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
