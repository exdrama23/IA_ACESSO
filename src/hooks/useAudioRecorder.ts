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

  const start = useCallback(() => {
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
          let current = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          finalTranscriptRef.current = current;
          setTranscript(current);
          console.log("Transcrevendo:", current);
        };

        recognition.onerror = (event: any) => {
          console.error("Erro Reconhecimento:", event.error);
          if (event.error !== 'no-speech') reject(event.error);
        };

        recognition.onstart = () => {
          console.log("Gravando áudio...");
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

      recognitionRef.current.onend = () => {
        console.log("Gravação finalizada. Texto:", finalTranscriptRef.current);
        resolve(finalTranscriptRef.current);
      };

      recognitionRef.current.stop();
    });
  }, []);

  return { start, stop, transcript };
}
