import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserDocument } from '@/firebase/firestore';
import type { UserLanguage } from '@/types';
import Button from '@/components/Button';

interface ProfilePageProps {
  onBack: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const { user, userDoc, refreshUserDoc } = useAuth();

  const [name, setName]         = useState(userDoc?.name || '');
  const [language, setLanguage] = useState<UserLanguage>(userDoc?.language || 'english');
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await updateUserDocument(user.uid, { name, language });
      await refreshUserDoc();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials = (userDoc?.name || user?.email || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
        ← Back
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-6">Your Profile</h2>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-8">
        {userDoc?.photoUrl ? (
          <img src={userDoc.photoUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-saffron-500 flex items-center justify-center text-navy-900 font-bold text-xl">
            {initials}
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-900">{userDoc?.name || 'No name set'}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <p className="text-xs text-gray-400 mt-1 capitalize">{userDoc?.plan} plan</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-saffron-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full p-3 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Language</label>
          <div className="flex gap-2">
            {(['english', 'punjabi'] as UserLanguage[]).map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${
                  language === lang
                    ? 'bg-saffron-50 border-saffron-500 text-saffron-900'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {lang === 'punjabi' ? 'ਪੰਜਾਬੀ' : 'English'}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" isLoading={saving} className="w-full">
          {saved ? '✓ Saved' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
};

export default ProfilePage;
