import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

// Funcao auxiliar para detectar mao fechada (mesma logica do Home.tsx)
function isHandClosed(landmarks: any[]): boolean {
  if (!landmarks || landmarks.length < 21) return false;
  const wrist = landmarks[0];
  const fingertipIndexes = [8, 12, 16, 20];
  const knuckleIndexes = [5, 9, 13, 17];

  const avgTipToWrist = fingertipIndexes.reduce((sum, idx) => {
    const p = landmarks[idx];
    return sum + Math.hypot(p.x - wrist.x, p.y - wrist.y, p.z - wrist.z);
  }, 0) / fingertipIndexes.length;

  const avgKnuckleToWrist = knuckleIndexes.reduce((sum, idx) => {
    const p = landmarks[idx];
    return sum + Math.hypot(p.x - wrist.x, p.y - wrist.y, p.z - wrist.z);
  }, 0) / knuckleIndexes.length;

  return avgTipToWrist < avgKnuckleToWrist * 0.95;
}

export function useSpeechInterruption() {
  const handLandmarks = useAppStore((state) => state.handLandmarks);
  const status = useAppStore((state) => state.status);
  const setStatus = useAppStore((state) => state.setStatus);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handIsClosed = isHandClosed(handLandmarks);
    const canInterrupt = status === 'speaking' || status === 'thinking';

    if (handIsClosed && canInterrupt) {
      if (!stopTimerRef.current) {
        stopTimerRef.current = setTimeout(() => {
          const state = useAppStore.getState();
          console.log('[INTERRUPCAO] Parada forcada via gesto de mao fechada');
          
          // 1. Interrompe o objeto de audio global (ElevenLabs/Cloudinary)
          const audio = state.currentAudio;
          if (audio) {
            audio.pause();
            audio.muted = true;
            audio.src = "";
            audio.load();
            state.setCurrentAudio(null);
          }

          // 2. Busca exaustiva por qualquer outro objeto de audio no DOM
          const allAudios = document.querySelectorAll('audio');
          allAudios.forEach(a => {
            a.pause();
            a.src = "";
            a.load();
          });

          setStatus('idle');
        }, 250);
      }
    } else {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
    }

    return () => {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
      }
    };
  }, [handLandmarks, status, setStatus]);
}
