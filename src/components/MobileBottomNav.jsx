import React from 'react';
import { Home, Disc3, Sparkles, HelpCircle } from 'lucide-react';

export default function MobileBottomNav({
  activeTab = 'songs', // 'songs' | 'albums' | 'lyrics'
  onTabChange,
  onOpenAbout,
  hasSelectedSong = false
}) {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 shadow-2xl px-2 py-1.5 transition-all">
      <div className="flex items-center justify-around text-[10px] font-semibold text-slate-400">
        {/* Songs Tab */}
        <button
          type="button"
          onClick={() => onTabChange('songs')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
            activeTab === 'songs' ? 'text-cyan-400 bg-cyan-950/40' : 'hover:text-slate-200'
          }`}
        >
          <Home className="w-4 h-4 mb-0.5" />
          <span>Songs</span>
        </button>

        {/* Albums Tab */}
        <button
          type="button"
          onClick={() => onTabChange('albums')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
            activeTab === 'albums' ? 'text-violet-400 bg-violet-950/40' : 'hover:text-slate-200'
          }`}
        >
          <Disc3 className="w-4 h-4 mb-0.5" />
          <span>Albums</span>
        </button>

        {/* Synced Lyrics Tab */}
        <button
          type="button"
          onClick={() => onTabChange('lyrics')}
          disabled={!hasSelectedSong}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
            !hasSelectedSong
              ? 'opacity-40 cursor-not-allowed'
              : activeTab === 'lyrics'
              ? 'text-fuchsia-400 bg-fuchsia-950/40'
              : 'hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 mb-0.5" />
          <span>Lyrics</span>
        </button>

        {/* Info & About */}
        <button
          type="button"
          onClick={onOpenAbout}
          className="flex flex-col items-center py-1 px-3 rounded-xl hover:text-slate-200 transition"
        >
          <HelpCircle className="w-4 h-4 mb-0.5" />
          <span>Info</span>
        </button>
      </div>
    </nav>
  );
}
