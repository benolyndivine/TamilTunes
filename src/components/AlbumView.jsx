import React, { useState, useEffect } from 'react';
import {
  Disc3,
  Calendar,
  User,
  Music,
  Copy,
  CheckCheck,
  Download,
  Play,
  ArrowLeft,
  Sparkles,
  Layers,
  ExternalLink,
  X,
  FileText
} from 'lucide-react';
import { getAlbumDetails } from '../services/musicMetadata';
import { getLyrics } from '../services/lyricsService';
import { downloadSongFile, downloadCoverImage } from '../utils/downloadHelper';
import Loading from './Loading';

export default function AlbumView({
  album,
  onBack,
  onPlaySong,
  onSelectSong,
  currentPlayingSong,
  isPlaying
}) {
  const [albumDetails, setAlbumDetails] = useState(null);
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null); // 'album' | 'artist' | 'year' | 'songsList' | 'artwork' | number (song index)
  const [imageError, setImageError] = useState(false);
  const [isDownloadingCover, setIsDownloadingCover] = useState(false);
  const [coverDownloaded, setCoverDownloaded] = useState(false);

  // Selected song details inside album view modal
  const [inspectedSong, setInspectedSong] = useState(null);
  const [inspectedLyrics, setInspectedLyrics] = useState(null);
  const [isLoadingInspectedLyrics, setIsLoadingInspectedLyrics] = useState(false);

  useEffect(() => {
    if (!album) return;
    setIsLoading(true);
    getAlbumDetails(album.collectionId || album.id, album.title, album.artist)
      .then(data => {
        setAlbumDetails(data.album || album);
        setSongs(data.songs || []);
      })
      .catch(err => {
        console.warn('Failed to load album details:', err);
        setAlbumDetails(album);
        setSongs([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [album]);

  const displayAlbum = albumDetails || album;
  const artworkUrl = displayAlbum.artworkUrl || '';

  // Copy helper
  const copyToClipboard = (text, fieldName) => {
    if (!text || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  // Copy all songs as a formatted list
  const handleCopyAllSongs = () => {
    if (!songs || songs.length === 0) return;
    const songListText = songs
      .map((s, i) => `${i + 1}. ${s.title} - ${s.artist}${s.durationFormatted ? ` (${s.durationFormatted})` : ''}`)
      .join('\n');
    copyToClipboard(songListText, 'songsList');
  };

  // Direct bulletproof cover artwork download with multi-tier fallback
  const handleDownloadCover = async () => {
    if (!artworkUrl || isDownloadingCover) return;
    setIsDownloadingCover(true);
    try {
      const res = await downloadCoverImage(artworkUrl, displayAlbum.title || 'Album');
      if (res && res.success) {
        setCoverDownloaded(true);
        setTimeout(() => setCoverDownloaded(false), 3000);
      }
    } catch (err) {
      console.error('Album cover download error:', err);
    } finally {
      setTimeout(() => setIsDownloadingCover(false), 1200);
    }
  };

  // Direct full 320kbps song download
  const handleDownloadSong = async (song) => {
    if (!song) return;
    try {
      await downloadSongFile(song);
    } catch (err) {
      console.error('Album download error:', err);
    }
  };

  // Open song details modal and fetch lyrics
  const handleInspectSong = (song) => {
    setInspectedSong(song);
    setInspectedLyrics(null);
    setIsLoadingInspectedLyrics(true);

    getLyrics({
      trackName: song.title,
      artistName: song.artist,
      albumName: displayAlbum.title,
      duration: song.duration
    })
      .then(data => {
        setInspectedLyrics(data);
      })
      .catch(err => {
        console.warn('Lyrics fetch for inspected song error:', err);
      })
      .finally(() => {
        setIsLoadingInspectedLyrics(false);
      });
  };

  // Download synced lyrics as .lrc file
  const handleDownloadLyrics = (song, lyrics) => {
    if (!lyrics) return;
    const content = lyrics.syncedLyrics || lyrics.plainLyrics || '';
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.title} - Synced.lrc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Back Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition text-xs font-semibold shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Back to Songs</span>
        </button>

        <span className="text-xs px-3 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 font-medium">
          Album / Movie Showcase
        </span>
      </div>

      {/* Main Album Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        {artworkUrl && !imageError && (
          <div
            className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[100px] opacity-25 pointer-events-none"
            style={{ backgroundImage: `url(${artworkUrl})`, backgroundSize: 'cover' }}
          />
        )}

        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Square Album Cover with Quick Download Overlay */}
          <div className="relative w-48 sm:w-56 md:w-64 aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-violet-950/50 bg-slate-950 flex-shrink-0 group">
            {!imageError && artworkUrl ? (
              <img
                src={artworkUrl}
                alt={displayAlbum.title}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-600">
                <Disc3 className="w-16 h-16 text-violet-500 animate-spin" />
              </div>
            )}

            {/* Quick Cover Download Button on Hover */}
            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
              <button
                type="button"
                onClick={handleDownloadCover}
                disabled={isDownloadingCover}
                className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg flex items-center space-x-1.5 transition disabled:opacity-60"
                title="Download full resolution album cover image"
              >
                {isDownloadingCover ? (
                  <Disc3 className="w-4 h-4 animate-spin" />
                ) : coverDownloaded ? (
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isDownloadingCover ? 'Saving...' : coverDownloaded ? 'Saved!' : 'Save Cover'}</span>
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(artworkUrl, 'artwork')}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition"
                title="Copy cover image URL"
              >
                {copiedField === 'artwork' ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                <span>{copiedField === 'artwork' ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </div>

          {/* Album Information & Copy Actions */}
          <div className="flex-1 flex flex-col justify-between text-center md:text-left space-y-4 min-w-0">
            <div>
              <div className="flex items-center justify-center md:justify-start space-x-2 text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">
                <Disc3 className="w-4 h-4 text-cyan-400" />
                <span>Movie / Album</span>
                {songs.length > 0 && <span>• {songs.length} Tracks</span>}
              </div>

              {/* Album Title with Copy Button */}
              <div className="flex items-center justify-center md:justify-start space-x-2.5 group/title">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  {displayAlbum.title}
                </h1>
                <button
                  type="button"
                  onClick={() => copyToClipboard(displayAlbum.title, 'album')}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex-shrink-0"
                  title="Copy Album Name"
                >
                  {copiedField === 'album' ? (
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-cyan-400" />
                  )}
                </button>
              </div>

              {/* Artist / Composer with Copy Button */}
              <div className="flex items-center justify-center md:justify-start space-x-2 mt-2 text-slate-300 text-base sm:text-lg">
                <User className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <span className="font-medium">{displayAlbum.artist}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(displayAlbum.artist, 'artist')}
                  className="p-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition flex-shrink-0"
                  title="Copy Artist / Composer Name"
                >
                  {copiedField === 'artist' ? (
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                </button>
              </div>

              {/* Year of Release with Copy Button */}
              {displayAlbum.year && (
                <div className="flex items-center justify-center md:justify-start space-x-2 mt-2 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-fuchsia-400 flex-shrink-0" />
                  <span>Release Year: <strong className="text-white">{displayAlbum.year}</strong></span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(displayAlbum.year, 'year')}
                    className="p-0.5 rounded text-slate-500 hover:text-white"
                    title="Copy Release Year"
                  >
                    {copiedField === 'year' ? (
                      <CheckCheck className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400 hover:text-cyan-400" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Action Buttons for Album */}
            <div className="flex items-center justify-center md:justify-start flex-wrap gap-2.5 pt-2">
              {/* Copy Album Name Button */}
              <button
                type="button"
                onClick={() => copyToClipboard(displayAlbum.title, 'album')}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                {copiedField === 'album' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{copiedField === 'album' ? 'Album Copied!' : 'Copy Album Name'}</span>
              </button>

              {/* Copy Artist Name Button */}
              <button
                type="button"
                onClick={() => copyToClipboard(displayAlbum.artist, 'artist')}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                {copiedField === 'artist' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-violet-400" />}
                <span>{copiedField === 'artist' ? 'Artist Copied!' : 'Copy Artist Name'}</span>
              </button>

              {/* Copy All Songs in Album */}
              {songs.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyAllSongs}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition"
                  title="Copy full tracklist"
                >
                  {copiedField === 'songsList' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Layers className="w-3.5 h-3.5 text-fuchsia-400" />}
                  <span>{copiedField === 'songsList' ? 'Tracklist Copied!' : 'Copy All Song Names'}</span>
                </button>
              )}

              {/* Download Cover Artwork */}
              {artworkUrl && (
                <button
                  type="button"
                  onClick={handleDownloadCover}
                  disabled={isDownloadingCover}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md transition disabled:opacity-60"
                  title="Download full resolution album cover image"
                >
                  {isDownloadingCover ? (
                    <>
                      <Disc3 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Cover...</span>
                    </>
                  ) : coverDownloaded ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-white" />
                      <span>Cover Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Album Cover</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Album Tracklist Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <Music className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">Songs in this Album</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {songs.length}
            </span>
          </div>

          {songs.length > 0 && (
            <button
              type="button"
              onClick={handleCopyAllSongs}
              className="text-xs text-cyan-400 hover:text-white flex items-center space-x-1"
            >
              <Copy className="w-3 h-3" />
              <span>Copy All Songs</span>
            </button>
          )}
        </div>

        {isLoading ? (
          <Loading message="Loading album tracklist..." />
        ) : songs.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-sm">
            No tracklist available for this collection. You can search directly by individual song name above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {songs.map((song, index) => {
              const isCurrentPlaying = currentPlayingSong?.id === song.id;

              return (
                <div
                  key={song.id || index}
                  onClick={() => handleInspectSong(song)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                    isCurrentPlaying
                      ? 'bg-violet-950/40 border-violet-500/60 shadow-lg'
                      : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 hover:border-violet-500/50'
                  }`}
                  title="Click to view song details, copy info, or download"
                >
                  {/* Left: Track Index / Play icon & Title */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlaySong?.(song);
                      }}
                      className="w-8 h-8 rounded-xl bg-slate-800 group-hover:bg-violet-600 flex items-center justify-center text-slate-300 group-hover:text-white flex-shrink-0 transition"
                      title="Play song"
                    >
                      {isCurrentPlaying && isPlaying ? (
                        <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 animate-pulse" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isCurrentPlaying ? 'text-cyan-300' : 'text-white'}`}>
                        {index + 1}. {song.title}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{song.artist}</p>
                    </div>
                  </div>

                  {/* Right: Quick Download 320kbps, Copy Song Name & Duration */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {/* Direct 320kbps song download */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadSong(song);
                      }}
                      className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white transition flex items-center space-x-1 text-[11px] font-semibold"
                      title="Download full song in 320 Kbps studio quality directly"
                    >
                      <Download className="w-3 h-3" />
                      <span className="hidden sm:inline">320k</span>
                    </button>

                    {/* Copy single song name */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(song.title, `song-${index}`);
                      }}
                      className="p-1 rounded-md text-slate-500 hover:text-cyan-300 hover:bg-slate-800 transition"
                      title="Copy this song name"
                    >
                      {copiedField === `song-${index}` ? (
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {song.durationFormatted && (
                      <span className="text-xs text-slate-500 font-mono">
                        {song.durationFormatted}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Song Details Modal from Album */}
      {inspectedSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                  Track Details • {displayAlbum.title}
                </span>
                <h3 className="font-extrabold text-white text-lg sm:text-xl truncate mt-1">
                  {inspectedSong.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedSong(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Song Cover & Quick Info */}
            <div className="flex items-center space-x-4">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-950 shadow-lg flex-shrink-0">
                {artworkUrl ? (
                  <img src={artworkUrl} alt={inspectedSong.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Music className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1 text-xs">
                <p className="text-slate-200 text-sm font-semibold truncate">
                  {inspectedSong.artist}
                </p>
                <p className="text-slate-400">
                  Album: <span className="text-white">{displayAlbum.title}</span>
                </p>
                {displayAlbum.year && (
                  <p className="text-slate-400">
                    Release Year: <span className="text-white">{displayAlbum.year}</span>
                  </p>
                )}
                {inspectedSong.durationFormatted && (
                  <p className="text-slate-400 font-mono">
                    Duration: <span className="text-cyan-300 font-semibold">{inspectedSong.durationFormatted}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Copy Information Section */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Copy Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {/* Copy Song Name */}
                <button
                  type="button"
                  onClick={() => copyToClipboard(inspectedSong.title, 'modal-song')}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center justify-center space-x-1.5 transition border border-slate-700"
                >
                  {copiedField === 'modal-song' ? (
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-violet-400" />
                  )}
                  <span>{copiedField === 'modal-song' ? 'Song Copied!' : 'Copy Song Name'}</span>
                </button>

                {/* Copy Artist Name */}
                <button
                  type="button"
                  onClick={() => copyToClipboard(inspectedSong.artist, 'modal-artist')}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center justify-center space-x-1.5 transition border border-slate-700"
                >
                  {copiedField === 'modal-artist' ? (
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span>{copiedField === 'modal-artist' ? 'Artist Copied!' : 'Copy Artist Name'}</span>
                </button>

                {/* Copy Synced Lyrics */}
                <button
                  type="button"
                  onClick={() => {
                    const lrcContent = inspectedLyrics?.syncedLyrics || inspectedLyrics?.plainLyrics;
                    if (lrcContent) {
                      copyToClipboard(lrcContent, 'modal-lyrics');
                    }
                  }}
                  disabled={!inspectedLyrics || (!inspectedLyrics.syncedLyrics && !inspectedLyrics.plainLyrics)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-medium flex items-center justify-center space-x-1.5 transition border border-slate-700"
                  title="Copy synchronized timestamped lyrics to clipboard"
                >
                  {copiedField === 'modal-lyrics' ? (
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-fuchsia-400" />
                  )}
                  <span>
                    {isLoadingInspectedLyrics
                      ? 'Loading...'
                      : copiedField === 'modal-lyrics'
                      ? 'Lyrics Copied!'
                      : 'Copy Synced Lyrics'}
                  </span>
                </button>
              </div>
            </div>

            {/* Download Options Section */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Download Options
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Download Full Song 320kbps */}
                <button
                  type="button"
                  onClick={() => handleDownloadSong(inspectedSong)}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center space-x-1.5 shadow-md transition"
                  title="Download full 320kbps song directly"
                >
                  <Download className="w-4 h-4" />
                  <span>Full Song (320k)</span>
                </button>

                {/* Download Cover Artwork */}
                <button
                  type="button"
                  onClick={handleDownloadCover}
                  disabled={isDownloadingCover}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold flex items-center justify-center space-x-1.5 transition disabled:opacity-60"
                  title="Download high-resolution cover image"
                >
                  {isDownloadingCover ? (
                    <>
                      <Disc3 className="w-4 h-4 animate-spin text-violet-400" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-violet-400" />
                      <span>Cover Image</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Play Button & Select View */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onPlaySong?.(inspectedSong);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg flex items-center space-x-1.5 transition"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play Full Song</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectSong?.(inspectedSong);
                  setInspectedSong(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                Open in Full Player View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

