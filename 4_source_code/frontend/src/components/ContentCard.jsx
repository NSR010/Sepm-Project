import React, { useState } from 'react';
import { Heart, Eye, Sparkles } from 'lucide-react';
import api from '../services/api';

export default function ContentCard({ content, onLike }) {
  if (!content) return null;

  const {
    id,
    title,
    type,
    fileUrl,
    creator,
    viewsCount = 0,
    likesCount: initialLikes = 0,
    aiScore
  } = content;

  const [liked, setLiked] = useState(content.isLiked || false);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [isLiking, setIsLiking] = useState(false);

  const isImage = fileUrl && (
    fileUrl.endsWith('.png') ||
    fileUrl.endsWith('.jpg') ||
    fileUrl.endsWith('.jpeg') ||
    fileUrl.endsWith('.webp') ||
    fileUrl.endsWith('.gif') ||
    fileUrl.includes('images') ||
    fileUrl.includes('supabase.co') ||
    fileUrl.includes('uploads')
  );

  const handleLikeClick = async (e) => {
    e.stopPropagation();
    if (isLiking) return;
    setIsLiking(true);

    // Optimistic UI update
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const response = await api.post(`/content/${id}/like`);
      if (response.data) {
        setLiked(response.data.liked);
        setLikesCount(response.data.likesCount);
      }
      if (onLike) {
        onLike(id, response.data);
      }
    } catch (err) {
      // Revert if error (e.g. not logged in)
      setLiked(liked);
      setLikesCount(likesCount);
      console.warn('Like request failed:', err.response?.data?.message || err.message);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="border border-gray-800 hover:border-gray-600 transition-all rounded-xl overflow-hidden bg-surface flex flex-col group shadow-lg">
      <div className="h-48 bg-gray-900 relative overflow-hidden flex items-center justify-center">
        {isImage ? (
          <img
            src={fileUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Graceful fallback if image path is broken
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="p-4 text-center">
            <span className="text-3xl">🎨</span>
            <p className="text-xs text-gray-500 mt-2 uppercase tracking-wider">{type || 'Artwork'}</p>
          </div>
        )}

        {/* Content Type Badge */}
        {type && (
          <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-xs font-semibold px-2.5 py-0.5 rounded-full text-blue-400 capitalize border border-blue-500/30">
            {type}
          </span>
        )}

        {/* AI Recommendation Badge if present */}
        {aiScore && (
          <span className="absolute top-2 right-2 bg-purple-900/80 backdrop-blur-sm text-[10px] font-semibold px-2 py-0.5 rounded-full text-purple-200 flex items-center gap-1 border border-purple-400/40">
            <Sparkles className="w-3 h-3 text-purple-300" />
            AI Match {Math.round(aiScore * 100)}%
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-base text-white line-clamp-1">{title}</h3>
          <p className="text-xs text-gray-400 mt-1">
            by <span className="text-gray-300 font-medium">{creator?.name || creator?.username || 'Creator'}</span>
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 mt-4 pt-3 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {viewsCount}
            </span>
            <span className="flex items-center gap-1">
              <Heart className={`w-3.5 h-3.5 ${liked ? 'text-red-500 fill-red-500' : 'text-red-400'}`} />
              {likesCount}
            </span>
          </div>

          <button
            onClick={handleLikeClick}
            disabled={isLiking}
            className="p-1 transition-transform active:scale-125 focus:outline-none cursor-pointer"
            title={liked ? 'Unlike this work' : 'Like this work'}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                liked
                  ? 'text-red-500 fill-red-500'
                  : 'text-gray-400 hover:text-red-400'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
