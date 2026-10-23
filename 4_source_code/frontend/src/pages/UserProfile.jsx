import React, { useState, useEffect } from 'react';
import ContentCard from '../components/ContentCard';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { User, Palette } from 'lucide-react';

export default function UserProfile() {
  const { user } = useAuth();
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(false);

  const displayName = user?.name || user?.username || 'Guest Creator';
  const displayInitial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const fetchUserWorks = async () => {
      setLoading(true);
      try {
        const response = await api.get('/content/creator/me');
        if (response.data && response.data.contents) {
          setWorks(response.data.contents);
        }
      } catch (err) {
        console.warn('Could not load profile works:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserWorks();
  }, []);

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        {/* Profile Header */}
        <div className="bg-surface p-8 rounded-2xl border border-gray-800 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl">
            {displayInitial}
          </div>

          <div className="text-center sm:text-left flex-1">
            <h1 className="text-3xl font-bold">{displayName}</h1>
            <p className="text-gray-400 text-sm mt-1">{user?.email || 'Digital Artist & Spectacle Contributor'}</p>

            {user?.preferences && user.preferences.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
                {user.preferences.map((pref) => (
                  <span
                    key={pref}
                    className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-3 py-1 rounded-full capitalize"
                  >
                    {pref}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Gallery Section */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-400" />
            Preserved Creations ({works.length})
          </h2>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading works...</p>
        ) : works.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-xl border border-gray-800">
            <p className="text-gray-400">No creations uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {works.map((work) => (
              <ContentCard key={work.id} content={work} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
