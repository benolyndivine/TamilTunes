import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Film,
  Sparkles,
  ExternalLink,
  Clipboard,
  CheckCheck,
  Disc3,
  Play,
  Pause,
  Maximize2,
  AlertCircle,
  Flame,
  Radio,
  Music
} from 'lucide-react';
import {
  fetchSpotifyCanvas,
  extractSpotifyTrackId,
  VERIFIED_CANVAS_DEMOS,
  findKnownCanvas
} from '../services/canvasService';
import { downloadCanvasVideo } from '../utils/downloadHelper';

export default function SpotifyCanvasModal({
  isOpen,
  onClose,
  initialSong = null
}) {
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canvasData, setCanvasData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoFitMode, setVideoFitMode] = useState('contain');
  const [copiedLink, setCopiedLink] = useState(false);

  const videoRef = useRef(null);

  // Initialize with initial song if provided
  useEffect(() => {
    if (!isOpen) return;

    setCanvasData(null);
    setErrorMessage(null);
    setDownloadSuccess(false);

    if (initialSong) {
      // 1. Check if song matches verified canvas database
      const known = findKnownCanvas(initialSong.title, initialSong.artist, initialSong.album);
      if (known) {
        const directUrl = `https://open.spotify.com/track/${known.trackId}`;
        setInputUrl(directUrl);
        handleResolve(directUrl, initialSong.title, initialSong.artist);
      } else {
        // 2. Check if song has a direct spotify track URL
        const directSpotify = initialSong.externalUrls?.spotify || '';
        if (directSpotify.includes('/track/')) {
          setInputUrl(directSpotify);
          handleResolve(directSpotify, initialSong.title, initialSong.artist);
        } else {
          setInputUrl('');
          // Attempt search by title & artist
          handleResolve('', initialSong.title, initialSong.artist);
        }
      }
    } else {
      // Load a default popular demo
      const demo = VERIFIED_CANVAS_DEMOS[0];
      setInputUrl(demo.spotifyUrl);
      handleResolve(demo.spotifyUrl, demo.title, demo.artist);
    }
  }, [isOpen, initialSong]);

  const handleResolve = async (customUrl, customTitle = '', customArtist = '') => {
    const target = (customUrl !== undefined ? customUrl : inputUrl).trim();
    const title = customTitle || initialSong?.title || '';
    const artist = customArtist || initialSong?.artist || '';

    setIsLoading(true);
    setErrorMessage(null);
    setCanvasData(null);
    setDownloadSuccess(false);

    try {
      const res = await fetchSpotifyCanvas({
        url: target,
        trackId: extractSpotifyTrackId(target) || '',
        title,
        artist,
        album: initialSong?.album || ''
      });

      if (res.success && res.canvasUrl) {
        setCanvasData(res);
        setIsPlaying(true);
      } else {
        setErrorMessage(
          res.error || 'No Spotify Canvas video found for this song. Some songs on Spotify do not have a Canvas uploaded by the artist.'
        );
      }
    } catch (err) {
      setErrorMessage('Failed to connect to Canvas resolver. Please verify the Spotify link and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Paste from clipboard helper
  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const trimmed = text.trim();
          setInputUrl(trimmed);
          handleResolve(trimmed);
        }
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  // Download 1080p 60fps MP4
  const handleDownload = async () => {
    if (!canvasData?.canvasUrl || isDownloading) return;

    setIsDownloading(true);
    setDownloadSuccess(false);

    const titleToUse = initialSong?.title || canvasData.title || 'Track';

    try {
      const res = await downloadCanvasVideo(canvasData.canvasUrl, titleToUse);
      if (res && res.success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3500);
      }
    } catch (err) {
      console.error('Download canvas error:', err);
    } finally {
      setTimeout(() => setIsDownloading(false), 1200);
    }
  };

  // Toggle video playback
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Open video in fullscreen
  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    } else if (videoRef.current.webkitRequestFullscreen) {
      videoRef.current.webkitRequestFullscreen();
    }
  };

  if (!isOpen) return null;

  const currentDisplayTitle = initialSong?.title || canvasData?.title || 'Spotify Track';
  const currentDisplayArtist = initialSong?.artist || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-2xl overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-violet-950/50 overflow-hidden my-auto">
        
        {/* Glow ambient header decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner">
              <Film className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Spotify Canvas Downloader
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  1080p • 60 FPS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official high-definition 9:16 looping canvas video (~30s format)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6">

          {/* Active Song Banner */}
          {initialSong && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs">
              <div className="flex items-center space-x-3 min-w-0">
                {initialSong.artworkUrl && (
                  <img
                    src={initialSong.artworkUrl}
                    alt={initialSong.title}
                    className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                  />
                )}
                <div className="truncate">
                  <p className="font-bold text-white truncate">{initialSong.title}</p>
                  <p className="text-slate-400 truncate">{initialSong.artist}</p>
                </div>
              </div>

              <a
                href={`https://open.spotify.com/search/${encodeURIComponent(initialSong.title + ' ' + (initialSong.artist || ''))}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition flex-shrink-0 ml-2"
                title="Search this song on Spotify to copy link"
              >
                <span>Find on Spotify</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Link Input Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Paste Spotify Track Link or Track ID</span>
              <span className="text-[11px] text-slate-400">e.g. open.spotify.com/track/...</span>
            </label>

            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleResolve()}
                  placeholder="Paste Spotify track link (e.g. open.spotify.com/track/...)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs sm:text-sm text-slate-100 placeholder-slate-600 transition outline-none"
                />
              </div>

              {/* Paste Button */}
              <button
                type="button"
                onClick={handlePaste}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition flex-shrink-0"
                title="Paste from clipboard"
              >
                <Clipboard className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Paste</span>
              </button>

              {/* Fetch Button */}
              <button
                type="button"
                onClick={() => handleResolve()}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 flex items-center space-x-1.5 transition disabled:opacity-50 flex-shrink-0"
              >
                {isLoading ? (
                  <>
                    <Disc3 className="w-4 h-4 animate-spin" />
                    <span>Resolving...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Get 1080p Canvas</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Demo Chips */}
          <div className="flex items-center space-x-2 text-xs overflow-x-auto pb-1 text-slate-400 scrollbar-none">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1 flex-shrink-0">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Sample Canvases:</span>
            </span>
            {VERIFIED_CANVAS_DEMOS.map((demo) => (
              <button
                key={demo.trackId}
                type="button"
                onClick={() => {
                  setInputUrl(demo.spotifyUrl);
                  handleResolve(demo.spotifyUrl, demo.title, demo.artist);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 hover:text-slate-200 border border-slate-700/60 text-[11px] transition whitespace-nowrap flex-shrink-0"
              >
                {demo.title} • {demo.artist}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start space-x-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs animate-in fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">Canvas Unavailable for this Track</p>
                <p className="mt-0.5 text-amber-300/80 leading-relaxed">{errorMessage}</p>
                <p className="mt-2 text-slate-400">
                  Tip: Spotify Canvases are short looping vertical videos created for select tracks. If this specific track doesn't have one on Spotify, try pasting another song from the Spotify mobile app (Share → Copy link).
                </p>
              </div>
            </div>
          )}

          {/* Canvas Video Preview Player Container */}
          {canvasData && (
            <div className="flex flex-col lg:flex-row items-center gap-6 p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              
              {/* 432 x 380 px Video Display Container */}
              <div
                className="relative rounded-2xl overflow-hidden bg-black shadow-2xl shadow-emerald-950/40 border border-slate-700/80 group flex-shrink-0 flex items-center justify-center mx-auto"
                style={{ width: '432px', height: '380px', maxWidth: '100%' }}
              >
                {/* Ambient Blurred Video Background to Gracefully Fill 432x380 px */}
                <video
                  src={canvasData.canvasUrl}
                  loop
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-110 pointer-events-none"
                />

                {/* Main 1080p 60fps Video fitted in 432x380 px */}
                <video
                  ref={videoRef}
                  src={canvasData.canvasUrl}
                  loop
                  autoPlay
                  playsInline
                  muted
                  className={`relative z-10 w-full h-full ${videoFitMode === 'contain' ? 'object-contain' : 'object-cover'} cursor-pointer`}
                  onClick={togglePlay}
                />

                {/* Overlaid Play/Pause Button on Hover */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="absolute inset-0 z-20 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                >
                  <div className="p-3.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-600 shadow-xl">
                    {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current translate-x-0.5" />}
                  </div>
                </button>

                {/* Quality & 432x380 Dimension Badge Overlay */}
                <div className="absolute top-3 left-3 z-20 flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-bold text-emerald-300 border border-emerald-500/30 shadow-md">
                  <Film className="w-3.5 h-3.5 text-emerald-400" />
                  <span>432 × 380 • 1080p 60FPS</span>
                </div>

                {/* Fit Mode Toggle & Fullscreen Controls */}
                <div className="absolute bottom-3 right-3 z-20 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setVideoFitMode(prev => prev === 'contain' ? 'cover' : 'contain')}
                    className="px-2.5 py-1 rounded-lg bg-black/70 hover:bg-slate-800 backdrop-blur-md text-slate-200 text-[11px] font-semibold border border-slate-700 transition"
                    title={videoFitMode === 'contain' ? 'Switch to Fill/Cover 432x380' : 'Switch to Fit/Contain in 432x380'}
                  >
                    {videoFitMode === 'contain' ? 'Fit (Contain)' : 'Fill (Cover)'}
                  </button>
                  <button
                    type="button"
                    onClick={handleFullscreen}
                    className="p-1.5 rounded-lg bg-black/70 backdrop-blur-md text-slate-300 hover:text-white border border-slate-700 transition"
                    title="Fullscreen preview"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Canvas Metadata & Download Actions */}
              <div className="flex-1 space-y-4 text-center lg:text-left min-w-0 w-full">
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Canvas Video Ready</span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {currentDisplayTitle}
                  </h4>
                  {currentDisplayArtist && (
                    <p className="text-sm text-slate-400 mt-0.5">{currentDisplayArtist}</p>
                  )}
                </div>

                {/* Canvas Specifications Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Resolution</span>
                    <span className="font-bold text-white">1080 × 1920 (Full HD)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Frame Rate</span>
                    <span className="font-bold text-emerald-400">60 FPS Ultra-Smooth</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Duration</span>
                    <span className="font-bold text-white">Seamless Loop (~30s)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Format</span>
                    <span className="font-bold text-cyan-400">MP4 (9:16 Vertical)</span>
                  </div>
                </div>

                {/* Download Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 flex items-center justify-center space-x-2 transition transform active:scale-95 disabled:opacity-60"
                  >
                    {isDownloading ? (
                      <>
                        <Disc3 className="w-5 h-5 animate-spin" />
                        <span>Downloading 1080p Canvas Video...</span>
                      </>
                    ) : downloadSuccess ? (
                      <>
                        <CheckCheck className="w-5 h-5 text-white" />
                        <span>Canvas Video Downloaded!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        <span>Download 1080p Canvas (MP4)</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Downloaded as high-resolution MP4. Perfect for Instagram Reels, WhatsApp status, TikTok & wallpapers.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>High-Speed Direct CDN Download (No quality compression)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
