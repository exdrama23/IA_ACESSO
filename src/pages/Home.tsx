import { Avatar3D } from "../components/Avatar3D";
import { AudioButton } from "../components/AudioButton";
import { StatusIndicator } from "../components/StatusIndicator";
import { useChat } from "../hooks/useChat";
import { useSpeechPlayer } from "../hooks/useSpeechPlayer";
import { Play } from "lucide-react";

export default function Home() {
  const { handleToggleChat } = useChat();
  const { playTest } = useSpeechPlayer();

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

      <div className="z-10 text-center space-y-4 pointer-events-none">
        <p className="text-slate-400 text-[10px] tracking-[0.3em] font-light uppercase animate-pulse">
          Toque para interagir
        </p>
      </div>

      <AudioButton onClick={handleToggleChat} />
    </main>
  );
}
