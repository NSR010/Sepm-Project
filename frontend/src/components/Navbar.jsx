import React from 'react';

export default function Navbar() {
  return (
    <nav className="p-4 border-b border-gray-800 flex justify-between items-center">
      <div className="font-bold text-xl">Gallery</div>
      <input 
        type="text" 
        placeholder="Search..." 
        className="input-field rounded-full px-4 py-1"
      />
    </nav>
  );
}
