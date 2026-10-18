import React from 'react';
import { Music2, Disc3, Sparkles, Radio, HelpCircle } from 'lucide-react';

export default function Navbar({ onOpenAbout, activeTab = 'songs', onTabChange }) {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div
          onClick={() => onTabChange?.('songs')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-cyan-400 p-[2px] shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Music2 className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                TAMIL TUNES
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                LRC SYNC
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Song Finder • Synced Lyrics • Album Showcase
            </p>
          </div>
        </div>

        {/* Desktop Navigation Tabs (Songs vs Albums) */}
        {onTabChange && (
          <div className="hidden sm:flex items-center space-x-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => onTabChange('songs')}
              className={`px-4 py-1.5 rounded-xl font-semibold transition ${
                activeTab === 'songs'
                  ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Songs
            </button>
            <button
              type="button"
              onClick={() => onTabChange('albums')}
              className={`px-4 py-1.5 rounded-xl font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'albums'
                  ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span>Albums & Movies</span>
            </button>
          </div>
        )}

        {/* Actions / Info */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>தமிழ் / English</span>
          </div>

          <button
            onClick={onOpenAbout}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
            title="About and Compliance Information"
          >
            <HelpCircle className="w-4 h-4 text-violet-400" />
            <span className="hidden sm:inline">Info & Sources</span>
          </button>
        </div>

      </div>
    </header>
  );
}
