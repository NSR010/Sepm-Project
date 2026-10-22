import React from 'react';
import Spline from '@splinetool/react-spline';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="relative w-screen h-screen bg-background overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
        <div className="spectacle-title text-5xl">
          Illusion Gallery
          <span className="text-xl">Preserving Creative Works & Performances</span>
        </div>
        <button 
          onClick={() => navigate('/auth')}
          className="pointer-events-auto action-button text-white font-bold py-3 px-8 rounded-full shadow-lg mt-8"
        >
          Enter the Spectacle
        </button>
      </div>
    </div>
  );
}
