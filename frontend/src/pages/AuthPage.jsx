import React, { useState } from 'react';
import Spline from '@splinetool/react-spline';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate setting a user; if logging in and no username provided, extract from email
    const name = !isLogin ? username : (email.split('@')[0] || 'Guest');
    setUser({ name });
    navigate('/dashboard');
  };

  return (
    <div className="relative w-screen h-screen bg-background flex items-center justify-center">
      <div className="absolute inset-0 z-0 opacity-50">
        <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />
      </div>
      
      <div className="z-10 w-full px-4">
        <div className="spectacle-title text-center mb-8">
          Illusion Gallery
          <span>Preserving Creative Works & Performances</span>
        </div>

        <div className="form-card rounded-xl p-6 sm:p-8">
          <h1 className="text-xl font-extrabold text-center mb-2 text-white">Access Portal</h1>
          <p className="text-center mb-6 text-gray-400 font-medium">Log in or create your spectacle.</p>

          <div className="flex bg-gray-800 rounded-full p-1 mb-6">
            <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 rounded-full font-bold text-sm ${isLogin ? 'bg-blue-600' : ''}`}>Log In</button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 rounded-full font-bold text-sm ${!isLogin ? 'bg-blue-600' : ''}`}>Sign Up</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold mb-1 text-white">Username</label>
                <input type="text" className="input-field w-full p-2 outline-none rounded-t-md" required value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold mb-1 text-white">Email</label>
              <input type="email" className="input-field w-full p-2 outline-none rounded-t-md" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-white">Password</label>
              <input type="password" className="input-field w-full p-2 outline-none rounded-t-md" required minLength="6" />
            </div>
            <button type="submit" className="action-button w-full text-white font-bold py-3 mt-6 rounded-lg shadow-lg">
              {isLogin ? 'Log In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
