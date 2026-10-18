import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import SongDetails from '../components/SongDetails';
import SyncedLyrics from '../components/SyncedLyrics';
import DownloadSources from '../components/DownloadSources';
import MusicPlayer from '../components/MusicPlayer';
import Loading from '../components/Loading';
import AlbumView from '../components/AlbumView';
import MobileBottomNav from '../components/MobileBottomNav';

import { searchSongs, getTrendingSongs, resolveSongAudio, searchAlbums } from '../services/musicMetadata';
import { getLyrics } from '../services/lyricsService';
import { getDownloadSources } from '../services/downloadSources';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

import { Sparkles, HelpCircle, Shield, X, Music, Radio, Disc3, ExternalLink, Layers, ArrowLeft } from 'lucide-react';

const RECENT_SEARCHES_KEY = 'tamil_music_recent_searches';

export default function Home() {
  const player = useAudioPlayer();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [songsError, setSongsError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);

  // Selected song state
  const [selectedSong, setSelectedSong] = useState(null);

  // Lyrics state
  const [lyricsData, setLyricsData] = useState(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [lyricsError, setLyricsError] = useState(null);

  // Sources state
  const [sourcesData, setSourcesData] = useState(null);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [sourcesError, setSourcesError] = useState(null);

  // View / Tab state: 'songs' | 'albums' | 'lyrics'
  const [activeTab, setActiveTab] = useState('songs');

  // Album state
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [albumSearchError, setAlbumSearchError] = useState(null);

  // Modal state
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Refs for smooth scroll
  const lyricsSectionRef = useRef(null);
  const sourcesSectionRef = useRef(null);
  const activeSearchAbort = useRef(null);

  // Load recent searches and initial trending Tamil songs on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to parse recent searches:', e);
    }

    // Load initial trending hits
    setIsLoadingSongs(true);
    getTrendingSongs()
      .then((data) => {
        if (data.results && data.results.length > 0) {
          setSongs(data.results);
          // Auto select first trending song
          handleSelectSong(data.results[0], false);
        }
      })
      .catch((err) => {
        console.warn('Initial trending fetch error:', err);
      })
      .finally(() => {
        setIsLoadingSongs(false);
      });
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (query) => {
    if (!query || !query.trim()) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 8);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {
      // ignore
    }
  };

  const handleRemoveRecentItem = (item) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((q) => q !== item);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  // Perform search
  const handleSearch = async (query) => {
    if (!query || !query.trim()) return;
    setSearchQuery(query);
    saveRecentSearch(query);
    setSongsError(null);
    setIsLoadingSongs(true);
    setIsLoadingAlbums(true);

    // Cancel pending request if any
    if (activeSearchAbort.current) {
      activeSearchAbort.current.abort();
    }
    const controller = new AbortController();
    activeSearchAbort.current = controller;

    // Search songs and albums concurrently
    try {
      const [songsData, albumsData] = await Promise.all([
        searchSongs(query, controller.signal, 24).catch(() => ({ results: [] })),
        searchAlbums(query, controller.signal, 12).catch(() => ({ results: [] }))
      ]);

      setSongs(songsData.results || []);
      setAlbums(albumsData.results || []);

      if (songsData.results && songsData.results.length > 0) {
        // Select the top matched song
        handleSelectSong(songsData.results[0], false);
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.error('Search error:', err);
        setSongsError(err.response?.data?.error || 'Failed to search songs. Please check your network and try again.');
      }
    } finally {
      setIsLoadingSongs(false);
      setIsLoadingAlbums(false);
    }
  };

  // Helper to select and open an album view
  const handleSelectAlbum = (album) => {
    setSelectedAlbum(album);
    setActiveTab('albums');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  // State to track if audio is currently being resolved
  const [isResolvingAudio, setIsResolvingAudio] = useState(false);

  // Select a song to inspect & load lyrics and sources
  const handleSelectSong = async (song, shouldAutoPlay = false) => {
    if (!song) return;

    // 1. Immediately display song with whatever audioUrl it already has (preview/none)
    setSelectedSong(song);

    // 2. Load lyrics & sources in parallel (don't block on audio resolution)
    loadSongLyrics(song);
    loadDownloadSources(song);

    // 3. Resolve full 320kbps stream URL asynchronously
    setIsResolvingAudio(true);
    try {
      const resolved = await resolveSongAudio(song.title, song.artist, song.album);
      if (resolved && resolved.streamUrl) {
        // Build an enriched song object with the full stream URL (via our CORS proxy)
        const enrichedSong = {
          ...song,
          audioUrl: resolved.streamUrl,     // /api/stream?url=... for player (CORS-free)
          downloadUrl: resolved.url,          // direct CDN url for download route
          isFullAudio: true,
          audioQuality: resolved.quality || '320 Kbps HQ Studio Audio',
          duration: resolved.duration || song.duration,
          durationFormatted: resolved.duration
            ? `${Math.floor(resolved.duration / 60)}:${String(resolved.duration % 60).padStart(2, '0')}`
            : song.durationFormatted
        };

        // Update selected song with enriched data (this gives SongDetails the correct download URL too)
        setSelectedSong(enrichedSong);

        // Start or update player with full audio
        if (shouldAutoPlay) {
          player.playTrack(enrichedSong, songs);
        }
      } else {
        // Fallback: use whatever was there (iTunes preview or nothing)
        if (shouldAutoPlay) {
          player.playTrack(song, songs);
        }
      }
    } catch (err) {
      console.warn('Audio resolution error:', err);
      if (shouldAutoPlay) {
        player.playTrack(song, songs);
      }
    } finally {
      setIsResolvingAudio(false);
    }
  };


  // Load lyrics helper
  const loadSongLyrics = async (song, force = false) => {
    setIsLoadingLyrics(true);
    setLyricsError(null);

    try {
      const data = await getLyrics({
        trackName: song.title,
        artistName: song.artist,
        albumName: song.album,
        duration: song.duration,
        force
      });
      setLyricsData(data);
    } catch (err) {
      console.warn('Lyrics fetch error:', err);
      setLyricsData(null);
      setLyricsError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Unable to load lyrics at this time.'
      );
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  // Load download sources helper
  const loadDownloadSources = async (song) => {
    setIsLoadingSources(true);
    setSourcesError(null);

    try {
      const data = await getDownloadSources({
        title: song.title,
        artist: song.artist,
        album: song.album,
        audioUrl: song.audioUrl
      });
      setSourcesData(data);
    } catch (err) {
      console.warn('Sources fetch error:', err);
      setSourcesData(null);
      setSourcesError('Could not retrieve download sources.');
    } finally {
      setIsLoadingSources(false);
    }
  };

  // Direct play from SongCard, SongDetails, or AlbumView
  const handlePlaySong = (song) => {
    // If this is the currently playing track, toggle play/pause
    if (player.currentTrack?.id === song.id) {
      player.togglePlay();
      return;
    }

    // If song is already enriched with full audio (or selectedSong matches and is full), play directly
    if (song.isFullAudio && song.audioUrl) {
      setSelectedSong(song);
      player.playTrack(song, songs);
      loadSongLyrics(song);
      loadDownloadSources(song);
    } else if (selectedSong && selectedSong.id === song.id && selectedSong.isFullAudio) {
      player.playTrack(selectedSong, songs);
      loadSongLyrics(selectedSong);
      loadDownloadSources(selectedSong);
    } else {
      // Not yet resolved into full 320kbps audio: trigger full select and play flow
      handleSelectSong(song, true);
    }
  };

  // Scroll helpers
  const scrollToLyrics = () => {
    lyricsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToSources = () => {
    sourcesSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-32">
      {/* Top Navigation */}
      <Navbar
        onOpenAbout={() => setShowAboutModal(true)}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'songs') {
            setSelectedAlbum(null);
          }
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        
        {/* Hero & Search Section */}
        <section className="text-center space-y-4 pt-2 pb-4">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Discover Tamil & Indian Music with Real-time Synced Lyrics</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Find Any <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">Tamil Song</span>, Lyrics & Sources
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Search by song title, movie, singer, or composer. Enjoy synchronized timestamped lyrics powered by LRCLIB, high-resolution artwork, and download search links.
          </p>

          {/* Search Bar Component */}
          <div className="pt-2">
            <SearchBar
              onSearch={handleSearch}
              isLoading={isLoadingSongs}
              initialQuery={searchQuery}
              recentSearches={recentSearches}
              onClearRecent={handleClearRecent}
              onRemoveRecentItem={handleRemoveRecentItem}
            />
          </div>
        </section>

        {/* Tab Switcher on mobile/tablet */}
        <div className="flex sm:hidden items-center justify-center p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('songs');
              setSelectedAlbum(null);
            }}
            className={`flex-1 py-2 rounded-xl font-bold transition text-center ${
              activeTab === 'songs'
                ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-md'
                : 'text-slate-400'
            }`}
          >
            Songs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('albums')}
            className={`flex-1 py-2 rounded-xl font-bold transition text-center flex items-center justify-center space-x-1 ${
              activeTab === 'albums'
                ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-md'
                : 'text-slate-400'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>Albums & Movies</span>
          </button>
        </div>

        {/* VIEW 1: ALBUM VIEW (When an album is opened or Albums tab selected) */}
        {selectedAlbum ? (
          <section className="space-y-6">
            <AlbumView
              album={selectedAlbum}
              onBack={() => setSelectedAlbum(null)}
              onPlaySong={handlePlaySong}
              onSelectSong={(song) => {
                handleSelectSong(song, false);
                setActiveTab('songs');
              }}
              currentPlayingSong={player.currentTrack}
              isPlaying={player.isPlaying}
            />
          </section>
        ) : activeTab === 'albums' ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Disc3 className="w-5 h-5 text-violet-400" />
                <h2 className="text-lg font-bold text-white">
                  Matching Albums & Movies {searchQuery && <span className="text-slate-400 text-sm font-normal">for "{searchQuery}"</span>}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                  {albums.length}
                </span>
              </div>
            </div>

            {isLoadingAlbums ? (
              <Loading message="Searching albums and movies..." />
            ) : albums.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-center">
                <Disc3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Albums Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Type any movie or album name (e.g. "Jailer", "Leo", "Beast", "Master", "Roja") in the search bar above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {albums.map((alb) => (
                  <div
                    key={alb.id}
                    onClick={() => handleSelectAlbum(alb)}
                    className="p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-violet-500/50 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-950 mb-2.5 shadow-md">
                        {alb.artworkUrl ? (
                          <img
                            src={alb.artworkUrl}
                            alt={alb.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Disc3 className="w-8 h-8" />
                          </div>
                        )}
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] font-bold text-cyan-300 backdrop-blur-sm">
                          {alb.year || 'Album'}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-white group-hover:text-cyan-300 line-clamp-1 transition-colors">
                        {alb.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {alb.artist}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-violet-400 font-semibold">
                      <span>View Tracklist</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* VIEW 2: SONGS TAB (Selected Song Details & Synced Lyrics) */}
            {selectedSong && (
              <section className="space-y-6">
                <SongDetails
                  song={selectedSong}
                  isPlaying={player.isPlaying && player.currentTrack?.id === selectedSong.id}
                  onPlay={handlePlaySong}
                  onAddToQueue={(s) => player.addToQueue(s)}
                  isQueued={player.queue.some((q) => q.id === selectedSong.id)}
                  onScrollToLyrics={scrollToLyrics}
                  onScrollToSources={scrollToSources}
                  isResolvingAudio={isResolvingAudio}
                />

                {/* Desktop Side-by-Side: Synced Lyrics & Download Sources */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Left Column: Synced Lyrics */}
                  <div ref={lyricsSectionRef} className="w-full">
                    <SyncedLyrics
                      lyricsData={lyricsData}
                      isLoading={isLoadingLyrics}
                      error={lyricsError}
                      currentTime={player.currentTime}
                      isPlaying={player.isPlaying && player.currentTrack?.id === selectedSong.id}
                      onSeek={(time) => player.seekTo(time)}
                      onRetry={() => loadSongLyrics(selectedSong, true)}
                      trackTitle={selectedSong.title}
                      artistName={selectedSong.artist}
                    />
                  </div>

                  {/* Right Column: Download & Streaming Sources */}
                  <div ref={sourcesSectionRef} className="w-full">
                    <DownloadSources
                      sourcesData={sourcesData}
                      isLoading={isLoadingSources}
                      error={sourcesError}
                      selectedSong={selectedSong}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Quick Albums Preview Row if available in Songs Tab */}
            {albums.length > 0 && !selectedAlbum && (
              <section className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-300">
                    <Disc3 className="w-4 h-4 text-violet-400" />
                    <span>Matching Movie Albums:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('albums')}
                    className="text-xs text-cyan-400 hover:text-white"
                  >
                    View All ({albums.length})
                  </button>
                </div>
                <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-none">
                  {albums.slice(0, 6).map((alb) => (
                    <div
                      key={alb.id}
                      onClick={() => handleSelectAlbum(alb)}
                      className="flex-shrink-0 w-36 p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-violet-500 cursor-pointer group transition"
                    >
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-slate-950 mb-1.5">
                        <img src={alb.artworkUrl} alt={alb.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      </div>
                      <p className="text-xs font-semibold text-white truncate group-hover:text-cyan-300">{alb.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">{alb.year || alb.artist}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Search Results / Trending Songs Section */}
            <section className="space-y-4 pt-4">
              {isLoadingSongs ? (
                <Loading message={searchQuery ? `Searching for "${searchQuery}"...` : 'Loading top Tamil hits...'} />
              ) : songsError ? (
                <ErrorMessage
                  title="Search Error"
                  message={songsError}
                  onRetry={() => handleSearch(searchQuery)}
                />
              ) : (
                <SearchResults
                  songs={songs}
                  query={searchQuery}
                  selectedSong={selectedSong}
                  currentPlayingSong={player.currentTrack}
                  isPlaying={player.isPlaying}
                  onSelectSong={(song) => handleSelectSong(song, false)}
                  onPlaySong={handlePlaySong}
                  onAddToQueue={(s) => player.addToQueue(s)}
                  queue={player.queue}
                />
              )}
            </section>
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/80 py-8 px-4 text-center text-xs text-slate-500 space-y-2 mb-16 sm:mb-0">
        <div className="flex items-center justify-center space-x-4 text-slate-400">
          <span className="flex items-center space-x-1">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>iTunes & JioSaavn Metadata</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>LRCLIB API Synced Lyrics</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Public Search & Official Links</span>
          </span>
        </div>
        <p>
          Tamil Song Finder, Downloader & Synced Lyrics • Built with React, Vite & Express. All music copyrights belong to their respective artists and record labels.
        </p>
      </footer>

      {/* Persistent Audio Player Bar */}
      <MusicPlayer
        player={player}
        onOpenLyrics={scrollToLyrics}
      />

      {/* Mobile Bottom Navigation Bar (Visible on mobile/smartphones) */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'lyrics') {
            scrollToLyrics();
          } else if (tab === 'songs') {
            setSelectedAlbum(null);
          }
        }}
        onOpenAbout={() => setShowAboutModal(true)}
        hasSelectedSong={Boolean(selectedSong)}
      />


      {/* About & Compliance Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-violet-400" />
                <h3 className="font-bold text-white text-base">About Tamil Music Finder</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-300 space-y-3 leading-relaxed">
              <p>
                <strong className="text-white">Music Metadata & Artwork:</strong> Songs, artwork, and 30-second audio previews are fetched via the iTunes Search API and JioSaavn API. High-resolution album artwork is dynamically scaled for crisp display on all screens.
              </p>
              <p>
                <strong className="text-white">Synchronized Lyrics:</strong> Powered by the community-driven <a href="https://lrclib.net" target="_blank" rel="noreferrer" className="text-cyan-400 underline">LRCLIB.net</a> API. Timestamps are parsed in real time to match playback position. Clicking on any line seeks playback directly.
              </p>
              <p>
                <strong className="text-white">Download & Source Links:</strong> We index public search results on user-requested websites (<span className="text-slate-200">Masstamilan, Mp3chetta, Koshalworld, Pagalnew</span>) and licensed streaming providers (<span className="text-slate-200">Spotify, Apple Music, JioSaavn, YouTube Music</span>). Direct downloads are strictly provided where authorized and legally permissible.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
