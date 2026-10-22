import React from 'react';
import AnalyticsChart from '../components/AnalyticsChart';
import { useAnalytics } from '../hooks/useAnalytics';

export default function ContentInsights() {
  const { data } = useAnalytics('user-1');

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Content Insights</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl mb-4 font-semibold">Total Views</h2>
          <AnalyticsChart data={data} />
        </div>
        <div className="bg-surface p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl mb-4 font-semibold">Engagement Trends</h2>
          <AnalyticsChart data={data} />
        </div>
      </div>
    </div>
  );
}
