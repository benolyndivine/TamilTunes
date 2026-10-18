import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Repeat,
  Repeat1,
  Shuffle,
  ListMusic,
  Maximize2,
  Minimize2,
  Clock,
  Radio,
  Trash2,
  Music,
  X,
  AlertTriangle
} from 'lucide-react';
import { formatTime } from '../utils/formatTime';

export default function MusicPlayer({
  player,
  onOpenLyrics
}) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffled,
    isLoading,
    audioError,
    queue,
    togglePlay,
    seekTo,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    handleNext,
    handlePrev,
    playTrack,
    removeFromQueue,
    clearQueue
  } = player;

  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  // Sync scrub value with currentTime when not manually scrubbing
  useEffect(() => {
    if (!isScrubbing) {
      setScrubValue(currentTime);
    }
  }, [currentTime, isScrubbing]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight' && e.shiftKey) {
        handleNext();
      } else if (e.code === 'ArrowLeft' && e.shiftKey) {
        handlePrev();
      } else if (e.code === 'KeyM') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleNext, handlePrev, toggleMute]);

  if (!currentTrack) {
    return null;
  }

  const effectiveDuration = duration > 0 ? duration : (currentTrack.duration || 30);
  const progressPercent = effectiveDuration > 0 ? (scrubValue / effectiveDuration) * 100 : 0;

  const handleSeekChange = (e) => {
    const val = parseFloat(e.target.value);
    setScrubValue(val);
  };

  const handleSeekCommit = () => {
    setIsScrubbing(false);
    seekTo(scrubValue);
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <>
      {/* Persistent Bottom Bar */}
      <div className="fixed bottom-12 sm:bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 shadow-2xl transition-all">
        {/* Audio Error Alert Banner */}
        {audioError && (
          <div className="bg-amber-950/80 border-b border-amber-800/60 px-4 py-1.5 text-xs text-amber-200 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>{audioError}</span>
            </div>
            <button
              onClick={() => onOpenLyrics?.()}
              className="text-[11px] font-semibold underline hover:text-white"
            >
              View Sources & Lyrics
            </button>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-4">
          
          {/* Left Column: Track Info & Artwork */}
          <div className="flex items-center space-x-3 min-w-0 w-1/4 sm:w-1/3">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 shadow-md">
              {currentTrack.artworkUrl ? (
                <img
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Music className="w-6 h-6" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate" title={currentTrack.title}>
                {currentTrack.title}
              </h4>
              <p className="text-slate-400 text-[11px] truncate mt-0.5" title={currentTrack.artist}>
                {currentTrack.artist}
              </p>
              {currentTrack.audioType && (
                <span className="hidden lg:inline-block text-[9px] text-cyan-400 font-medium px-1.5 py-0.2 rounded bg-cyan-950/40 border border-cyan-800/40 mt-1">
                  {currentTrack.audioType}
                </span>
              )}
            </div>
          </div>

          {/* Center Column: Playback Controls & Progress Bar */}
          <div className="flex-1 max-w-xl flex flex-col items-center space-y-1.5">
            {/* Control Buttons */}
            <div className="flex items-center space-x-3 sm:space-x-5">
              {/* Shuffle */}
              <button
                type="button"
                onClick={toggleShuffle}
                className={`p-1.5 rounded-lg transition ${
                  isShuffled ? 'text-cyan-400 bg-cyan-950/50' : 'text-slate-400 hover:text-white'
                }`}
                title="Shuffle queue"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              {/* Prev */}
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white transition"
                title="Previous track"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              {/* Play / Pause Main Button */}
              <button
                type="button"
                onClick={togglePlay}
                disabled={isLoading}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-slate-200 text-slate-950 flex items-center justify-center shadow-lg shadow-white/10 transition-transform active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current translate-x-0.5" />
                )}
              </button>

              {/* Next */}
              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white transition"
                title="Next track"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>

              {/* Repeat Mode */}
              <button
                type="button"
                onClick={toggleRepeat}
                className={`p-1.5 rounded-lg transition ${
                  repeatMode !== 'off' ? 'text-violet-400 bg-violet-950/50' : 'text-slate-400 hover:text-white'
                }`}
                title={`Repeat mode: ${repeatMode}`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            </div>

            {/* Scrub Bar & Timestamps */}
            <div className="w-full flex items-center space-x-2 text-[11px] font-mono text-slate-400">
              <span className="w-9 text-right">{formatTime(scrubValue)}</span>

              <div className="relative flex-1 group py-1 flex items-center">
                <input
                  type="range"
                  min="0"
                  max={effectiveDuration}
                  step="0.1"
                  value={scrubValue}
                  onMouseDown={() => setIsScrubbing(true)}
                  onTouchStart={() => setIsScrubbing(true)}
                  onChange={handleSeekChange}
                  onMouseUp={handleSeekCommit}
                  onTouchEnd={handleSeekCommit}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #06b6d4 ${progressPercent}%, #334155 ${progressPercent}%)`
                  }}
                />
              </div>

              <span className="w-9">{formatTime(effectiveDuration)}</span>
            </div>
          </div>

          {/* Right Column: Volume & Queue Tools */}
          <div className="hidden sm:flex items-center justify-end space-x-3 w-1/4 sm:w-1/3">
            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={toggleMute}
                className="text-slate-400 hover:text-white transition p-1"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <VolumeIcon className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-400"
              />
            </div>

            {/* Queue Drawer Button */}
            <button
              type="button"
              onClick={() => setShowQueueDrawer(!showQueueDrawer)}
              className={`p-2 rounded-xl border transition relative ${
                showQueueDrawer
                  ? 'bg-violet-600 text-white border-violet-500'
                  : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
              }`}
              title="Toggle play queue"
            >
              <ListMusic className="w-4 h-4" />
              {queue.length > 1 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 text-slate-950 font-bold text-[9px] flex items-center justify-center">
                  {queue.length}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Slide-out Queue Management Drawer */}
      {showQueueDrawer && (
        <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 max-h-[460px] rounded-3xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6">
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center space-x-2">
              <ListMusic className="w-4 h-4 text-violet-400" />
              <h3 className="font-bold text-white text-xs sm:text-sm">Playback Queue ({queue.length})</h3>
            </div>
            <div className="flex items-center space-x-2">
              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={clearQueue}
                  className="text-[11px] text-slate-400 hover:text-red-400 flex items-center space-x-1"
                  title="Clear Queue"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowQueueDrawer(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40">
            {queue.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">Queue is currently empty</p>
            ) : (
              queue.map((track, idx) => {
                const isCurrent = track.id === currentTrack.id;
                return (
                  <div
                    key={`${track.id}-${idx}`}
                    className={`flex items-center justify-between p-2 rounded-xl transition cursor-pointer ${
                      isCurrent ? 'bg-violet-950/40 border border-violet-800/40' : 'hover:bg-slate-900'
                    }`}
                    onClick={() => playTrack(track)}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0">
                        {track.artworkUrl ? (
                          <img src={track.artworkUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-4 h-4 m-auto text-slate-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-cyan-300' : 'text-white'}`}>
                          {track.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {isCurrent && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(track.id);
                        }}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Remove from queue"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
