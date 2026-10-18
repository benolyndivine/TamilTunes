import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for audio playback management
 */
export function useAudioPlayer() {
  const audioRef = useRef(null);

  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'
  const [isShuffled, setIsShuffled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [queue, setQueue] = useState([]);
  const [originalQueue, setOriginalQueue] = useState([]);

  // Initialize Audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };

    const onWaiting = () => {
      setIsLoading(true);
    };

    const onPlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onError = (e) => {
      console.warn('Audio playback error:', e);
      setIsLoading(false);
      setIsPlaying(false);
      setAudioError('Unable to stream this audio track directly. You can use the external source buttons below to play.');
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Update volume and mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Handle track end & repeat / queue logic
  const handleNext = useCallback(() => {
    if (!queue || queue.length === 0) {
      setIsPlaying(false);
      return;
    }

    const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
    let nextIndex = currentIndex + 1;

    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      playTrack(nextTrack);
    }
  }, [queue, currentTrack, repeatMode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.warn);
      } else {
        handleNext();
      }
    };

    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('ended', onEnded);
    };
  }, [repeatMode, handleNext]);

  // Play a specific track
  const playTrack = useCallback((track, newQueue = null) => {
    if (!track) return;
    setAudioError(null);
    setCurrentTrack(track);
    setCurrentTime(0);

    if (newQueue && Array.isArray(newQueue)) {
      setQueue(newQueue);
      setOriginalQueue(newQueue);
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (track.audioUrl) {
      setIsLoading(true);
      audio.src = track.audioUrl;
      audio.play().then(() => {
        setIsPlaying(true);
        setIsLoading(false);
      }).catch(err => {
        console.warn('Autoplay error:', err.message);
        setIsLoading(false);
        setIsPlaying(false);
        if (err.name !== 'AbortError') {
          setAudioError('Direct playback was blocked or audio source unavailable.');
        }
      });
    } else {
      audio.src = '';
      setIsPlaying(false);
      setAudioError('This song does not have a direct audio stream. Use the source links to listen.');
    }
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (audio.src && audio.src !== window.location.href) {
        audio.play().then(() => setIsPlaying(true)).catch(err => {
          console.warn('Playback error:', err);
          setAudioError('Failed to resume playback.');
        });
      } else if (currentTrack.audioUrl) {
        playTrack(currentTrack);
      }
    }
  }, [isPlaying, currentTrack, playTrack]);

  // Seek to position in seconds
  const seekTo = useCallback((time) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clampedTime = Math.max(0, Math.min(time, duration || 300));
    audio.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  }, [duration]);

  // Volume setter
  const setVolume = useCallback((val) => {
    const clamped = Math.max(0, Math.min(val, 1));
    setVolumeState(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Toggle repeat mode: 'off' -> 'all' -> 'one' -> 'off'
  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  // Toggle shuffle
  const toggleShuffle = useCallback(() => {
    setIsShuffled(prev => {
      const next = !prev;
      if (next) {
        // Shuffle queue
        const shuffled = [...queue].sort(() => Math.random() - 0.5);
        setQueue(shuffled);
      } else {
        // Restore original queue order
        setQueue(originalQueue);
      }
      return next;
    });
  }, [queue, originalQueue]);

  // Previous track
  const handlePrev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      // If played more than 3s, restart current track
      seekTo(0);
      return;
    }

    if (!queue || queue.length === 0) return;
    const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
    const prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      playTrack(prevTrack);
    }
  }, [queue, currentTrack, seekTo, playTrack]);

  // Add to queue
  const addToQueue = useCallback((track) => {
    setQueue(prev => {
      if (prev.some(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
    setOriginalQueue(prev => {
      if (prev.some(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
  }, []);

  // Remove from queue
  const removeFromQueue = useCallback((trackId) => {
    setQueue(prev => prev.filter(t => t.id !== trackId));
    setOriginalQueue(prev => prev.filter(t => t.id !== trackId));
  }, []);

  // Clear queue
  const clearQueue = useCallback(() => {
    if (currentTrack) {
      setQueue([currentTrack]);
      setOriginalQueue([currentTrack]);
    } else {
      setQueue([]);
      setOriginalQueue([]);
    }
  }, [currentTrack]);

  return {
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
    playTrack,
    togglePlay,
    seekTo,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    handleNext,
    handlePrev,
    addToQueue,
    removeFromQueue,
    clearQueue
  };
}
