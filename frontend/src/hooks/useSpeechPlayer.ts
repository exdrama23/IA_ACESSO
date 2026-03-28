import { useCallback } from "react";
import { useAppStore } from "../store/useAppStore";

export function useSpeechPlayer() {
  const { setStatus } = useAppStore();

  const playTest = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      window.speechSynthesis.cancel();

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        
        let voices = window.speechSynthesis.getVoices();
        
        const findVoice = () => {
          const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'));
          if (ptVoice) utterance.voice = ptVoice;
        };

        if (voices.length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            findVoice();
          };
        } else {
          findVoice();
        }
        
        utterance.lang = 'pt-BR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
          console.log("Iniciando fala...");
          setStatus("speaking");
        };

        utterance.onend = () => {
          console.log("Fala finalizada.");
          setStatus("idle");
          resolve();
        };

        utterance.onerror = (event) => {
          console.error("Erro na síntese de voz:", event);
          setStatus("idle");
          reject(event);
        };

        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      }, 100);
    });
  }, [setStatus]);

  return { playTest };
}
