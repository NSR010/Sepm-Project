import React, { useState } from 'react';
import { Camera, Upload, Folder, Image as ImageIcon, FileText, Heart, BarChart2, Sparkles, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function CreatorDashboard() {
  const [activeView, setActiveView] = useState('Photo');
  const [darkMode, setDarkMode] = useState(true);
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  
  const displayName = user?.name || 'Guest';
  const displayInitial = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  const navItems = [
    { name: 'Photo', icon: Camera },
    { name: 'Upload', icon: Upload },
    { name: 'Collection', icon: Folder },
    { name: 'Albums', icon: ImageIcon },
    { name: 'Documents', icon: FileText },
    { name: 'Favorite', icon: Heart },
    { name: 'Analytics', icon: BarChart2 },
    { name: 'AIMagic', icon: Sparkles }
  ];

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-background text-white' : 'bg-gray-100 text-gray-900'} font-sans transition-colors duration-300`}>
      <aside className={`w-64 p-6 flex flex-col border-r ${darkMode ? 'border-gray-800' : 'border-gray-300'}`}>
        <h1 className="text-2xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">Illusion Gallery</h1>
        
        <nav className="flex flex-col space-y-2 text-lg flex-1">
          {navItems.map((item) => (
            <button 
              key={item.name} 
              onClick={() => setActiveView(item.name)}
              className={`nav-link ${activeView === item.name ? 'active' : ''}`}
            >
              <item.icon className="w-6 h-6 mr-3" />
              {item.name}
            </button>
          ))}
        </nav>
        
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500 bg-gray-700 flex items-center justify-center text-white">{displayInitial}</div>
              <p className="ml-3 font-semibold">{displayName}</p>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full transition-colors">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          <button onClick={handleLogout} className="action-button w-full text-white font-bold py-2 rounded-lg shadow-lg">
            Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <h2 className="text-3xl font-bold mb-6">{activeView}</h2>
        {activeView === 'Upload' && (
          <div className="max-w-3xl mx-auto upload-drop-zone p-10 text-center rounded-lg border-2 border-dashed border-gray-600 cursor-pointer hover:border-blue-500">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg">Drag & drop files here</p>
            <p className="text-sm text-gray-500">or click to browse</p>
            <button className="action-button text-white font-bold py-2 px-6 mt-6 rounded-lg">Start Upload</button>
          </div>
        )}
        {activeView !== 'Upload' && (
          <div className="text-gray-500">Content for {activeView} will appear here.</div>
        )}
      </main>
    </div>
  );
}
