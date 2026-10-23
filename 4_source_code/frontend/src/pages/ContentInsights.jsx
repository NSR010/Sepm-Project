import React from 'react';
import AnalyticsChart from '../components/AnalyticsChart';
import { useAnalytics } from '../hooks/useAnalytics';
import Navbar from '../components/Navbar';
import { Eye, Heart, Folder, TrendingUp } from 'lucide-react';

export default function ContentInsights() {
  const { data, stats } = useAnalytics();

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        <div className="mb-8 pb-4 border-b border-gray-800">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="text-emerald-400 w-7 h-7" />
            Content Insights & Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time engagement trends, views, and audience reactions to your creative works
          </p>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface p-6 rounded-xl border border-gray-800 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Views</p>
              <p className="text-2xl font-bold mt-0.5">{stats.totalViews.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-surface p-6 rounded-xl border border-gray-800 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-500/10 text-red-400">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Likes</p>
              <p className="text-2xl font-bold mt-0.5">{stats.totalLikes.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-surface p-6 rounded-xl border border-gray-800 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Preserved Works</p>
              <p className="text-2xl font-bold mt-0.5">{stats.totalContents.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface p-6 rounded-xl border border-gray-800 shadow-lg">
            <h2 className="text-lg mb-4 font-semibold flex items-center justify-between">
              <span>Audience Views</span>
              <span className="text-xs text-gray-500 font-normal">Last 6 Months</span>
            </h2>
            <AnalyticsChart data={data} />
          </div>

          <div className="bg-surface p-6 rounded-xl border border-gray-800 shadow-lg">
            <h2 className="text-lg mb-4 font-semibold flex items-center justify-between">
              <span>Engagement Growth</span>
              <span className="text-xs text-emerald-400 font-normal">+18% vs prev</span>
            </h2>
            <AnalyticsChart data={data} />
          </div>
        </div>
      </main>
    </div>
  );
}
