import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, History, Sparkles, Flame } from 'lucide-react';

const POPULAR_TAGS = [
  { label: 'Arabic Kuthu', query: 'Arabic Kuthu Beast' },
  { label: 'Hukum', query: 'Hukum Jailer' },
  { label: 'Badass', query: 'Badass Leo' },
  { label: 'Vaathi Coming', query: 'Vaathi Coming Master' },
  { label: 'Naatu Koothu', query: 'Naatu Koothu RRR' },
  { label: 'Rowdy Baby', query: 'Rowdy Baby Maari 2' },
  { label: 'Why This Kolaveri', query: 'Why This Kolaveri Di' },
  { label: 'Anirudh Hits', query: 'Anirudh Ravichander Tamil' },
  { label: 'A.R. Rahman Classics', query: 'A.R. Rahman Tamil' },
  { label: 'Yuvan Melodies', query: 'Yuvan Shankar Raja Tamil' },
  { label: 'Harris Jayaraj', query: 'Harris Jayaraj Tamil' },
  { label: 'Kandha Sashti', query: 'Kandha Sashti Kavasam' }
];

export default function SearchBar({
  onSearch,
  isLoading,
  initialQuery = '',
  recentSearches = [],
  onClearRecent,
  onRemoveRecentItem
}) {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const inputRef = useRef(null);

  useEffect(() => {
    setSearchTerm(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim());
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const handleTagClick = (query) => {
    setSearchTerm(query);
    onSearch(query);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Search Input Box */}
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 rounded-2xl blur-md opacity-30 group-hover:opacity-60 transition duration-500"></div>

        <div className="relative flex items-center bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2 sm:p-2.5 shadow-2xl backdrop-blur-xl">
          {/* Search Icon / Loader */}
          <div className="pl-3 pr-2 text-slate-400">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-violet-400 group-focus-within:text-cyan-400 transition-colors" />
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Tamil song, movie, artist, or album (e.g. Arabic Kuthu, Hukum, Leo, Anirudh)..."
            className="w-full bg-transparent text-white placeholder-slate-400 text-sm sm:text-base focus:outline-none px-2"
          />

          {/* Clear Button */}
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition mr-2"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Search Submit Button */}
          <button
            type="submit"
            disabled={!searchTerm.trim() || isLoading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-md shadow-violet-900/30 transition-all flex items-center space-x-1.5 flex-shrink-0"
          >
            <span>Search</span>
          </button>
        </div>
      </form>

      {/* Recent Searches Row */}
      {recentSearches && recentSearches.length > 0 && (
        <div className="flex items-center flex-wrap gap-2 pt-1 text-xs text-slate-400">
          <div className="flex items-center space-x-1 text-slate-400 mr-1">
            <History className="w-3.5 h-3.5 text-violet-400" />
            <span className="font-medium">Recent:</span>
          </div>

          {recentSearches.slice(0, 5).map((query, idx) => (
            <div
              key={idx}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 transition"
            >
              <button
                type="button"
                onClick={() => handleTagClick(query)}
                className="hover:text-cyan-300 font-medium"
              >
                {query}
              </button>
              <button
                type="button"
                onClick={() => onRemoveRecentItem(query)}
                className="text-slate-500 hover:text-red-400 p-0.5"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {recentSearches.length > 0 && (
            <button
              type="button"
              onClick={onClearRecent}
              className="text-[11px] text-slate-400 hover:text-slate-300 underline ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Trending Suggestions Chips */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-slate-300">Popular Tamil Searches:</span>
        </div>

        <div className="flex items-center flex-wrap gap-1.5">
          {POPULAR_TAGS.map((tag, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleTagClick(tag.query)}
              className="px-3 py-1 rounded-full text-xs font-medium bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-violet-500/50 text-slate-300 hover:text-cyan-300 transition-all duration-200"
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
