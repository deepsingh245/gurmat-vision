import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserDocument } from '@/firebase/firestore';
import { signOutUser } from '@/firebase/auth';
import type { UserLanguage } from '@/types';
import Button from '@/components/Button';

interface SettingsPageProps {
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
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
        ← Back
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-6">Settings</h2>

      {/* Account info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <h3 className="font-semibold text-gray-700 text-sm mb-3">Account</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-900">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Plan</span>
            <span className="text-gray-900 capitalize">{userDoc?.plan ?? 'free'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Credits</span>
            <span className="text-gray-900 font-semibold">{userDoc?.credits ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <h3 className="font-semibold text-gray-700 text-sm mb-3">Language Preference</h3>
        <div className="flex gap-2 mb-4">
          {(['english', 'punjabi'] as UserLanguage[]).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${
                language === lang
                  ? 'bg-saffron-50 border-saffron-500 text-saffron-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {lang === 'punjabi' ? 'ਪੰਜਾਬੀ' : 'English'}
            </button>
          ))}
        </div>
        <Button onClick={handleSaveLanguage} isLoading={saving} variant="outline" className="w-full text-sm">
          {saved ? '✓ Saved' : 'Save Language'}
        </Button>
      </div>

      {/* Sign out */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-700 text-sm mb-3">Account Actions</h3>
        <Button
          onClick={handleSignOut}
          isLoading={signingOut}
          variant="outline"
          className="w-full text-sm border-red-200 text-red-600 hover:bg-red-50"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
