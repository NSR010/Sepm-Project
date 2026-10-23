import React, { useState } from 'react';
import { useFetchFeed } from '../hooks/useFetchFeed';
import ContentCard from '../components/ContentCard';
import Navbar from '../components/Navbar';
import { Sparkles } from 'lucide-react';

export default function PersonalizedFeed() {
  const { feed, loading } = useFetchFeed();
  const [selectedType, setSelectedType] = useState('all');

  const filteredFeed = selectedType === 'all'
    ? feed
    : feed.filter((item) => item.type === selectedType);

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-gray-800 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="text-purple-400 w-7 h-7" />
              For You
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Curated by the Hybrid Recommendation Engine based on your aesthetic tastes
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {['all', 'art', 'photography', 'writing', 'performance'].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedType(category)}
                className={`text-xs px-3.5 py-1.5 rounded-full capitalize border transition-all ${
                  selectedType === category
                    ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                    : 'bg-surface border-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>Personalizing your spectacle feed...</p>
          </div>
        ) : filteredFeed.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No creative works found for this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredFeed.map((item) => (
              <ContentCard key={item.id} content={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
