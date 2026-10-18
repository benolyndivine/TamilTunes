import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading({ message = 'Searching Tamil Songs & Retrieving Metadata...' }) {
  return (
    <div className="w-full space-y-6 py-6">
      <div className="flex items-center justify-center space-x-2.5 text-cyan-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-semibold">{message}</span>
      </div>

      {/* Grid of Skeleton Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
          <div
            key={item}
            className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 animate-pulse space-y-3"
          >
            <div className="aspect-square w-full rounded-xl bg-slate-800/60"></div>
            <div className="h-4 bg-slate-800/80 rounded w-3/4"></div>
            <div className="h-3 bg-slate-800/50 rounded w-1/2"></div>
            <div className="h-6 bg-slate-800/40 rounded-lg w-full mt-2"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
