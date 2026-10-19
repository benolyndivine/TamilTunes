import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

/**
 * Hook for managing synchronized lyrics highlighting, time offset calibration, and auto-scrolling
 */
export function useSyncedLyrics(parsedLines = [], currentTime = 0, isSynced = true) {
  const containerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [timeOffset, setTimeOffset] = useState(0); // in seconds, positive = advance lyrics, negative = delay
  const userScrollTimeout = useRef(null);

  // Always keep a ref to the latest currentTime so callbacks don't capture stale values
  const currentTimeRef = useRef(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Reset offset when track or lyrics change
  useEffect(() => {
    setTimeOffset(0);
  }, [parsedLines]);

  // Compute effective playback time with calibrated offset
  const effectiveTime = useMemo(() => {
    return Math.max(0, currentTime + timeOffset);
  }, [currentTime, timeOffset]);

  // Compute active lyric line index based on effectiveTime with subtle 150ms lead-in for vocal attack
  const activeIndex = useMemo(() => {
    if (!isSynced || !parsedLines || parsedLines.length === 0) {
      return -1;
    }

    let index = -1;
    for (let i = 0; i < parsedLines.length; i++) {
      // 150ms anticipation so highlighting triggers as vocals start
      if (effectiveTime >= parsedLines[i].time - 0.15) {
        index = i;
      } else {
        break;
      }
    }

    return index;
  }, [parsedLines, effectiveTime, isSynced]);

  const activeLine = activeIndex >= 0 ? parsedLines[activeIndex] : null;

  // Calculate percentage completion of current singing line
  const lineProgress = useMemo(() => {
    if (activeIndex < 0 || !parsedLines[activeIndex]) return 0;
    const currentLineTime = parsedLines[activeIndex].time;
    const nextLineTime = parsedLines[activeIndex + 1]?.time || (currentLineTime + 4.0);
    const lineDuration = Math.max(0.5, nextLineTime - currentLineTime);
    const elapsedInLine = effectiveTime - currentLineTime;
    return Math.min(100, Math.max(0, (elapsedInLine / lineDuration) * 100));
  }, [activeIndex, parsedLines, effectiveTime]);

  // Calibrate offset so a specific line matches the current audio playback position
  // Uses currentTimeRef to avoid stale closure - reads actual live time
  const calibrateToLine = useCallback((lineIndex) => {
    if (lineIndex < 0 || lineIndex >= parsedLines.length) return;
    const targetLine = parsedLines[lineIndex];
    // We want targetLine.time + offset === currentAudioTime + offset + offset_delta
    // So new offset = targetLine.time - currentAudioTime
    const liveTime = currentTimeRef.current;
    const newOffset = targetLine.time - liveTime;
    setTimeOffset(Math.round(newOffset * 10) / 10);
    setAutoScroll(true);
  }, [parsedLines]);

  // Nudge offset by delta (e.g. +0.5s or -0.5s)
  const nudgeOffset = useCallback((delta) => {
    setTimeOffset(prev => Math.round((prev + delta) * 10) / 10);
  }, []);

  // Reset offset to 0
  const resetOffset = useCallback(() => {
    setTimeOffset(0);
  }, []);

  // Auto-scroll the active line into center of container
  useEffect(() => {
    if (!autoScroll || activeIndex < 0 || !containerRef.current) return;

    const container = containerRef.current;
    const raf = requestAnimationFrame(() => {
      const activeElement = container.querySelector(`[data-index="${activeIndex}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [activeIndex, autoScroll]);

  // Handle manual scroll pause (resume after 6 seconds of no scroll)
  const handleUserScroll = useCallback(() => {
    setAutoScroll(false);
    if (userScrollTimeout.current) {
      clearTimeout(userScrollTimeout.current);
    }
    userScrollTimeout.current = setTimeout(() => {
      setAutoScroll(true);
    }, 6000);
  }, []);

  const resumeAutoScroll = useCallback(() => {
    setAutoScroll(true);
    if (userScrollTimeout.current) {
      clearTimeout(userScrollTimeout.current);
    }
  }, []);

  return {
    activeIndex,
    activeLine,
    lineProgress,
    effectiveTime,
    timeOffset,
    setTimeOffset,
    nudgeOffset,
    calibrateToLine,
    resetOffset,
    containerRef,
    autoScroll,
    resumeAutoScroll,
    handleUserScroll
  };
}
