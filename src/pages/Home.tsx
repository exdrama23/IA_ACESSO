import { useEffect, useRef, useState } from "react";
import { Avatar3D } from "../components/Avatar3D";
import { AudioButton } from "../components/AudioButton";
import { StatusIndicator } from "../components/StatusIndicator";
import { useChat } from "../hooks/useChat";
import { useRobustHandTracking } from "../hooks/useRobustHandTracking";

import { useAppStore } from "../store/useAppStore";

const GESTURE_TOGGLE_COOLDOWN_MS = 700;

function isHandClosedGesture(landmarks: Array<{ x: number; y: number; z: number }>): boolean {
  if (landmarks.length < 21) return false;

  const wrist = landmarks[0];
  const fingertipIndexes = [8, 12, 16, 20];
  const knuckleIndexes = [5, 9, 13, 17];

  const avgTipToWrist =
    fingertipIndexes.reduce((sum, idx) => {
      const p = landmarks[idx];
      return sum + Math.hypot(p.x - wrist.x, p.y - wrist.y, p.z - wrist.z);
    }, 0) / fingertipIndexes.length;

  const avgKnuckleToWrist =
    knuckleIndexes.reduce((sum, idx) => {
      const p = landmarks[idx];
      return sum + Math.hypot(p.x - wrist.x, p.y - wrist.y, p.z - wrist.z);
    }, 0) / knuckleIndexes.length;

  return avgTipToWrist < avgKnuckleToWrist * 0.95;
}

export default function Home() {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(true);
  const lastGestureClosedRef = useRef<boolean | null>(null);
  const lastToggleAtRef = useRef(0);
  const isGestureTogglingRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const { handleToggleChat } = useChat();
  
  const handLandmarks = useAppStore((state) => state.handLandmarks);
  const isUserPresent = useAppStore((state) => state.isUserPresent);
  const isRecording = useAppStore((state) => state.isRecording);

  useRobustHandTracking(videoElement);

  useEffect(() => {
    if (!videoElement) return;

    const setupCamera = async () => {
      try {
        setCameraError(null);
        setCameraLoading(true);
        
        console.log(`[Camera] Tentativa ${retryCountRef.current + 1}...`);
        
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError("Seu navegador nao suporta acesso a camera.");
          setCameraLoading(false);
          return;
        }

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => {
            console.log('[Camera] Parando track anterior:', track.kind);
            track.stop();
          });
          mediaStreamRef.current = null;
        }

        if (retryCountRef.current > 0) {
          const delayMs = Math.min(1000 * (2 ** retryCountRef.current), 5000); 
          console.log(`[Camera] Aguardando ${delayMs}ms antes de tentar novamente...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 360 },
          },
          audio: false,
        });

        console.log('[Camera] Stream obtido com sucesso');
        mediaStreamRef.current = mediaStream;
        videoElement.srcObject = mediaStream;

        await new Promise<void>((resolve, reject) => {
          let checkTimeoutId: ReturnType<typeof setTimeout> | null = null;
          const mainTimeoutId = setTimeout(() => {
            if (checkTimeoutId) clearTimeout(checkTimeoutId);
            if (videoElement.readyState < 2) {
              reject(new Error('Video nunca ficou ready'));
            }
          }, 5000);

          const checkReady = () => {
            console.log(`[Camera] readyState: ${videoElement.readyState}`);
            if (videoElement.readyState >= 2) {
              clearTimeout(mainTimeoutId);
              if (checkTimeoutId) clearTimeout(checkTimeoutId);
              resolve();
            } else {
              checkTimeoutId = setTimeout(checkReady, 100);
            }
          };
          
          checkReady();
        });
        
        console.log('[Camera] Video ready, iniciando play...');
        await videoElement.play();
        setCameraLoading(false);
        retryCountRef.current = 0;
        console.log('[Camera] Camera iniciada com sucesso!');
        
      } catch (error) {
        const err = error as Error;
        console.error('[Camera] Erro:', err.name, err.message);
        
        let errorMessage = "";
        
        if (err.name === 'NotAllowedError') {
          errorMessage = "Permissao negada. Clique no icon da camera na barra do navegador para permitir.";
        } else if (err.name === 'NotFoundError') {
          errorMessage = "Nenhuma camera detectada no dispositivo.";
        } else if (err.name === 'NotReadableError') {
          errorMessage = "Camera em uso por outro app. Feche Chrome, OBS ou outras apps e tente novamente.";

          if (retryCountRef.current < 3) {
            retryCountRef.current += 1;
            const delayMs = 2000 + (retryCountRef.current * 1000);
            console.log(`[Camera] Tentando novamente em ${delayMs}ms... (tentativa ${retryCountRef.current})`);
            
            retryTimeoutRef.current = setTimeout(() => {
              setupCamera();
            }, delayMs);
            setCameraError(`${errorMessage} (tentando novamente...)`);
            return;
          } else {
            errorMessage = `${errorMessage} Tentativas esgotadas. Reinicie o navegador.`;
          }
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = "Camera nao suporta as configuracoes solicitadas. Tente outro navegador.";
        } else {
          errorMessage = `Erro: ${err.message}`;
        }
        
        setCameraError(errorMessage);
        setCameraLoading(false);
      }
    };

    setupCamera();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (mediaStreamRef.current) {
        console.log('[Camera] Cleanup: parando streams');
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (videoElement && videoElement.srcObject) {
        videoElement.srcObject = null;
      }
    };
  }, [videoElement]);

  useEffect(() => {
    if (!isUserPresent || handLandmarks.length < 21) {
      lastGestureClosedRef.current = null;
      return;
    }

    const handClosed = isHandClosedGesture(handLandmarks);
    const gestureChanged = lastGestureClosedRef.current === null || lastGestureClosedRef.current !== handClosed;

    if (!gestureChanged) return;

    lastGestureClosedRef.current = handClosed;

    const shouldRecord = handClosed;
    if (shouldRecord === isRecording) return;

    const now = Date.now();
    if (isGestureTogglingRef.current || now - lastToggleAtRef.current < GESTURE_TOGGLE_COOLDOWN_MS) return;

    isGestureTogglingRef.current = true;
    lastToggleAtRef.current = now;

    void handleToggleChat().finally(() => {
      isGestureTogglingRef.current = false;
    });
  }, [handLandmarks, isUserPresent, isRecording, handleToggleChat]);

  return (
    <main className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-between py-20">
      <Avatar3D />
      
      <StatusIndicator />

      {}

      <div className="fixed bottom-6 right-6 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 shadow-xl backdrop-blur-sm">
        <video
          ref={setVideoElement}
          className="h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
          muted
          playsInline
          autoPlay
        />
        {(cameraError || cameraLoading) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 px-3 text-center gap-2">
            {cameraLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-xs font-medium text-slate-600">Inicializando camera...</p>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-slate-700">{cameraError}</p>
                <button
                  onClick={() => {
                    retryCountRef.current = 0;
                    setCameraError(null);
                    setVideoElement(null);
                    setTimeout(() => setVideoElement(videoElement), 0);
                  }}
                  className="mt-1 px-2 py-1 text-[10px] font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Tentar Novamente
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="z-10 text-center space-y-4 pointer-events-none">
        <p className="text-slate-400 text-[10px] tracking-[0.3em] font-light uppercase animate-pulse">
          Toque para interagir
        </p>
      </div>

      <AudioButton onClick={handleToggleChat} />
    </main>
  );
}
