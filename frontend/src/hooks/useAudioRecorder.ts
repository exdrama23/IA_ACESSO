import { useRef, useCallback, useState } from "react";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useAudioRecorder() {
  const recognitionRef = useRef<any>(null);
  const [transcript, setTranscript] = useState("");
  const finalTranscriptRef = useRef(""); 
  const isManuallyStoppedRef = useRef(false);

  const start = useCallback(() => {
    isManuallyStoppedRef.current = false;
    return new Promise<void>((resolve, reject) => {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
          alert("Navegador não suporta SpeechRecognition.");
          return reject("Not supported");
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "pt-BR";
        recognition.interimResults = true; 
        recognition.continuous = true; 

        finalTranscriptRef.current = "";
        setTranscript("");

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscriptRef.current += event.results[i][0].transcript + " ";
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          const fullText = (finalTranscriptRef.current + interimTranscript).trim();
          setTranscript(fullText);
          console.log("Transcrição acumulada:", fullText);
        };

        recognition.onend = () => {
          if (!isManuallyStoppedRef.current) {
            console.log("Reinicio automático do reconhecimento...");
            try {
              recognition.start();
            } catch (e) {
              console.warn("Erro ao reiniciar reconhecimento:", e);
            }
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'no-speech') return; 
          console.error("Erro Reconhecimento:", event.error);
        };

        recognition.onstart = () => {
          console.log("Microfone ativo.");
          resolve();
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        reject(err);
      }
    });
  }, []);

  const stop = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      if (!recognitionRef.current) {
        resolve("");
        return;
      }

      isManuallyStoppedRef.current = true;
      
      const onEndFinal = () => {
        const finalText = finalTranscriptRef.current.trim();
        console.log("Captura finalizada:", finalText);
        resolve(finalText);
      };

      recognitionRef.current.onend = onEndFinal;
      recognitionRef.current.stop();
    });
  }, []);

  return { start, stop, transcript };
}
