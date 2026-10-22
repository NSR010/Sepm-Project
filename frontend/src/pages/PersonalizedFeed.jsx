import React from 'react';
import { useFetchFeed } from '../hooks/useFetchFeed';
import ContentCard from '../components/ContentCard';

export default function PersonalizedFeed() {
  const { feed, loading } = useFetchFeed();

  if (loading) return <div>Loading feed...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">For You</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {feed.map(item => <ContentCard key={item.id} title={item.title} />)}
      </div>
    </div>
  );
}
