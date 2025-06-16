
import { useRef, useCallback, useEffect } from 'react';

export const useAudioInstances = (customRingtone: string | null) => {
  const audioInstancesRef = useRef<HTMLAudioElement[]>([]);

  const addAudioInstance = useCallback((audio: HTMLAudioElement) => {
    audioInstancesRef.current.push(audio);
    console.log('🔊 AudioInstances: Audio instance added, total instances:', audioInstancesRef.current.length);
  }, []);

  const clearAllAudioInstances = useCallback(() => {
    console.log('🧹 AudioInstances: Clearing', audioInstancesRef.current.length, 'audio instances');
    audioInstancesRef.current.forEach(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
      }
    });
    audioInstancesRef.current = [];
    console.log('✅ AudioInstances: All audio instances cleared');
  }, []);

  // Clear audio instances when ringtone changes
  useEffect(() => {
    console.log('🔄 AudioInstances: Ringtone changed, clearing cached instances');
    clearAllAudioInstances();
  }, [customRingtone, clearAllAudioInstances]);

  return {
    addAudioInstance,
    clearAllAudioInstances
  };
};
