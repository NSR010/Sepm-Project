import React from 'react';

export default function ContentCard({ title }) {
  return (
    <div className="border border-gray-700 p-4 rounded-lg bg-surface">
      <div className="h-32 bg-gray-800 mb-2 rounded"></div>
      <h3 className="font-semibold">{title}</h3>
    </div>
  );
}
