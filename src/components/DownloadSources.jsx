import React, { useState } from 'react';
import { Download, ExternalLink, ShieldCheck, AlertCircle, Disc3, Radio, Sparkles, CheckCircle2, CheckCheck } from 'lucide-react';
import { downloadSongFile } from '../utils/downloadHelper';

export default function DownloadSources({
  sourcesData,
  isLoading,
  error,
  selectedSong
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'community' | 'official'
  const [downloadingId, setDownloadingId] = useState(null);

  const communitySources = sourcesData?.communitySources || [];
  const officialSources = sourcesData?.officialSources || [];

  const filteredSources = activeTab === 'all'
    ? [...communitySources, ...officialSources]
    : activeTab === 'community'
    ? communitySources
    : officialSources;

  // Direct backend song download in full 320kbps without redirect
  const handleDirectDownload = async (source) => {
    setDownloadingId(source.id);
    try {
      await downloadSongFile(selectedSong);
    } catch (err) {
      console.error('Source download error:', err);
    } finally {
      setTimeout(() => {
        setDownloadingId(null);
      }, 1500);
    }
  };

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-bold text-white text-base sm:text-lg">Download & Streaming Sources</h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase border border-emerald-500/30">
              Direct Backend Download
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Results for <span className="text-slate-200 font-semibold">{selectedSong?.title || 'Selected Track'}</span>
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-950/60 border border-slate-800 self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'all' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({communitySources.length + officialSources.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('community')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'community' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Requested Sites ({communitySources.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('official')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'official' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Official ({officialSources.length})
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 animate-pulse space-y-2">
              <div className="h-4 bg-slate-700/60 rounded w-1/3"></div>
              <div className="h-3 bg-slate-700/40 rounded w-2/3"></div>
              <div className="h-8 bg-slate-700/50 rounded-xl w-full mt-3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2">
          <AlertCircle className="w-5 h-5 text-amber-400 mx-auto" />
          <p className="text-xs text-amber-200">Unable to retrieve some source links at this moment.</p>
        </div>
      )}

      {/* Results List */}
      {!isLoading && filteredSources.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredSources.map((source) => {
            const isOfficial = source.sourceType === 'official';
            const isDownloading = downloadingId === source.id;

            return (
              <div
                key={source.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isOfficial
                    ? 'bg-slate-950/70 border-violet-900/40 hover:border-violet-700/60'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top Row: Provider Name & Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-white">{source.providerName}</span>
                      {isOfficial && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" title="Authorized Licensed Service" />
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isOfficial
                          ? 'bg-violet-500/10 text-violet-300 border-violet-500/20'
                          : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                      }`}
                    >
                      {source.badge}
                    </span>
                  </div>

                  {/* Matching Song Title & Movie */}
                  <p className="text-xs font-medium text-slate-200 line-clamp-1">
                    {source.matchingTitle}
                  </p>

                  {source.movieOrAlbum && (
                    <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-0.5">
                      <Disc3 className="w-3 h-3 text-slate-500" />
                      <span className="truncate">{source.movieOrAlbum}</span>
                    </div>
                  )}

                  {/* Audio Quality & Status */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-slate-800/80">
                    <span className="font-medium text-slate-300">Quality: {source.audioQuality}</span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{source.statusNote}</span>
                  </div>
                </div>

                {/* Direct Download Button (NO Redirects) + Optional Source Link */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center gap-2">
                  {/* Direct Download Button */}
                  <button
                    type="button"
                    onClick={() => handleDirectDownload(source)}
                    disabled={isDownloading}
                    className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition"
                    title="Automatically download full song in 320 Kbps directly from backend"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isDownloading ? 'Downloading...' : `Download 320 Kbps MP3`}</span>
                  </button>

                  {/* Open Source Button */}
                  <a
                    href={source.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition"
                    title={`Open search directory on ${source.providerName}`}
                  >
                    <span>Visit</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compliance Notice */}
      <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Automatic Direct Downloads</span>
        </div>
        <p className="leading-relaxed">
          Downloads are securely processed directly by the backend proxy without redirecting you to external popups or third-party links.
        </p>
      </div>
    </div>
  );
}
