import { useAudioRecorder } from "./useAudioRecorder";
import { useSpeechPlayer } from "./useSpeechPlayer";
import { sendText } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { useCallback } from "react";

export function useChat() {
  const { start, stop } = useAudioRecorder();
  const { playTest } = useSpeechPlayer();
  const { setStatus, isRecording, toggleRecording } = useAppStore();

  const handleToggleChat = useCallback(async () => {
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
          console.log("Nenhum texto detectado.");
          setStatus("idle");
          return;
        }

        console.log("Enviando texto transcrito no front:", textTranscript);
        
        const response = await sendText(textTranscript);

        console.log("Resposta da IA:", response.text, `(Fonte: ${response.source})`);

        if (response.audioUrl) {
          console.log("Iniciando áudio (Base64 ou URL)...");
          setStatus("speaking");

          const fullUrl = response.audioUrl.startsWith('data:') || response.audioUrl.startsWith('http')
            ? response.audioUrl 
            : `http://localhost:3001${response.audioUrl}`;

          const audio = new Audio(fullUrl);
          
          audio.onplay = () => console.log("Áudio iniciado.");
          audio.onended = () => {
            console.log("Áudio finalizado.");
            setStatus("idle");
          };
          
          audio.onerror = async (e) => {
            console.error("Erro ao tocar áudio do backend, usando fallback local:", e);
            await playTest(response.text);
          };

          try {
            await audio.play();
          } catch (playError) {
            console.error("Erro no play() do áudio:", playError);
            await playTest(response.text);
          }
        } else {
          console.log("Sem áudio do backend, usando síntese local.");
          await playTest(response.text);
        }

      } catch (error) {
        console.error("Falha na comunicação com o servidor:", error);
        setStatus("idle");
      }
    }
  }, [isRecording, start, stop, playTest, setStatus, toggleRecording]);

  return { handleToggleChat };
}
