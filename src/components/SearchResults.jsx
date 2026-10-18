import React, { useState } from 'react';
import SongCard from './SongCard';
import { Sparkles, Music, SlidersHorizontal } from 'lucide-react';

export default function SearchResults({
  songs = [],
  query = '',
  selectedSong,
  currentPlayingSong,
  isPlaying,
  onSelectSong,
  onPlaySong,
  onAddToQueue,
  queue = []
}) {
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance' | 'title' | 'duration'

  if (!songs || songs.length === 0) {
    return (
      <div className="w-full py-12 px-4 rounded-3xl bg-slate-900/40 border border-slate-800 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
          <Music className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">
          {query ? `No songs found for "${query}"` : 'Discover Tamil Songs'}
        </h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          {query
            ? 'Try searching with alternate spelling, movie title (e.g. "Leo", "Jailer", "Beast"), or the music director name.'
            : 'Type any song name, movie soundtrack, singer, or composer in the search bar above to begin.'}
        </p>
      </div>
    );
  }

  // Sorting
  const sortedSongs = [...songs].sort((a, b) => {
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'duration') {
      return (b.duration || 0) - (a.duration || 0);
    }
    return 0; // default relevance
  });

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">
            Matching Songs {query && <span className="text-slate-400 text-sm font-normal">for "{query}"</span>}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
            {songs.length}
          </span>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2 self-end sm:self-auto text-xs">
          <span className="text-slate-400 flex items-center space-x-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Sort:</span>
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-violet-500"
          >
            <option value="relevance">Relevance</option>
            <option value="title">Song Title (A-Z)</option>
            <option value="duration">Longest Duration</option>
          </select>
        </div>
      </div>

      {/* Grid of Song Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {sortedSongs.map((song) => {
          const isSelected = selectedSong?.id === song.id;
          const isPlayingThis = isPlaying && currentPlayingSong?.id === song.id;
          const isQueued = queue.some((q) => q.id === song.id);

          return (
            <SongCard
              key={song.id}
              song={song}
              isSelected={isSelected}
              isPlaying={isPlayingThis}
              onSelect={onSelectSong}
              onPlay={onPlaySong}
              onAddToQueue={onAddToQueue}
              isQueued={isQueued}
            />
          );
        })}
      </div>
    </div>
  );
}
