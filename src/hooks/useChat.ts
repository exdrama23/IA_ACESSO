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
          setStatus("speaking");
          const audio = new Audio(response.audioUrl);
          audio.onended = () => setStatus("idle");
          await audio.play();
        } else {
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
