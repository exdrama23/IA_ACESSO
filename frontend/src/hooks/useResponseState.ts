// frontend/src/hooks/useResponseState.ts

import { useState, useCallback } from "react";

export interface ChatResponse {
  text: string;
  audioUrl?: string;
  source: string;
  confidence: number;
  latency?: number;
}

export interface ResponseState {
  isCache: boolean;
  isAI: boolean;
  isLoading: boolean;
  response: ChatResponse | null;
  latency: number;
  showMessage: string | null;
}

/**
 * 🎯 Hook: useResponseState
 * 
 * Gerencia o estado da resposta:
 * - Detecta se é cache hit (rápido)
 * - Detecta se é IA (mais lento)
 * - Controla mensagens de loading
 * - Calcula latência
 */
export const useResponseState = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [latency, setLatency] = useState<number>(0);

  const isCache = response?.source === "DATABASE_VECTOR_MATCH";
  const isAI = response?.source?.startsWith("IA_");

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setStartTime(Date.now());
    setResponse(null);
  }, []);

  const endLoading = useCallback((newResponse: ChatResponse) => {
    const elapsed = Date.now() - startTime;
    setLatency(elapsed);
    setResponse(newResponse);
    setIsLoading(false);
  }, [startTime]);

  const getLoadingMessage = (): string | null => {
    if (!isLoading) return null;

    const elapsed = Date.now() - startTime;

    if (elapsed < 200) {
      return "Buscando...";
    } else if (elapsed < 1000) {
      return "Sua pergunta foi interessante, vou processar mais um pouco...";
    } else {
      return "Processando... ainda pode levar alguns segundos.";
    }
  };

  const reset = useCallback(() => {
    setIsLoading(false);
    setResponse(null);
    setStartTime(0);
    setLatency(0);
  }, []);

  return {
    // Estados
    isLoading,
    response,
    isCache,
    isAI,
    latency,

    // Métodos
    startLoading,
    endLoading,
    reset,
    getLoadingMessage,

    // Flags úteis
    isFastResponse: latency < 200,
    showAINotification: isAI && !isLoading,
    showCacheNotification: isCache && !isLoading,
  };
};

export default useResponseState;
