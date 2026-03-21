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

        if (response.audioUrl && response.audioUrl.startsWith('data:audio')) {
          console.log("🎵 Iniciando reprodução de áudio do backend...");
          setStatus("speaking");
          
          try {
            // O navegador sabe tocar Data URIs de Base64 nativamente!
            const audio = new Audio(response.audioUrl);
            
            audio.onplay = () => console.log("✓ Áudio iniciado.");
            
            audio.onended = () => {
              console.log("✓ Áudio finalizado.");
              setStatus("idle");
            };
            
            audio.onerror = async (e) => {
              console.error("❌ Erro ao tocar áudio (Data URI inválido), usando fallback local:", e);
              await playTest(response.text);
              setStatus("idle");
            };

            await audio.play();
            
          } catch (playError) {
            console.error("❌ Erro no play() do áudio Data URI:", playError);
            await playTest(response.text);
            setStatus("idle");
          }
        } else if (response.audioUrl) {
          console.warn("⚠️ Backend devolveu audioUrl mas não é Data URI válido:", response.audioUrl.substring(0, 50));
          await playTest(response.text);
          setStatus("idle");
        } else {
          console.log("ℹ️ Sem áudio do backend, usando síntese local...");
          await playTest(response.text);
          setStatus("idle");
        }

      } catch (error) {
        console.error("Falha na comunicação com o servidor:", error);
        setStatus("idle");
      }
    }
  }, [isRecording, start, stop, playTest, setStatus, toggleRecording]);

  return { handleToggleChat };
}
