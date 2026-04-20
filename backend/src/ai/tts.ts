import axios from "axios";
import { getConfig } from "../config/settings";
import { uploadAudioToCloudinary } from "../services/cloudinary";
import { trackAICall } from "../services/costTracker";
import { 
  buscarAudioSimilarEmVoiceCache, 
  incrementarUsageCount, 
  salvarAudioEmVoiceCache 
} from "../services/voiceCacheService";

export async function gerarAudio(texto: string, forcarGeracao: boolean = false): Promise<string> {
  console.log(`\n[TTS] ════════════════════════════════════════`);
  console.log(`[TTS] Processando TTS para: "${texto.substring(0, 80)}..."`);
  console.log(`[TTS] ════════════════════════════════════════`);

  // ============ PASSO 1: BUSCAR EM VOICECACHE ============
  if (!forcarGeracao) {
    const config = await getConfig();
    const VOICE_ID = config.tts.voiceId || "hpp4J3VqNfWAUOO0d1Us";
    
    console.log(`\n[TTS] PASSO 1: Buscando áudio similar em VoiceCache...`);
    
    const audioSimilar = await buscarAudioSimilarEmVoiceCache(texto, VOICE_ID);
    
    if (audioSimilar) {
      console.log(`[TTS] ✓ REUTILIZANDO ÁUDIO EXISTENTE`);
      console.log(`[TTS] Similitude: ${(audioSimilar.similaridade * 100).toFixed(1)}%`);
      console.log(`[TTS] URL: ${audioSimilar.audioUrl}`);
      console.log(`[TTS] Uso anterior: ${audioSimilar.usageCount} vezes`);
      
      // Incrementar uso
      await incrementarUsageCount(audioSimilar.id);
      
      // Registrar economia de custo
      await trackAICall('voice-cache', { 
        characters: texto.length, 
        type: 'tts_cache_hit' 
      });
      
      console.log(`[TTS] ════════════════════════════════════════\n`);
      return audioSimilar.audioUrl;
    }
  }

  console.log(`[TTS] ✗ Nenhum áudio similar encontrado ou geração forçada`);

  // ============ PASSO 2: GERAR NOVO ÁUDIO ============
  console.log(`\n[TTS] PASSO 2: Gerando novo áudio com ElevenLabs...`);
  
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
        responseType: 'arraybuffer',
        timeout: 30000
      });

      audioBuffer = Buffer.from(response.data);
      console.log("[ELEVENLABS] ✓ Áudio gerado com sucesso");
      
      await trackAICall('elevenlabs', { 
        characters: texto.length, 
        type: 'tts_generation' 
      });
      
    } catch (error: any) {
      console.error("[ELEVENLABS] ✗ ERRO CRÍTICO na API ElevenLabs");
      console.error("[ELEVENLABS] Possíveis causas:");
      console.error("[ELEVENLABS] 1. Créditos da ElevenLabs acabou");
      console.error("[ELEVENLABS] 2. API Key inválida ou expirada");
      console.error("[ELEVENLABS] 3. Voice ID não existe");
      console.error("[ELEVENLABS] Detalhes do erro:", error.message);
      
      if (error.response?.status === 429) {
        console.error("[ELEVENLABS] 🚨 ALERTA: LIMITE DE TAXA ATINGIDO - Créditos podem estar esgotados");
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error("[ELEVENLABS] 🚨 ALERTA: AUTENTICAÇÃO FALHOU - Verifique a API Key");
      }
    }
  }

  if (!audioBuffer) {
    console.error(`\n[TTS] ════════════════════════════════════════`);
    console.error(`[TTS] ❌ ERRO FATAL: NENHUM ÁUDIO PODE SER GERADO`);
    console.error(`[TTS] ════════════════════════════════════════`);
    console.error(`[TTS] ⚠️  AÇÃO NECESSÁRIA:`);
    console.error(`[TTS] Créditos da ElevenLabs acabou ou API Key está inválida`);
    console.error(`[TTS] Solução: Um ADMIN deve verificar e atualizar a ELEVENLABS_API_KEY no .env`);
    console.error(`[TTS] Arquivo: backend/.env`);
    console.error(`[TTS] Variável: ELEVENLABS_API_KEY`);
    console.error(`[TTS] ════════════════════════════════════════\n`);
    return "";
  }

  // ============ PASSO 4: UPLOAD PARA CLOUDINARY ============
  console.log(`[TTS] PASSO 4: Fazendo upload para Cloudinary...`);
  
  try {
    const result = await uploadAudioToCloudinary(audioBuffer, `audio_response_${Date.now()}`);
    console.log(`[CLOUDINARY] ✓ Áudio salvo com sucesso`);
    console.log(`[CLOUDINARY] URL: ${result.secure_url}`);

    // ============ PASSO 5: SALVAR EM VOICECACHE ============
    console.log(`[TTS] PASSO 5: Salvando em VoiceCache...`);
    
    const voiceCacheId = await salvarAudioEmVoiceCache(
      texto,
      result.secure_url,
      VOICE_ID
    );

    if (voiceCacheId) {
      console.log(`[TTS] ✓ Áudio indexado em VoiceCache para reutilização futura`);
    }

    console.log(`[TTS] ════════════════════════════════════════\n`);
    return result.secure_url;
  } catch (cloudinaryError) {
    console.error("[CLOUDINARY] ✗ Erro ao fazer upload:", cloudinaryError);
    console.log(`[TTS] ════════════════════════════════════════\n`);
    return "";
  }
}
