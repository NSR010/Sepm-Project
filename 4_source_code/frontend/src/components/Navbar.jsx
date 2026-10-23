import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Sparkles, LayoutDashboard, BarChart2, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/feed?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-gray-800 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            Illusion Gallery
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:block relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search artworks, photography, poetry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-full pl-9 pr-4 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </form>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-3 text-sm font-medium">
          <Link
            to="/feed"
            className="flex items-center gap-1.5 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="hidden md:inline">Feed</span>
          </Link>

          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 text-blue-400" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>

          <Link
            to="/insights"
            className="flex items-center gap-1.5 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Insights</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-800">
              <Link
                to="/profile"
                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold"
                title={user.name || user.username}
              >
                {(user.name || user.username || 'U').charAt(0).toUpperCase()}
              </Link>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-red-400 p-1.5"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-xs font-bold"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
