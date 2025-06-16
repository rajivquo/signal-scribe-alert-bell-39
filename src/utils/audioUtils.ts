
export const createBeepAudio = (audioContextsRef?: React.MutableRefObject<AudioContext[]>) => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  gainNode.gain.value = 0.3;
  
  const duration = 1000; // 1 second
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration / 1000);
  
  // Store audio context for cleanup tracking if ref is provided
  if (audioContextsRef) {
    audioContextsRef.current.push(audioContext);
  }
  
  return oscillator;
};

export const playCustomRingtone = (customRingtone: string | null, audioContextsRef?: React.MutableRefObject<AudioContext[]>): Promise<HTMLAudioElement | null> => {
  return new Promise((resolve, reject) => {
    if (customRingtone) {
      const audio = new Audio(customRingtone);
      audio.loop = true; // Loop the ringtone
      audio.play().then(() => {
        resolve(audio);
      }).catch(err => {
        console.log('Error playing custom ringtone:', err);
        // Fallback to default beep
        createBeepAudio(audioContextsRef);
        resolve(null);
      });
    } else {
      // Play default beep
      createBeepAudio(audioContextsRef);
      resolve(null);
    }
  });
};
