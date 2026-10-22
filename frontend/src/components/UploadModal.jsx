import React from 'react';
import { Upload } from 'lucide-react';

export default function UploadModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-lg w-full max-w-md border border-gray-700">
        <h2 className="text-xl font-bold mb-4">Upload New Work</h2>
        <div className="border-2 border-dashed border-gray-600 p-8 text-center rounded">
          <Upload className="mx-auto mb-2 text-gray-400" />
          <p>Drop file here</p>
        </div>
        <button onClick={onClose} className="mt-4 w-full action-button py-2 rounded text-white font-bold">Close</button>
      </div>
    </div>
  );
}
