import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import CreatorDashboard from './pages/CreatorDashboard';
import PersonalizedFeed from './pages/PersonalizedFeed';
import UserProfile from './pages/UserProfile';
import ContentInsights from './pages/ContentInsights';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<CreatorDashboard />} />
            <Route path="/feed" element={<PersonalizedFeed />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/insights" element={<ContentInsights />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
