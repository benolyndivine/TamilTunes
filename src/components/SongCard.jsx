import React, { useState } from 'react';
import { Play, Pause, Disc3, Plus, Check, Clock, Radio, Music, Download, Copy, CheckCheck, Image as ImageIcon } from 'lucide-react';
import { extractSongDetails } from '../utils/matchSong';
import { resolveSongAudio } from '../services/musicMetadata';

export default function SongCard({
  song,
  isSelected,
  isPlaying,
  onSelect,
  onPlay,
  onAddToQueue,
  isQueued
}) {
  const [imageError, setImageError] = useState(false);
  const [justQueued, setJustQueued] = useState(false);
  const [copiedField, setCopiedField] = useState(null); // 'title' | 'artist'
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingCover, setIsDownloadingCover] = useState(false);

  const { title: cleanTitle, movie } = extractSongDetails(song.title);
  const displayAlbum = movie || song.album || '';
  const displayTitle = cleanTitle || song.title;

  const handleQueueClick = (e) => {
    e.stopPropagation();
    onAddToQueue(song);
    setJustQueued(true);
    setTimeout(() => setJustQueued(false), 1500);
  };

  const handlePlayClick = (e) => {
    e.stopPropagation();
    onPlay(song);
  };

  const handleCopyTitleClick = (e) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(displayTitle);
      setCopiedField('title');
      setTimeout(() => setCopiedField(null), 1500);
    }
  };

  const handleCopyArtistClick = (e) => {
    e.stopPropagation();
    if (song.artist && navigator.clipboard) {
      navigator.clipboard.writeText(song.artist);
      setCopiedField('artist');
      setTimeout(() => setCopiedField(null), 1500);
    }
  };

  const handleDownloadClick = async (e) => {
    e.stopPropagation();
    setIsDownloading(true);

    try {
      let targetUrl = song.downloadUrl || (song.isFullAudio ? song.audioUrl : '');

      if (!targetUrl || targetUrl.includes('preview') || targetUrl.includes('apple.com') || targetUrl.includes('mzstatic.com')) {
        try {
          const resolved = await resolveSongAudio(displayTitle, song.artist, displayAlbum);
          if (resolved && resolved.url) {
            targetUrl = resolved.url;
          }
        } catch (err) {
          console.warn('Resolve error during card download:', err);
        }
      }

      const cleanFilename = `${displayTitle.replace(/[<>:"/\\|?*]/g, '')} (320kbps).mp3`;

      // 1. Direct High-Speed Blob Download
      if (targetUrl && (targetUrl.includes('saavncdn.com') || targetUrl.includes('_320.mp4'))) {
        try {
          const cdnRes = await fetch(targetUrl);
          if (cdnRes.ok) {
            const blob = await cdnRes.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = cleanFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            return;
          }
        } catch (fetchErr) {
          console.warn('Direct CDN fetch failed in card, falling back to download endpoint:', fetchErr);
        }
      }

      // 2. Fallback to /api/download/song
      const downloadEndpoint = `/api/download/song?audioUrl=${encodeURIComponent(targetUrl || '')}&title=${encodeURIComponent(displayTitle)}&artist=${encodeURIComponent(song.artist || '')}&album=${encodeURIComponent(displayAlbum || '')}`;

      const link = document.createElement('a');
      link.href = downloadEndpoint;
      link.setAttribute('download', cleanFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('SongCard download error:', err);
    } finally {
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  const handleDownloadCoverClick = async (e) => {
    e.stopPropagation();
    if (!song.artworkUrl) return;

    setIsDownloadingCover(true);
    const cleanFilename = `${displayTitle.replace(/[<>:"/\\|?*]/g, '')} - Cover.jpg`;

    try {
      let blob = null;
      try {
        const directRes = await fetch(song.artworkUrl, { mode: 'cors' });
        if (directRes.ok) blob = await directRes.blob();
      } catch (err) {}

      if (!blob) {
        try {
          const artworkEndpoint = `/api/download/artwork?url=${encodeURIComponent(song.artworkUrl)}&title=${encodeURIComponent(displayTitle)}`;
          const proxyRes = await fetch(artworkEndpoint);
          if (proxyRes.ok) blob = await proxyRes.blob();
        } catch (err) {}
      }

      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.setAttribute('download', cleanFilename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      } else {
        window.open(song.artworkUrl, '_blank');
      }
    } catch (err) {
      window.open(song.artworkUrl, '_blank');
    } finally {
      setIsDownloadingCover(false);
    }
  };

  return (
    <div
      onClick={() => onSelect(song)}
      className={`group relative flex flex-col p-3 rounded-2xl transition-all duration-300 cursor-pointer border ${
        isSelected
          ? 'bg-slate-800/95 border-violet-500 shadow-xl shadow-violet-500/10 ring-1 ring-violet-500/50'
          : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700'
      }`}
    >
      {/* Artwork Container (Square Aspect Ratio) */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-950 shadow-md mb-3 flex-shrink-0">
        {!imageError && song.artworkUrl ? (
          <img
            src={song.artworkUrl}
            alt={`${song.title} cover artwork`}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-slate-600">
            <Music className="w-12 h-12 text-slate-700 animate-pulse" />
            <span className="text-[10px] text-slate-500 mt-1">Artwork Unavailable</span>
          </div>
        )}

        {/* Play/Pause Hover Overlay */}
        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <button
            type="button"
            onClick={handlePlayClick}
            className="w-12 h-12 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-400/30 transform group-hover:scale-100 scale-75 transition-all"
            title={isPlaying && isSelected ? 'Pause' : 'Play song preview'}
          >
            {isPlaying && isSelected ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            )}
          </button>
        </div>

        {/* Duration Badge */}
        {song.durationFormatted && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-[11px] font-semibold text-slate-300 flex items-center space-x-1">
            <Clock className="w-3 h-3 text-violet-400" />
            <span>{song.durationFormatted}</span>
          </div>
        )}

        {/* Source Badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-[10px] font-medium text-slate-300 flex items-center space-x-1 border border-slate-800">
          <Radio className="w-2.5 h-2.5 text-cyan-400" />
          <span>{song.source || 'Tamil'}</span>
        </div>
      </div>

      {/* Song Metadata */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-1">
            <h3
              className={`font-semibold text-sm line-clamp-1 group-hover:text-cyan-300 transition-colors ${
                isSelected ? 'text-cyan-300 font-bold' : 'text-white'
              }`}
              title={song.title}
            >
              {displayTitle}
            </h3>

            <button
              type="button"
              onClick={handleCopyTitleClick}
              className="p-1 text-slate-500 hover:text-slate-300 flex-shrink-0"
              title="Copy song name"
            >
              {copiedField === 'title' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center justify-between gap-1 mt-0.5">
            <p className="text-xs text-slate-400 line-clamp-1" title={song.artist}>
              {song.artist}
            </p>
            <button
              type="button"
              onClick={handleCopyArtistClick}
              className="p-0.5 text-slate-500 hover:text-cyan-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Copy artist name"
            >
              {copiedField === 'artist' ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400 hover:text-cyan-400" />}
            </button>
          </div>

          {displayAlbum && (
            <div className="flex items-center space-x-1 mt-1 text-[11px] text-slate-400 line-clamp-1">
              <Disc3 className="w-3 h-3 text-violet-400 flex-shrink-0" />
              <span className="truncate">{displayAlbum}</span>
              {song.year && <span>• {song.year}</span>}
            </div>
          )}
        </div>

        {/* Card Actions */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onSelect(song)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
              isSelected
                ? 'bg-violet-600 text-white'
                : 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700'
            }`}
          >
            {isSelected ? 'Viewing' : 'Select'}
          </button>

          <div className="flex items-center space-x-1">
            {/* Quick Cover Download Button */}
            {song.artworkUrl && (
              <button
                type="button"
                onClick={handleDownloadCoverClick}
                disabled={isDownloadingCover}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                title="Download cover artwork"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Quick Direct Download Button */}
            {(song.audioUrl || song.downloadUrl) && (
              <button
                type="button"
                onClick={handleDownloadClick}
                disabled={isDownloading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                title="Download full 320kbps song directly"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Queue Button */}
            <button
              type="button"
              onClick={handleQueueClick}
              disabled={justQueued || isQueued}
              className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-cyan-300 p-1.5 rounded-lg hover:bg-slate-800 transition"
              title="Add to player queue"
            >
              {justQueued || isQueued ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Queued</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Queue</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
