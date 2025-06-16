
import { useState, useEffect, useRef } from 'react';
import { Signal } from '@/types/signal';
import { checkSignalTime } from '@/utils/signalUtils';
import { playCustomRingtone } from '@/utils/audioUtils';
import { requestWakeLock, releaseWakeLock } from '@/utils/wakeLockUtils';

export const useRingManager = (
  savedSignals: Signal[],
  antidelaySeconds: number,
  customRingtone: string | null,
  onSignalTriggered: (signal: Signal) => void
) => {
  const [isRinging, setIsRinging] = useState(false);
  const [currentRingingSignal, setCurrentRingingSignal] = useState<Signal | null>(null);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [ringOffButtonPressed, setRingOffButtonPressed] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioInstancesRef = useRef<HTMLAudioElement[]>([]);
  const audioContextsRef = useRef<AudioContext[]>([]);
  
  // Track recently triggered signals to prevent multiple rings
  const recentlyTriggeredRef = useRef<Set<string>>(new Set());
  const triggerTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Create unique key for signal to track triggers
  const getSignalKey = (signal: Signal): string => {
    return `${signal.timestamp}-${signal.asset}-${signal.direction}`;
  };

  // Ring notification
  const triggerRing = async (signal: Signal) => {
    const signalKey = getSignalKey(signal);
    
    // Check if this signal was recently triggered
    if (recentlyTriggeredRef.current.has(signalKey)) {
      console.log('🔔 RingManager: Signal recently triggered, skipping:', signalKey);
      return;
    }

    console.log('🔔 RingManager: Triggering ring for signal:', {
      signal,
      customRingtoneUrl: customRingtone,
      hasCustomRingtone: !!customRingtone
    });
    
    // Mark as recently triggered
    recentlyTriggeredRef.current.add(signalKey);
    
    // Set timeout to remove from recently triggered (5 minutes)
    const timeoutId = setTimeout(() => {
      recentlyTriggeredRef.current.delete(signalKey);
      triggerTimeoutsRef.current.delete(signalKey);
      console.log('🔔 RingManager: Signal removed from recently triggered:', signalKey);
    }, 5 * 60 * 1000); // 5 minutes
    
    triggerTimeoutsRef.current.set(signalKey, timeoutId);
    
    setIsRinging(true);
    setCurrentRingingSignal(signal);
    
    // Wake up screen if supported
    const lock = await requestWakeLock();
    setWakeLock(lock);

    // Wake up screen on mobile by trying to focus the window
    if (document.hidden) {
      window.focus();
    }

    // Play custom ringtone or default beep and track audio instances
    console.log('🔔 RingManager: About to play audio with ringtone:', customRingtone);
    const audio = await playCustomRingtone(customRingtone, audioContextsRef);
    if (audio instanceof HTMLAudioElement) {
      audioInstancesRef.current.push(audio);
      console.log('🔔 RingManager: Audio instance added to tracking array');
    }

    // Mark signal as triggered
    onSignalTriggered(signal);
  };

  // Check signals every second for precise timing using cached data
  useEffect(() => {
    if (savedSignals.length > 0) {
      console.log('🔔 RingManager: Starting signal monitoring interval with custom ringtone:', customRingtone);
      
      intervalRef.current = setInterval(() => {
        // Use the savedSignals prop directly instead of loading from storage
        savedSignals.forEach(signal => {
          if (checkSignalTime(signal, antidelaySeconds)) {
            console.log('🔔 RingManager: Signal time matched, triggering ring:', signal);
            triggerRing(signal);
          }
        });
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          console.log('🔔 RingManager: Signal monitoring interval cleared');
        }
      };
    }
  }, [savedSignals, customRingtone, antidelaySeconds]);

  // Cleanup function to clear all timeouts
  useEffect(() => {
    return () => {
      // Clear all trigger timeouts on unmount
      triggerTimeoutsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      triggerTimeoutsRef.current.clear();
      recentlyTriggeredRef.current.clear();
    };
  }, []);

  // Ring off button handler - stops ALL audio immediately
  const handleRingOff = () => {
    console.log('🔔 RingManager: Ring off button pressed - stopping all audio');
    
    setRingOffButtonPressed(true);
    setTimeout(() => setRingOffButtonPressed(false), 200);
    
    // Stop ALL audio instances immediately
    console.log('🔔 RingManager: Stopping', audioInstancesRef.current.length, 'audio instances');
    audioInstancesRef.current.forEach((audio, index) => {
      if (audio) {
        console.log('🔔 RingManager: Stopping audio instance', index);
        audio.pause();
        audio.currentTime = 0;
      }
    });
    audioInstancesRef.current = [];
    
    // Stop ALL Web Audio API contexts
    console.log('🔔 RingManager: Stopping', audioContextsRef.current.length, 'audio contexts');
    audioContextsRef.current.forEach((context, index) => {
      if (context && context.state !== 'closed') {
        console.log('🔔 RingManager: Closing audio context', index);
        context.close().catch(err => console.log('🔔 RingManager: Audio context cleanup error:', err));
      }
    });
    audioContextsRef.current = [];
    
    // Additional cleanup: Stop any remaining audio elements on the page
    const allAudioElements = document.querySelectorAll('audio');
    console.log('🔔 RingManager: Found', allAudioElements.length, 'audio elements on page to stop');
    allAudioElements.forEach((audio, index) => {
      console.log('🔔 RingManager: Stopping page audio element', index);
      audio.pause();
      audio.currentTime = 0;
    });
    
    // Stop ringing if currently ringing
    if (isRinging) {
      console.log('🔔 RingManager: Stopping ringing state');
      setIsRinging(false);
      setCurrentRingingSignal(null);
      releaseWakeLock(wakeLock);
      setWakeLock(null);
    }
  };

  return {
    isRinging,
    currentRingingSignal,
    ringOffButtonPressed,
    handleRingOff
  };
};
