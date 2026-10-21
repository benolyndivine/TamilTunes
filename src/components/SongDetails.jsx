import React, { useState } from 'react';
import {
  Play,
  Pause,
  Music,
  Disc3,
  Mic2,
  User,
  Clock,
  Plus,
  Check,
  Radio,
  ExternalLink,
  Sparkles,
  Download,
  Copy,
  Image as ImageIcon,
  CheckCheck,
  Zap,
  Film
} from 'lucide-react';
import { extractSongDetails } from '../utils/matchSong';
import { resolveSongAudio } from '../services/musicMetadata';
import { downloadSongFile, downloadCoverImage } from '../utils/downloadHelper';
import SpotifyCanvasModal from './SpotifyCanvasModal';

export default function SongDetails({
  song,
  isPlaying,
  onPlay,
  onAddToQueue,
  isQueued,
  onScrollToLyrics,
  onScrollToSources,
  isResolvingAudio = false
}) {
  const [imageError, setImageError] = useState(false);
  const [copiedText, setCopiedText] = useState(null);
  const [isDownloadingSong, setIsDownloadingSong] = useState(false);
  const [isDownloadingCover, setIsDownloadingCover] = useState(false);
  const [isCanvasModalOpen, setIsCanvasModalOpen] = useState(false);


  if (!song) return null;

  const { title: cleanTitle, movie } = extractSongDetails(song.title);
  const albumOrMovie = movie || song.album || 'Single / Soundtrack';
  const displayTitle = cleanTitle || song.title;

  // Copy ONLY the song name
  const handleCopySongName = (e) => {
    e?.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(displayTitle).then(() => {
        setCopiedText('songName');
        setTimeout(() => setCopiedText(null), 2000);
      }).catch(err => {
        console.warn('Clipboard copy error:', err);
      });
    }
  };

  // Copy ONLY the artist name
  const handleCopyArtistName = (e) => {
    e?.stopPropagation();
    if (!song.artist) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(song.artist).then(() => {
        setCopiedText('artistName');
        setTimeout(() => setCopiedText(null), 2000);
      }).catch(err => {
        console.warn('Clipboard copy error:', err);
      });
    }
  };

  // Direct backend song download in full 320 kbps (no redirect, native file download)
  const handleDownloadSong = async () => {
    setIsDownloadingSong(true);
    try {
      await downloadSongFile(song);
    } catch (err) {
      console.error('Song download error:', err);
    } finally {
      setTimeout(() => {
        setIsDownloadingSong(false);
      }, 1500);
    }
  };

  // Direct bulletproof cover artwork download with multi-tier fallback
  const handleDownloadCover = async () => {
    if (!song.artworkUrl || isDownloadingCover) {
      if (!song.artworkUrl) alert('Cover artwork is unavailable for this track.');
      return;
    }

    setIsDownloadingCover(true);
    try {
      await downloadCoverImage(song.artworkUrl, displayTitle);
    } catch (err) {
      console.warn('Cover download error:', err);
    } finally {
      setTimeout(() => {
        setIsDownloadingCover(false);
      }, 1200);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
      {/* Blurred Ambient Artwork Glow in Background */}
      {song.artworkUrl && !imageError && (
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[100px] opacity-20 pointer-events-none"
          style={{ backgroundImage: `url(${song.artworkUrl})`, backgroundSize: 'cover' }}
        />
      )}

      <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
        
        {/* High Quality Square Album Artwork with Download Overlay */}
        <div className="relative w-44 sm:w-52 md:w-60 aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-violet-950/40 bg-slate-950 flex-shrink-0 group">
          {!imageError && song.artworkUrl ? (
            <img
              src={song.artworkUrl}
              alt={`${song.title} Cover`}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-600">
              <Music className="w-16 h-16 text-slate-700 animate-pulse" />
              <span className="text-xs text-slate-500 mt-2">Music Artwork</span>
            </div>
          )}

          {/* Quality Badge on Artwork */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[11px] font-bold text-cyan-300 border border-cyan-500/30 flex items-center space-x-1 shadow-md">
            <Zap className="w-3 h-3 text-amber-400 fill-current" />
            <span>320 Kbps HQ</span>
          </div>

          {/* Quick Cover Download Button on Artwork Hover */}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleDownloadCover}
              disabled={isDownloadingCover}
              className="px-3 py-1.5 rounded-xl bg-slate-950/90 hover:bg-violet-600 text-white text-xs font-semibold backdrop-blur-md border border-slate-700 flex items-center space-x-1.5 shadow-lg transition"
              title="Download high-resolution cover image directly"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloadingCover ? 'Saving...' : 'Save Cover'}</span>
            </button>
          </div>
        </div>

        {/* Detailed Metadata Column */}
        <div className="flex-1 flex flex-col justify-between text-center md:text-left space-y-4">
          <div>
            {/* Movie or Album Tag */}
            <div className="flex items-center justify-center md:justify-start space-x-2 text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">
              <Disc3 className="w-4 h-4 text-violet-400" />
              <span>{albumOrMovie}</span>
              {song.year && <span>• {song.year}</span>}
            </div>

            {/* Song Title with Quick Copy (Only copies Song Name) */}
            <div className="flex items-center justify-center md:justify-start space-x-2.5 group/title">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {displayTitle}
              </h1>
              <button
                type="button"
                onClick={handleCopySongName}
                className="opacity-80 hover:opacity-100 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
                title="Copy Song Name"
              >
                {copiedText === 'songName' ? (
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Singers / Primary Artist with Quick Copy */}
            <div className="flex items-center justify-center md:justify-start space-x-2 mt-2 text-slate-300 text-base sm:text-lg group/artist">
              <Mic2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span className="font-medium">{song.artist}</span>
              <button
                type="button"
                onClick={handleCopyArtistName}
                className="opacity-70 hover:opacity-100 p-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
                title="Copy Artist Name"
              >
                {copiedText === 'artistName' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                )}
              </button>
            </div>

            {/* Music Director */}
            {song.musicDirector && (
              <div className="flex items-center justify-center md:justify-start space-x-2 mt-1.5 text-xs text-slate-400">
                <User className="w-3.5 h-3.5 text-fuchsia-400 flex-shrink-0" />
                <span>Music Director:</span>
                <span className="text-slate-200 font-semibold">{song.musicDirector}</span>
              </div>
            )}

            {/* Duration & Quality Badges */}
            <div className="flex items-center justify-center md:justify-start flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
              <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-800 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-violet-400" />
                <span>Duration: {song.durationFormatted || 'Full Track'}</span>
              </div>

              <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                <Zap className="w-3 h-3 text-amber-400 fill-current" />
                <span>320 Kbps Full Audio</span>
              </div>

              <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                LRCLIB Synced
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center justify-center md:justify-start flex-wrap gap-3 pt-2">
            {/* Play Button */}
            <button
              type="button"
              onClick={() => onPlay(song)}
              disabled={isResolvingAudio}
              className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-white font-bold text-sm sm:text-base shadow-xl transform active:scale-[0.98] transition-all ${
                isResolvingAudio
                  ? 'bg-slate-700 cursor-wait opacity-80'
                  : 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 shadow-violet-900/40 hover:scale-[1.02]'
              }`}
            >
              {isResolvingAudio ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  <span>Fetching Full Audio...</span>
                </>
              ) : isPlaying ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Play Full Song</span>
                </>
              )}
            </button>

            {/* Full Song 320 Kbps Download Button (Automatic from backend, zero redirects) */}
            <button
              type="button"
              onClick={handleDownloadSong}
              disabled={isDownloadingSong}
              className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-950/40 transition transform active:scale-95"
              title="Download full song in 320 Kbps studio quality directly from backend"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingSong ? 'Downloading 320kbps...' : 'Download Full Song (320 Kbps)'}</span>
            </button>

            {/* Download Cover Artwork Button */}
            <button
              type="button"
              onClick={handleDownloadCover}
              disabled={isDownloadingCover}
              className="flex items-center space-x-1.5 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold transition"
              title="Download high-resolution cover image directly"
            >
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              <span>{isDownloadingCover ? 'Saving Cover...' : 'Download Cover'}</span>
            </button>

            {/* Spotify Canvas Video Button (1080p 60fps) */}
            <button
              type="button"
              onClick={() => setIsCanvasModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-950/40 border border-emerald-500/30 transition transform active:scale-95"
              title="Download official Spotify Canvas video in 1080p 60fps (~30s loop)"
            >
              <Film className="w-4 h-4 text-emerald-300" />
              <span>Spotify Canvas (1080p 60fps)</span>
            </button>

            {/* Copy Song Name Only Button */}
            <button
              type="button"
              onClick={handleCopySongName}
              className="flex items-center space-x-1.5 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold transition"
              title="Copy only the song name to clipboard"
            >
              {copiedText === 'songName' ? (
                <>
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Song Name Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-violet-400" />
                  <span>Copy Song Name</span>
                </>
              )}
            </button>

            {/* Copy Artist Name Only Button */}
            <button
              type="button"
              onClick={handleCopyArtistName}
              className="flex items-center space-x-1.5 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold transition"
              title="Copy only the artist name to clipboard"
            >
              {copiedText === 'artistName' ? (
                <>
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Artist Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-cyan-400" />
                  <span>Copy Artist</span>
                </>
              )}
            </button>

            {/* Add to Queue */}
            <button
              type="button"
              onClick={() => onAddToQueue(song)}
              className="flex items-center space-x-1.5 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold transition"
            >
              {isQueued ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">In Queue</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add to Queue</span>
                </>
              )}
            </button>

            {/* Jump to Lyrics */}
            <button
              type="button"
              onClick={onScrollToLyrics}
              className="flex items-center space-x-1.5 px-4 py-3 rounded-2xl bg-violet-950/60 hover:bg-violet-900/60 border border-violet-800/60 text-violet-300 text-sm font-semibold transition"
            >
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>Lyrics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Spotify Canvas Downloader Modal */}
      <SpotifyCanvasModal
        isOpen={isCanvasModalOpen}
        onClose={() => setIsCanvasModalOpen(false)}
        initialSong={song}
      />
    </div>
  );
}
