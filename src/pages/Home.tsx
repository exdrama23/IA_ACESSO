import { useEffect, useState } from "react";
import { Avatar3D } from "../components/Avatar3D";
import { AudioButton } from "../components/AudioButton";
import { StatusIndicator } from "../components/StatusIndicator";
import { useChat } from "../hooks/useChat";
import { useRobustHandTracking } from "../hooks/useRobustHandTracking";
import { useSpeechPlayer } from "../hooks/useSpeechPlayer";
import { Play } from "lucide-react";

export default function Home() {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { handleToggleChat } = useChat();
  const { playTest } = useSpeechPlayer();

  useRobustHandTracking(videoElement);

  useEffect(() => {
    if (!videoElement) return;

    let mediaStream: MediaStream | null = null;

    const setupCamera = async () => {
      try {
        setCameraError(null);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 360 },
          },
          audio: false,
        });

        videoElement.srcObject = mediaStream;
        await videoElement.play();
      } catch {
        setCameraError("Nao foi possivel acessar a camera.");
      }
    };

    setupCamera();

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      if (videoElement.srcObject) {
        videoElement.srcObject = null;
      }
    };
  }, [videoElement]);

  const handleGoogleTest = () => {
    playTest("Olá! Eu sou a sua inteligência artificial. Estou pronta para ajudar no evento ACESSO I A. Como posso ser útil hoje?");
  };

  return (
    <main className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-between py-20">
      <Avatar3D />
      
      <StatusIndicator />

      <button 
        onClick={handleGoogleTest}
        className="fixed top-24 right-8 z-50 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold transition-all"
      >
        <Play className="w-4 h-4" /> TESTAR VOZ GOOGLE
      </button>

      <div className="fixed bottom-6 right-6 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 shadow-xl backdrop-blur-sm">
        <video
          ref={setVideoElement}
          className="h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
          muted
          playsInline
          autoPlay
        />
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 px-3 text-center text-xs font-medium text-slate-600">
            {cameraError}
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
