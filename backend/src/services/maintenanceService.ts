import { prisma } from '../lib/prisma';
import { deleteAudioFromCloudinary } from './cloudinary';

export class MaintenanceService {
  /**
   * OPÇÃO C: Invalidação Cirúrgica
   * Localiza respostas que contém um padrão e as marca para revalidação,
   * removendo o áudio físico para forçar a regeração.
   */
  static async invalidateByPattern(pattern: string, adminId?: string) {
    console.log(`[MAINTENANCE] Iniciando invalidação cirúrgica para o padrão: "${pattern}"`);

    try {
      // 1. Localizar registros no ChatHistory usando SQL bruto para evitar erros de tipagem
      const affectedChat = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, "audioPublicId" FROM "ChatHistory" 
        WHERE answer ILIKE $1
      `, `%${pattern}%`);

      // 2. Localizar registros no VoiceCache
      const affectedVoice = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, "audioPublicId" FROM "VoiceCache" 
        WHERE question ILIKE $1
      `, `%${pattern}%`);

      console.log(`[MAINTENANCE] Encontrados ${affectedChat.length} no histórico e ${affectedVoice.length} no cache de voz.`);

      // 3. Deletar áudios do Cloudinary
      const allPublicIds = [
        ...affectedChat.map(r => r.audioPublicId),
        ...affectedVoice.map(r => r.audioPublicId)
      ].filter(id => id !== null && id !== undefined);

      const uniquePublicIds = [...new Set(allPublicIds)];

      for (const publicId of uniquePublicIds) {
        try {
          if (publicId) {
            await deleteAudioFromCloudinary(publicId);
          }
        } catch (err) {
          console.error(`[MAINTENANCE] Erro ao deletar áudio ${publicId} no Cloudinary:`, err);
        }
      }

      // 4. Atualizar ChatHistory: Marca para revalidação e remove URLs de áudio mortas
      await prisma.$executeRawUnsafe(`
        UPDATE "ChatHistory"
        SET "needsRevalidation" = true,
            "audioUrl" = NULL,
            "audioPublicId" = NULL,
            "isVerified" = false
        WHERE answer ILIKE $1
      `, `%${pattern}%`);

      // 5. Limpar VoiceCache
      await prisma.$executeRawUnsafe(`
        DELETE FROM "VoiceCache"
        WHERE question ILIKE $1
      `, `%${pattern}%`);

      // 6. Log de Auditoria
      await prisma.auditLog.create({
        data: {
          userId: adminId || null,
          action: 'INVALIDATE_PATTERN',
          resource: 'ChatHistory/VoiceCache',
          status: 'success',
          changes: { pattern, affectedChat: affectedChat.length, affectedVoice: affectedVoice.length } as any
        }
      });

      console.log(`[MAINTENANCE] Invalidação concluída.`);
      return {
        affectedChat: affectedChat.length,
        affectedVoice: affectedVoice.length,
        audiosDeleted: uniquePublicIds.length
      };
    } catch (error: any) {
      console.error(`[MAINTENANCE] Erro na invalidação cirúrgica:`, error);
      
      await prisma.auditLog.create({
        data: {
          userId: adminId || null,
          action: 'INVALIDATE_PATTERN',
          resource: 'ChatHistory/VoiceCache',
          status: 'error',
          errorMsg: error.message
        }
      });

      throw error;
    }
  }

  /**
   * OPÇÃO A: Invalidação por Versão
   * Marca como "não verificado" tudo que foi gerado com uma versão antiga do conhecimento.
   */
  static async invalidateOldVersions(currentVersion: string, adminId?: string) {
    try {
      // Usamos SQL bruto para garantir que pegamos NULLs e evitamos erros de tipagem do Prisma
      const result = await prisma.$executeRawUnsafe(`
        UPDATE "ChatHistory"
        SET "needsRevalidation" = true,
            "isVerified" = false
        WHERE "knowledgeVersion" IS NULL OR "knowledgeVersion" <> $1
      `, currentVersion);

      // Log de Auditoria
      await prisma.auditLog.create({
        data: {
          userId: adminId || null,
          action: 'INVALIDATE_VERSION',
          resource: 'ChatHistory',
          status: 'success',
          changes: { currentVersion, recordsAffected: result } as any
        }
      });

      console.log(`[MAINTENANCE] ${result} registros invalidados (versão antiga ou nula).`);
      return result;
    } catch (error: any) {
      console.error(`[MAINTENANCE] Erro na invalidação por versão:`, error);
      
      await prisma.auditLog.create({
        data: {
          userId: adminId || null,
          action: 'INVALIDATE_VERSION',
          resource: 'ChatHistory',
          status: 'error',
          errorMsg: error.message
        }
      });

      throw error;
    }
  }
}
