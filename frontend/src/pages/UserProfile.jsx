import React from 'react';
import ContentCard from '../components/ContentCard';
import { useAuth } from '../context/AuthContext';

export default function UserProfile() {
  const { user } = useAuth();
  const displayName = user?.name || 'Guest User';
  const displayInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center mb-8">
        <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-3xl font-bold text-white mr-6">
          {displayInitial}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{displayName}</h1>
          <p className="text-gray-400">Digital Artist & Creator</p>
        </div>
      </div>
      <h2 className="text-xl font-bold mb-4">Public Boards</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ContentCard title="Concept Art" />
        <ContentCard title="Photography" />
      </div>
    </div>
  );
}
