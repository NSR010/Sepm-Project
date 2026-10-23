import React, { useState, useEffect } from 'react';
import { Camera, Upload, Folder, Image as ImageIcon, FileText, Heart, BarChart2, Sparkles, Sun, Moon, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ContentCard from '../components/ContentCard';
import Navbar from '../components/Navbar';
import api from '../services/api';

export default function CreatorDashboard() {
  const [activeView, setActiveView] = useState('Upload');
  const [darkMode, setDarkMode] = useState(true);
  const [myWorks, setMyWorks] = useState([]);
  const [loadingWorks, setLoadingWorks] = useState(false);

  // Upload form states
  const [title, setTitle] = useState('');
  const [type, setType] = useState('art');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const displayName = user?.name || user?.username || 'Creator';
  const displayInitial = displayName.charAt(0).toUpperCase();

  // Load creator's uploaded works
  const fetchMyWorks = async () => {
    setLoadingWorks(true);
    try {
      const response = await api.get('/content/creator/me');
      if (response.data && response.data.contents) {
        setMyWorks(response.data.contents);
      }
    } catch (err) {
      console.warn('Could not load creator content:', err.message);
    } finally {
      setLoadingWorks(false);
    }
  };

  useEffect(() => {
    fetchMyWorks();
  }, []);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('type', type);
      formData.append('metadata', JSON.stringify({ description, year: new Date().getFullYear() }));
      formData.append('file', file);

      await api.post('/content', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadSuccess(true);
      setTitle('');
      setDescription('');
      setFile(null);
      fetchMyWorks(); // Refresh works list
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.response?.data?.message || 'Failed to upload creative work.');
    } finally {
      setUploading(false);
    }
  };

  const navItems = [
    { name: 'Upload', icon: Upload },
    { name: 'Works', icon: Camera },
    { name: 'Analytics', icon: BarChart2 },
    { name: 'AIMagic', icon: Sparkles }
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-background text-white' : 'bg-gray-100 text-gray-900'} flex flex-col font-sans transition-colors duration-300`}>
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`w-64 p-6 flex flex-col border-r ${darkMode ? 'border-gray-800' : 'border-gray-300'} hidden md:flex`}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full border-2 border-blue-500 bg-gray-700 flex items-center justify-center text-white font-bold">
              {displayInitial}
            </div>
            <div>
              <p className="font-semibold text-sm">{displayName}</p>
              <p className="text-xs text-gray-500">Creator Studio</p>
            </div>
          </div>

          <nav className="flex flex-col space-y-1 text-sm flex-1">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  if (item.name === 'Analytics') navigate('/insights');
                  else if (item.name === 'AIMagic') navigate('/feed');
                  else setActiveView(item.name);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left ${
                  activeView === item.name
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {activeView === 'Upload' && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-2">Preserve New Work</h2>
              <p className="text-sm text-gray-400 mb-6">
                Upload your digital art, photography, writing, or performance recording to the gallery.
              </p>

              {uploadSuccess && (
                <div className="mb-6 p-4 bg-emerald-950/80 border border-emerald-500 rounded-lg text-emerald-200 text-sm flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  Work uploaded successfully! AI feature vectors and search index generated.
                </div>
              )}

              {uploadError && (
                <div className="mb-6 p-3 bg-red-950/80 border border-red-500 rounded-lg text-red-200 text-xs">
                  {uploadError}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="space-y-5 bg-surface p-6 rounded-xl border border-gray-800">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-300">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Whispers of the Cosmos"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-300">Medium / Category</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500 capitalize"
                  >
                    <option value="art">Art (Digital / Painting / Sculpture)</option>
                    <option value="photography">Photography</option>
                    <option value="writing">Writing (Poetry / Prose / Script)</option>
                    <option value="performance">Performance (Music / Dance / Theatre)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-300">Description / Concept</label>
                  <textarea
                    rows={3}
                    placeholder="Describe the aesthetic theme or context..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-300">Media File</label>
                  <div className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-lg p-6 text-center cursor-pointer relative bg-gray-900/50">
                    <input
                      type="file"
                      required
                      onChange={(e) => setFile(e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-300">
                      {file ? file.name : 'Click or drag media file to upload'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Images, audio, video, PDF up to 50MB</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  {uploading ? 'Preserving and Indexing...' : 'Upload Work'}
                </button>
              </form>
            </div>
          )}

          {activeView === 'Works' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">My Preserved Works</h2>
                <button
                  onClick={() => setActiveView('Upload')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
                >
                  + Upload New
                </button>
              </div>

              {loadingWorks ? (
                <p className="text-gray-400">Loading works...</p>
              ) : myWorks.length === 0 ? (
                <div className="text-center py-16 bg-surface rounded-xl border border-gray-800">
                  <p className="text-gray-400 mb-4">You haven't uploaded any works yet.</p>
                  <button
                    onClick={() => setActiveView('Upload')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                    Upload Your First Creation
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {myWorks.map((work) => (
                    <ContentCard key={work.id} content={work} />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
