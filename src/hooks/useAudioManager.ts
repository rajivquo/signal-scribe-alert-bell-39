
import { useEffect, useRef } from 'react';

export const useAudioManager = (setCustomRingtone: (url: string | null) => void) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('🎵 AudioManager: Initializing file input');
    
    // Create hidden file input for ringtone selection
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'audio/*';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', handleRingtoneSelect);
    document.body.appendChild(fileInput);
    fileInputRef.current = fileInput;

    return () => {
      // Clean up blob URL and file input
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
      }
      if (fileInputRef.current && document.body.contains(fileInputRef.current)) {
        document.body.removeChild(fileInputRef.current);
        console.log('🎵 AudioManager: File input cleaned up');
      }
    };
  }, []);

  const convertFileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to data URL'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsDataURL(file);
    });
  };

  const handleRingtoneSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      console.log('🎵 AudioManager: File selected:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      try {
        // Revoke previous blob URL if it exists
        if (currentBlobUrlRef.current) {
          URL.revokeObjectURL(currentBlobUrlRef.current);
          currentBlobUrlRef.current = null;
        }

        // Convert file to base64 data URL for persistent storage
        const dataURL = await convertFileToDataURL(file);
        setCustomRingtone(dataURL);
        
        console.log('🎵 AudioManager: Custom ringtone set as data URL:', {
          fileName: file.name,
          dataURLLength: dataURL.length,
          mimeType: dataURL.split(',')[0]
        });
      } catch (error) {
        console.error('🎵 AudioManager: Error converting file to data URL:', error);
        setCustomRingtone(null);
      }
    } else {
      console.log('🎵 AudioManager: No file selected');
    }
  };

  const triggerRingtoneSelection = () => {
    console.log('🎵 AudioManager: Triggering ringtone selection dialog');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      console.error('🎵 AudioManager: File input ref is null');
    }
  };

  return {
    triggerRingtoneSelection
  };
};
