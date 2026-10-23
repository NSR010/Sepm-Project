import React, { useState } from 'react';
import Spline from '@splinetool/react-spline';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AVAILABLE_PREFERENCES = ['art', 'photography', 'writing', 'performance'];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login, register } = useAuth();

  const togglePreference = (pref) => {
    setSelectedPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(username, email, password, selectedPreferences);
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Auth error:', err);
      setError(
        err.response?.data?.message || 'Authentication failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-background flex items-center justify-center">
      <div className="absolute inset-0 z-0 opacity-50">
        <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />
      </div>
      
      <div className="z-10 w-full max-w-md px-4">
        <div className="spectacle-title text-center mb-6">
          Illusion Gallery
          <span className="text-sm block text-gray-400 mt-1">Preserving Creative Works & Performances</span>
        </div>

        <div className="form-card rounded-xl p-6 sm:p-8 bg-surface/90 backdrop-blur-md border border-gray-700">
          <h1 className="text-xl font-extrabold text-center mb-2 text-white">Access Portal</h1>
          <p className="text-center mb-6 text-gray-400 font-medium text-sm">
            {isLogin ? 'Log in to your spectacle' : 'Create an account to preserve your works'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-900/60 border border-red-500 rounded text-red-200 text-xs text-center">
              {error}
            </div>
          )}

          <div className="flex bg-gray-800 rounded-full p-1 mb-6">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2 rounded-full font-bold text-sm transition-all ${isLogin ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2 rounded-full font-bold text-sm transition-all ${!isLogin ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-300">Username</label>
                <input
                  type="text"
                  className="input-field w-full p-2 outline-none rounded bg-gray-900 text-white border border-gray-700 focus:border-blue-500"
                  required
                  placeholder="e.g. leonardo"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-300">Email</label>
              <input
                type="email"
                className="input-field w-full p-2 outline-none rounded bg-gray-900 text-white border border-gray-700 focus:border-blue-500"
                required
                placeholder="creator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-300">Password</label>
              <input
                type="password"
                className="input-field w-full p-2 outline-none rounded bg-gray-900 text-white border border-gray-700 focus:border-blue-500"
                required
                minLength="6"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold mb-2 text-gray-300">
                  Select your interests (AI Feed personalization):
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_PREFERENCES.map((pref) => {
                    const isSelected = selectedPreferences.includes(pref);
                    return (
                      <button
                        type="button"
                        key={pref}
                        onClick={() => togglePreference(pref)}
                        className={`text-xs px-3 py-1 rounded-full capitalize border transition-all ${
                          isSelected
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {pref}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="action-button w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 mt-6 rounded-lg shadow-lg disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'Please wait...' : isLogin ? 'Log In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
