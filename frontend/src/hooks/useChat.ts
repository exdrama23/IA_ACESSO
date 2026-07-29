import { useAudioRecorder } from "./useAudioRecorder";
import { sendText, predictAI } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { useCallback } from "react";

export function useChat() {
  const { start, stop } = useAudioRecorder();
  const { setStatus, isRecording, toggleRecording, lastResponse, setLastResponse, setCurrentAudio } = useAppStore();

  const isRepeatCommand = (text: string): boolean => {
    const repeatPatterns = ["pode repetir", "repete", "repita", "repete aí", "de novo", "fala de novo", "outra vez", "novamente"];
    const lowerText = text.toLowerCase().trim();
    return repeatPatterns.some(pattern => lowerText.includes(pattern));
  };

  const playAudio = useCallback(async (audioUrl: string) => {
    const state = useAppStore.getState();
    if (state.currentAudio) {
      console.log("Interrompendo audio anterior de forma absoluta...");
      state.currentAudio.pause();
      state.currentAudio.muted = true;
      state.currentAudio.src = "";
      state.currentAudio.load();
      setCurrentAudio(null);
    }

    if (audioUrl) {
      console.log("Iniciando áudio...");
      setStatus("speaking");

      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);
      
      audio.onended = () => {
        console.log("Áudio finalizado.");
        setStatus("idle");
        setCurrentAudio(null);
      };
      
      audio.onerror = (e) => {
        console.error("Erro ao tocar áudio:", e);
        setStatus("idle");
        setCurrentAudio(null);
      };

      try {
        await audio.play();
      } catch (playError) {
        console.error("Erro no play() do áudio:", playError);
        setStatus("idle");
        setCurrentAudio(null);
      }
    } else {
      setStatus("idle");
    }
  }, [setStatus, setCurrentAudio]);

  const handleToggleChat = useCallback(async () => {
    const { setIsThinkingDeeply } = useAppStore.getState();

    if (!isRecording) {
      toggleRecording();
      try {
        await start();
        setStatus("listening");
      } catch (error) {
        console.error("Falha ao iniciar gravacao:", error);
        toggleRecording();
        setStatus("idle");
      }
    } else {
      toggleRecording();
      setStatus("thinking");
      
      try {
        const textTranscript = await stop();
        
        if (!textTranscript) {
          setIsThinkingDeeply(false);
          console.log("Nenhum texto detectado.");
          setStatus("idle");
          return;
        }

        console.log("Texto transcrito:", textTranscript);

        if (isRepeatCommand(textTranscript)) {
          setIsThinkingDeeply(false);
          console.log("[REPETIR] Detectado comando de repetição");
          if (lastResponse && lastResponse.audioUrl) {
            await playAudio(lastResponse.audioUrl);
            return;
          } else {
            console.log("[REPETIR] Nenhuma resposta anterior para repetir");
            setStatus("idle");
            return;
          }
        }

        // ✅ PREVISÃO DETERMINÍSTICA
        // Se a previsão indicar que chamará IA, mostramos o balão IMEDIATAMENTE
        const prediction = await predictAI(textTranscript);
        if (prediction.willCallAI) {
          console.log("[CHAT] Previsão: IA será necessária. Ativando balão.");
          setIsThinkingDeeply(true);
        } else {
          console.log("[CHAT] Previsão: Cache hit provável. Mantendo balão oculto.");
        }

        const response = await sendText(textTranscript);
        setIsThinkingDeeply(false);
        console.log("Resposta da IA:", response.text, `(Fonte: ${response.source})`);

        if (response.text && response.audioUrl) {
          setLastResponse({
            text: response.text,
            audioUrl: response.audioUrl,
            timestamp: Date.now()
          });
          console.log("[CACHE] Última resposta armazenada para repetição");
        }

        await playAudio(response.audioUrl);

      } catch (error) {
        console.error("Falha na comunicação com o servidor:", error);
        setIsThinkingDeeply(false);
        setStatus("idle");
      }
    }
  }, [isRecording, start, stop, setStatus, toggleRecording, lastResponse, setLastResponse, playAudio]);

  return { handleToggleChat };
}
