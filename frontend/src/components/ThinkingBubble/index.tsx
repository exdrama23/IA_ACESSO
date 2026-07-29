import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { clsx } from "clsx";

export const ThinkingBubble: React.FC = () => {
  const isThinkingDeeply = useAppStore((state) => state.isThinkingDeeply);

  return (
    <div
      className={clsx(
        "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-40 z-[60] transition-all duration-500 transform pointer-events-none",
        isThinkingDeeply ? "opacity-100 scale-100" : "opacity-0 scale-90"
      )}
    >
      <div className="relative bg-white/90 backdrop-blur-md border border-blue-200/50 px-6 py-3 rounded-2xl shadow-2xl max-w-[280px] text-center">
        <p className="text-blue-700 text-sm font-medium leading-tight">
          Sua pergunta foi interessante, vou processar mais um pouco... 🤔
        </p>
        
        {/* Triângulo do Balão */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/90 rotate-45 border-r border-b border-blue-200/50" />
      </div>
    </div>
  );
};
