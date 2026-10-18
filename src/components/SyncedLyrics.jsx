import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  FileText,
  Upload,
  Volume2,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Plus,
  Minus,
  Crosshair,
  Copy,
  Check,
  CheckCheck,
  Download
} from 'lucide-react';
import { parseLrc } from '../utils/parseLrc';
import { useSyncedLyrics } from '../hooks/useSyncedLyrics';
import { formatTime } from '../utils/formatTime';

export default function SyncedLyrics({
  lyricsData,
  isLoading,
  error,
  currentTime = 0,
  isPlaying = false,
  onSeek,
  onRetry,
  trackTitle = '',
  artistName = ''
}) {
  const [customLrcText, setCustomLrcText] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOffsetControls, setShowOffsetControls] = useState(false);
  const [copiedMode, setCopiedMode] = useState(null); // 'plain' | 'lrc' | 'line'
  const [copiedLineIndex, setCopiedLineIndex] = useState(null);

  // Copy full lyrics (plain text without timestamps)
  const handleCopyPlainLyrics = (e) => {
    e?.stopPropagation();
    if (!parsedLines || parsedLines.length === 0) return;
    const textToCopy = parsedLines.map(line => line.text).join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopiedMode('plain');
        setTimeout(() => setCopiedMode(null), 2000);
      });
    }
  };

  // Copy timestamped synced LRC format
  const handleCopySyncedLrc = (e) => {
    e?.stopPropagation();
    if (customLrcText) {
      navigator.clipboard?.writeText(customLrcText).then(() => {
        setCopiedMode('lrc');
        setTimeout(() => setCopiedMode(null), 2000);
      });
      return;
    }

    if (lyricsData?.syncedLyrics) {
      navigator.clipboard?.writeText(lyricsData.syncedLyrics).then(() => {
        setCopiedMode('lrc');
        setTimeout(() => setCopiedMode(null), 2000);
      });
      return;
    }

    // Build timestamped LRC from parsed lines
    const lrcLines = parsedLines.map(l => {
      const min = Math.floor(l.time / 60);
      const sec = Math.floor(l.time % 60);
      const ms = Math.floor((l.time % 1) * 100);
      const timeTag = `[${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}]`;
      return `${timeTag} ${l.text}`;
    }).join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(lrcLines).then(() => {
        setCopiedMode('lrc');
        setTimeout(() => setCopiedMode(null), 2000);
      });
    }
  };

  // Copy single lyric line
  const handleCopySingleLine = (e, text, index) => {
    e?.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedLineIndex(index);
        setTimeout(() => setCopiedLineIndex(null), 1500);
      });
    }
  };

  // Parse lyrics from either API lyricsData or custom pasted text
  const activeLrcContent = useMemo(() => {
    if (customLrcText) return customLrcText;
    if (!lyricsData) return null;
    return lyricsData.syncedLyrics || lyricsData.plainLyrics || null;
  }, [lyricsData, customLrcText]);

  const { lines: parsedLines, isSynced } = useMemo(() => {
    return parseLrc(activeLrcContent);
  }, [activeLrcContent]);

  const {
    activeIndex,
    activeLine,
    lineProgress,
    effectiveTime,
    timeOffset,
    nudgeOffset,
    calibrateToLine,
    resetOffset,
    containerRef,
    autoScroll,
    resumeAutoScroll,
    handleUserScroll
  } = useSyncedLyrics(parsedLines, currentTime, isSynced);

  const handleLineClick = (line, idx) => {
    if (isSynced && typeof onSeek === 'function') {
      // Seek to target line minus offset
      const targetAudioTime = Math.max(0, line.time - timeOffset);
      onSeek(targetAudioTime);
      resumeAutoScroll();
    }
  };

  const handleApplyCustomLyrics = (e) => {
    e.preventDefault();
    setShowCustomModal(false);
  };

  const handleResetLyrics = () => {
    setCustomLrcText('');
  };

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300">
      
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2 bg-slate-950/40">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center border border-violet-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-white text-base sm:text-lg">Synchronized Lyrics</h2>
              {isSynced && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                  Live Timestamped
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {lyricsData?.source || 'Powered by LRCLIB Open Lyrics API'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Calibrate / Offset Controls Toggle */}
          {isSynced && (
            <button
              type="button"
              onClick={() => setShowOffsetControls(!showOffsetControls)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center space-x-1 border ${
                timeOffset !== 0
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title="Calibrate timing offset if audio leads or lags"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Timing {timeOffset !== 0 ? `(${timeOffset > 0 ? `+${timeOffset}` : timeOffset}s)` : 'Sync'}</span>
            </button>
          )}

          {/* Auto scroll status indicator */}
          {isSynced && (
            <button
              type="button"
              onClick={resumeAutoScroll}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center space-x-1 ${
                autoScroll
                  ? 'bg-violet-950/60 text-violet-300 border border-violet-800/60'
                  : 'bg-amber-950/60 text-amber-300 border border-amber-800/60 animate-pulse'
              }`}
              title={autoScroll ? 'Auto-scroll is active' : 'Click to resume auto-scroll'}
            >
              <span>{autoScroll ? 'Scroll: ON' : 'Paused'}</span>
            </button>
          )}

          {/* Copy Plain Lyrics Button */}
          {parsedLines.length > 0 && (
            <button
              type="button"
              onClick={handleCopyPlainLyrics}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center space-x-1 border ${
                copiedMode === 'plain'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
              title="Copy all lyrics as clean plain text"
            >
              {copiedMode === 'plain' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Copy Lyrics</span>
                </>
              )}
            </button>
          )}

          {/* Copy Synced LRC (with timestamps) Button */}
          {parsedLines.length > 0 && isSynced && (
            <button
              type="button"
              onClick={handleCopySyncedLrc}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center space-x-1 border ${
                copiedMode === 'lrc'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
              title="Copy synchronized timestamped LRC format [mm:ss.xx]"
            >
              {copiedMode === 'lrc' ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">LRC Copied!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-violet-400" />
                  <span>Copy .LRC</span>
                </>
              )}
            </button>
          )}

          {/* Download Synced .LRC File Button */}
          {parsedLines.length > 0 && isSynced && (
            <button
              type="button"
              onClick={() => {
                const content = lyricsData?.syncedLyrics || parsedLines.map(l => {
                  const min = Math.floor(l.time / 60);
                  const sec = Math.floor(l.time % 60);
                  const ms = Math.floor((l.time % 1) * 100);
                  return `[${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}] ${l.text}`;
                }).join('\n');

                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${trackTitle || 'lyrics'} - Synced.lrc`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center space-x-1 border bg-slate-800 text-slate-300 border-slate-700 hover:text-emerald-300 hover:bg-slate-700"
              title="Download synchronized lyrics as .lrc file"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save .LRC</span>
            </button>
          )}

          {/* Paste / Custom Lyrics Button */}
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Paste or import custom LRC lyrics"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          {/* Expand / Collapse Height Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Timing Offset Calibration Bar */}
      {isSynced && showOffsetControls && (
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <Crosshair className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold">Timing Calibration:</span>
            <span className="font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
              {timeOffset > 0 ? `+${timeOffset.toFixed(1)}` : timeOffset.toFixed(1)}s
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => nudgeOffset(-0.5)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center space-x-0.5 transition"
              title="Lyrics appear too early? Delay by 0.5s"
            >
              <Minus className="w-3 h-3" />
              <span>0.5s</span>
            </button>

            <button
              type="button"
              onClick={() => nudgeOffset(0.5)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center space-x-0.5 transition"
              title="Lyrics appear too late? Advance by 0.5s"
            >
              <Plus className="w-3 h-3" />
              <span>0.5s</span>
            </button>

            {timeOffset !== 0 && (
              <button
                type="button"
                onClick={resetOffset}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 flex items-center space-x-1 transition"
                title="Reset timing offset to zero"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Custom Lyrics Paste Modal */}
      {showCustomModal && (
        <div className="p-4 bg-slate-950/90 border-b border-slate-800">
          <form onSubmit={handleApplyCustomLyrics} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Paste LRC or Plain Lyrics Text:</span>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Close
              </button>
            </div>
            <textarea
              rows={4}
              value={customLrcText}
              onChange={(e) => setCustomLrcText(e.target.value)}
              placeholder="Paste [00:12.50] Lyric line... or plain lyrics here"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            />
            <div className="flex items-center justify-between">
              {customLrcText && (
                <button
                  type="button"
                  onClick={handleResetLyrics}
                  className="text-xs text-red-400 hover:underline"
                >
                  Reset to API Lyrics
                </button>
              )}
              <button
                type="submit"
                className="ml-auto px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs"
              >
                Apply Custom Lyrics
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Lyrics Display Body */}
      <div
        ref={containerRef}
        onScroll={handleUserScroll}
        className={`relative p-4 sm:p-6 overflow-y-auto space-y-3 scroll-smooth text-center select-text ${
          isExpanded ? 'h-[550px]' : 'h-[360px] sm:h-[420px]'
        }`}
      >
        {/* Loading State */}
        {isLoading && (
          <div className="h-full flex flex-col items-center justify-center space-y-3 text-slate-400">
            <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
            <p className="text-sm">Fetching lyrics from LRCLIB database...</p>
          </div>
        )}

        {/* Error / 503 State */}
        {!isLoading && error && !parsedLines.length && (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Lyrics Temporarily Unavailable</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {error || 'LRCLIB server was busy or rate-limited. Click retry or paste your own lyrics.'}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Fetching Lyrics</span>
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && parsedLines.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Matching Lyrics Found</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              LRCLIB does not have verified lyrics for this track yet. You can paste custom LRC lyrics using the button above.
            </p>
          </div>
        )}

        {/* Lyrics Lines */}
        {!isLoading && parsedLines.length > 0 && (
          <div className="space-y-4 py-8">
            {parsedLines.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;

              return (
                <div
                  key={idx}
                  data-index={idx}
                  onClick={() => handleLineClick(line, idx)}
                  className={`relative transition-all duration-300 rounded-2xl px-4 py-2 cursor-pointer group ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600/30 via-fuchsia-600/30 to-cyan-500/30 text-white scale-[1.03] shadow-lg border border-violet-500/50 font-bold'
                      : isPast
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 font-normal'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    {/* Active playing indicator icon */}
                    {isActive && (
                      <span className="flex-shrink-0 text-cyan-400 animate-pulse">
                        <Volume2 className="w-4 h-4" />
                      </span>
                    )}

                    {/* Lyric text */}
                    <span className={`text-base sm:text-lg md:text-xl leading-relaxed ${
                      isActive ? 'text-cyan-200' : ''
                    }`}>
                      {line.text}
                    </span>

                    {/* Sync to this line button on hover */}
                    {isSynced && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          calibrateToLine(idx);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-cyan-400 hover:text-white ml-2 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 transition-opacity flex items-center space-x-1"
                        title="Calibrate timing so audio matches this line now"
                      >
                        <Crosshair className="w-2.5 h-2.5" />
                        <span>Sync Here</span>
                      </button>
                    )}

                    {/* Copy single line button on hover */}
                    <button
                      type="button"
                      onClick={(e) => handleCopySingleLine(e, line.text, idx)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-400 hover:text-cyan-300 ml-1.5 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 transition-opacity flex items-center space-x-1"
                      title="Copy this line"
                    >
                      {copiedLineIndex === idx ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {/* Timestamp badge */}
                    {isSynced && (
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] font-mono text-slate-400 ml-1 px-1.5 py-0.5 rounded bg-slate-800 transition-opacity">
                        {formatTime(line.time)}
                      </span>
                    )}
                  </div>

                  {/* Karaoke Progress Glow Bar on Active Line */}
                  {isActive && lineProgress > 0 && (
                    <div
                      className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full transition-all duration-100"
                      style={{ width: `${lineProgress}%`, margin: '0 auto' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lyrics Footer Info */}
      <div className="px-4 py-2.5 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
        <span className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          <span>Click any line to seek • Hover & click "Sync Here" to calibrate</span>
        </span>

        {timeOffset !== 0 && (
          <span className="text-cyan-300 font-mono">Offset active: {timeOffset > 0 ? `+${timeOffset}` : timeOffset}s</span>
        )}

        {lyricsData?.isFallback && (
          <span className="text-violet-400 font-medium">Verified Resilience Archive</span>
        )}
      </div>
    </div>
  );
}
