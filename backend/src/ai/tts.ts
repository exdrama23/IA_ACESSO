import axios from "axios";
import { getConfig } from "../config/settings";
import { uploadAudioToCloudinary } from "../services/cloudinary";
import { trackAICall } from "../services/costTracker";

export async function gerarAudio(texto: string): Promise<string> {
  const config = await getConfig();
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
  const VOICE_ID = config.tts.voiceId || "hpp4J3VqNfWAUOO0d1Us"; 

  let audioBuffer: Buffer | null = null;

  if (ELEVENLABS_API_KEY) {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
    try {
      const response = await axios({
        method: 'post',
        url: url,
        data: {
          text: texto,
          model_id: "eleven_v3", 
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        },
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': ELEVENLABS_API_KEY, 
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer' 
      });

      audioBuffer = Buffer.from(response.data);
      console.log("[ELEVENLABS] Áudio gerado com sucesso");
      
      await trackAICall('elevenlabs', { 
        characters: texto.length, 
        type: 'tts_generation' 
      });
      
    } catch (error: any) {
      console.error("[ELEVENLABS] Erro na API, tentando fallback do Google...");
    }
  }

  if (!audioBuffer) {
    try {
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(texto.substring(0, 200))}&tl=pt-br&client=tw-ob`;
      const response = await axios({
        method: 'get',
        url: googleTtsUrl,
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      audioBuffer = Buffer.from(response.data);
      console.log("[TTS] Áudio gerado via Google Fallback");

      await trackAICall('google-tts', { 
        characters: Math.min(texto.length, 200), 
        type: 'tts_fallback' 
      });
    } catch (e: any) {
      console.error(`[TTS] Erro fatal no fallback:`, e.message);
      return "";
    }
  }

  if (!audioBuffer) {
    return "";
  }

  try {
    const result = await uploadAudioToCloudinary(audioBuffer, `audio_response_${Date.now()}`);
    console.log(`[CLOUDINARY] Áudio salvo com sucesso: ${result.secure_url}`);
    return result.secure_url; 
  } catch (cloudinaryError) {
    console.error("[CLOUDINARY] Erro ao fazer upload:", cloudinaryError);
    return "";
  }
}
