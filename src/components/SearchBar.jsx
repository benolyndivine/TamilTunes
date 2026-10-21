import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Loader2,
  History,
  Sparkles,
  Flame,
  User,
  Music2,
  Disc3,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { getKeywordSuggestions } from '../utils/searchSuggestions';

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

function highlightMatch(text = '', query = '') {
  if (!query || !text) return text;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.substring(0, index)}
      <span className="text-cyan-400 font-bold bg-cyan-950/40 px-0.5 rounded">
        {text.substring(index, index + query.length)}
      </span>
      {text.substring(index + query.length)}
    </>
  );
}

export default function SearchBar({
  onSearch,
  isLoading,
  initialQuery = '',
  recentSearches = [],
  onClearRecent,
  onRemoveRecentItem
}) {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState({ queries: [], artists: [], movies: [], songs: [] });
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setSearchTerm(initialQuery);
  }, [initialQuery]);

  // Update suggestions dynamically as keyword changes
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length >= 1) {
      const res = getKeywordSuggestions(trimmed, 6);
      setSuggestions(res);
      const totalCount =
        res.songs.length + res.artists.length + res.movies.length + res.queries.length;
      setShowSuggestions(totalCount > 0 && isFocused);
      setSelectedIndex(-1);
    } else {
      setShowSuggestions(false);
      setSuggestions({ queries: [], artists: [], movies: [], songs: [] });
    }
  }, [searchTerm, isFocused]);

  // Click outside listener to dismiss suggestions box
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const clean = searchTerm.trim();
    if (clean) {
      setShowSuggestions(false);
      onSearch(clean);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSelectSuggestion = (query) => {
    setSearchTerm(query);
    setShowSuggestions(false);
    onSearch(query);
  };

  const handleTagClick = (query) => {
    setSearchTerm(query);
    setShowSuggestions(false);
    onSearch(query);
  };

  // Keyboard navigation across suggestions
  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    // Collect all selectable options in display order
    const flatOptions = [
      ...suggestions.songs.map((s) => s.title),
      ...suggestions.artists.map((a) => `${a} Tamil Hits`),
      ...suggestions.movies.map((m) => `${m} Songs`),
      ...suggestions.queries
    ];

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flatOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatOptions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < flatOptions.length) {
        e.preventDefault();
        handleSelectSuggestion(flatOptions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const hasAnySuggestions =
    suggestions.songs.length > 0 ||
    suggestions.artists.length > 0 ||
    suggestions.movies.length > 0 ||
    suggestions.queries.length > 0;

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto space-y-4 relative">
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
            onFocus={() => {
              setIsFocused(true);
              if (searchTerm.trim().length >= 1) setShowSuggestions(true);
            }}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search Tamil song, movie, artist, or album (e.g. Arabic Kuthu, Hukum, Leo, Anirudh)..."
            className="w-full bg-transparent text-white placeholder-slate-400 text-sm sm:text-base focus:outline-none px-2"
            autoComplete="off"
            spellCheck="false"
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

        {/* Floating Searching Suggestion Box Dropdown */}
        {showSuggestions && hasAnySuggestions && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-900/98 border border-slate-700/90 rounded-2xl shadow-2xl shadow-violet-950/80 backdrop-blur-2xl overflow-hidden p-2.5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[460px] overflow-y-auto">
            
            {/* Header info */}
            <div className="flex items-center justify-between px-2 pt-1 pb-0.5 border-b border-slate-800/80 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              <span className="flex items-center space-x-1.5 text-cyan-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Related to "{searchTerm}"</span>
              </span>
              <span className="text-slate-500 font-normal">Use ↑↓ to navigate • Enter to select</span>
            </div>

            {/* Matching Songs Section */}
            {suggestions.songs.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-[11px] font-bold text-violet-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Music2 className="w-3.5 h-3.5" />
                  <span>Matching Songs</span>
                </div>
                <div className="space-y-0.5">
                  {suggestions.songs.map((song, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(song.title)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800/90 hover:border-slate-700 transition flex items-center justify-between group/item border border-transparent"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-violet-600/20 text-violet-300 flex items-center justify-center flex-shrink-0">
                          <Music2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-semibold text-white group-hover/item:text-cyan-300 transition truncate">
                            {highlightMatch(song.title, searchTerm)}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {song.artist} • <span className="text-slate-500 font-medium">{song.movie}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                        <span className="px-2 py-0.5 text-[10px] rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                          Song
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover/item:text-cyan-400 transition transform group-hover/item:translate-x-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Matching Artists Section */}
            {suggestions.artists.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Artists & Composers</span>
                </div>
                <div className="space-y-0.5">
                  {suggestions.artists.map((artist, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(`${artist} Tamil Hits`)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800/90 hover:border-slate-700 transition flex items-center justify-between group/item border border-transparent"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-cyan-600/20 text-cyan-300 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-semibold text-white group-hover/item:text-cyan-300 transition truncate">
                          {highlightMatch(artist, searchTerm)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                        <span className="px-2 py-0.5 text-[10px] rounded-md bg-cyan-950/50 text-cyan-300 border border-cyan-800/50 font-semibold">
                          Artist Hits
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover/item:text-cyan-400 transition" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Matching Movies / Soundtracks */}
            {suggestions.movies.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-[11px] font-bold text-fuchsia-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Disc3 className="w-3.5 h-3.5" />
                  <span>Movie Soundtracks</span>
                </div>
                <div className="space-y-0.5">
                  {suggestions.movies.map((movie, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(`${movie} Songs`)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800/90 hover:border-slate-700 transition flex items-center justify-between group/item border border-transparent"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-fuchsia-600/20 text-fuchsia-300 flex items-center justify-center flex-shrink-0">
                          <Disc3 className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-semibold text-white group-hover/item:text-fuchsia-300 transition truncate">
                          {highlightMatch(movie, searchTerm)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                        <span className="px-2 py-0.5 text-[10px] rounded-md bg-fuchsia-950/50 text-fuchsia-300 border border-fuchsia-800/50 font-semibold">
                          Soundtrack
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover/item:text-fuchsia-400 transition" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Related Query Completions */}
            {suggestions.queries.length > 0 && (
              <div className="space-y-1 border-t border-slate-800 pt-2">
                <div className="px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Suggested Keywords
                </div>
                <div className="flex items-center flex-wrap gap-1.5 px-1">
                  {suggestions.queries.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(q)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white border border-slate-700/60 transition flex items-center space-x-1"
                    >
                      <TrendingUp className="w-3 h-3 text-cyan-400" />
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Search Option Footer */}
            <div className="pt-2 border-t border-slate-800/90 flex items-center justify-between px-2">
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="w-full py-2 px-3 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 hover:text-white border border-violet-500/30 font-semibold text-xs flex items-center justify-between transition"
              >
                <span>Search all results for "<strong>{searchTerm}</strong>"</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        )}
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
          <span className="font-semibold text-slate-300">Popular Tamil</span>
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
