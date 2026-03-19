import { useAppStore } from "../../store/useAppStore";
import { Mic, Square } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface AudioButtonProps {
  onClick: () => void;
}

export function AudioButton({ onClick }: AudioButtonProps) {
  const { isRecording } = useAppStore();

  return (
    <button
      onClick={onClick}
      className={twMerge(
        clsx(
          "fixed bottom-12 left-1/2 -translate-x-1/2",
          "w-20 h-20 rounded-full flex items-center justify-center",
          "transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-50",
          "backdrop-blur-md border border-white/20",
          isRecording 
            ? "bg-red-500 hover:bg-red-600 animate-pulse scale-110 shadow-red-200" 
            : "bg-white/80 hover:bg-white hover:scale-105 active:scale-95"
        )
      )}
    >
      {isRecording ? (
        <Square className="w-6 h-6 text-white fill-current" />
      ) : (
        <Mic className="w-8 h-8 text-slate-700" />
      )}
    </button>
  );
}
