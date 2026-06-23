import React from 'react';

interface CreationsPageProps {
  onBack: () => void;
}

const CreationsPage: React.FC<CreationsPageProps> = ({ onBack }) => {
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
        ← Back
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-6">My Creations</h2>

      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-4xl mb-4">🌿</p>
        <p className="font-semibold text-gray-700 mb-2">No creations yet</p>
        <p className="text-sm text-gray-400 max-w-xs mx-auto">
          Your generated images, videos, and quote cards will appear here. Start creating from the main studio.
        </p>
      </div>
    </div>
  );
};

export default CreationsPage;
