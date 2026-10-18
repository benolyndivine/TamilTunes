import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorMessage({
  title = 'Something went wrong',
  message,
  onRetry
}) {
  return (
    <div className="w-full max-w-xl mx-auto my-8 p-6 rounded-3xl bg-red-950/20 border border-red-500/30 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
          {message || 'Unable to connect to the music service. Please check your internet connection and try again.'}
        </p>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-lg transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Search</span>
        </button>
      )}
    </div>
  );
}
