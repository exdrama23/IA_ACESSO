import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { trackAICall } from "../services/costTracker";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  duration?: number;
  format: string;
  bytes: number;
}

export async function uploadAudioToCloudinary(
  audioBuffer: Buffer,
  filename: string = `audio_${Date.now()}.mp3`
): Promise<CloudinaryUploadResult> {
  
  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error("Buffer de áudio inválido ou vazio");
  }

  return new Promise((resolve, reject) => {
    
    const safeBaseName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, "");
    const publicId = `${safeBaseName}_${Date.now()}`;

    console.log(`[CLOUDINARY] Upload NÃO ASSINADO (Preset: ml_default): ${publicId}`);
    
    const stream = cloudinary.uploader.unsigned_upload_stream(
      'ml_default', 
      {
        resource_type: 'video',
        public_id: publicId,
        folder: 'acessoia/audio'
      },
      (error, result) => {
        if (error) {
          console.error('[CLOUDINARY] Erro upload (Unsigned Stream):', error);
          reject(error);
        } else {
          console.log(`[CLOUDINARY] Sucesso: ${result?.public_id}`);
          
          
          trackAICall('cloudinary', { type: 'audio_storage' }).catch(console.error);

          resolve({
            secure_url: result!.secure_url,
            public_id: result!.public_id,
            duration: result!.duration,
            format: result!.format,
            bytes: result!.bytes
          });
        }
      }
    );

    stream.end(audioBuffer);
  });
}

export async function deleteAudioFromCloudinary(publicId: string): Promise<void> {
  try {

    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    console.log(`[CLOUDINARY] Áudio deletado: ${publicId}`);
  } catch (error) {
    console.error('[CLOUDINARY] Erro ao deletar:', error);
  }
}

export function generateOptimizedUrl(publicId: string, options?: {
  quality?: 'auto' | 'best' | 'low';
  format?: string;
}): string {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    quality: options?.quality || 'auto',
    format: options?.format || 'auto'
  });
}
