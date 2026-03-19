import { useAppStore } from "../../store/useAppStore";
import { clsx } from "clsx";

function AnimatedDots() {
  return (
    <span className="inline-flex items-center">
      <span className="animate-[bounce_1.2s_infinite_0ms] text-4xl">.</span>
      <span className="animate-[bounce_1.2s_infinite_200ms] text-4xl">.</span>
      <span className="animate-[bounce_1.2s_infinite_400ms] text-4xl">.</span>
    </span>
  );
}

export function StatusIndicator() {
  const { status } = useAppStore();

  const labels = {
    idle: "IA Pronta",
    listening: "Ouvindo...",
    thinking: <AnimatedDots />,
    speaking: "IA respondendo...",
  };

  const colors = {
    idle: "text-slate-400",
    listening: "text-blue-500 animate-pulse",
    thinking: "text-purple-600 h-10 flex items-center justify-center", 
    speaking: "text-orange-500",
  };

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 text-center pointer-events-none z-50">
      <div className={clsx(
        "text-lg font-medium tracking-[0.2em] uppercase transition-all duration-500 min-h-10 flex items-center justify-center",
        colors[status as keyof typeof colors]
      )}>
        {labels[status as keyof typeof labels]}
      </div>
      <div className="mt-3 w-40 h-0.5 bg-slate-100 rounded-full mx-auto overflow-hidden">
        <div className={clsx(
          "h-full transition-all duration-700 rounded-full",
          status === 'idle' && "w-0 bg-transparent",
          status === 'listening' && "w-full bg-blue-400",
          status === 'thinking' && "w-full bg-purple-500 animate-pulse",
          status === 'speaking' && "w-full bg-orange-400"
        )} />
      </div>
    </div>
  );
}
