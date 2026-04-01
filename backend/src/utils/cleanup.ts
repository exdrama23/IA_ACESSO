import cron from 'node-cron';
import { prisma } from '../lib/prisma';

export async function runDatabaseCleanup() {
  const startTime = Date.now();

  try {
    const now = new Date();

    const auditLimit = new Date(now);
    auditLimit.setDate(now.getDate() - 7);
    const deletedAudit = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditLimit } } });

    const apiCallLimit = new Date(now);
    apiCallLimit.setDate(now.getDate() - 7);
    const deletedApiCalls = await prisma.apiCall.deleteMany({ where: { createdAt: { lt: apiCallLimit } } });

    const chatLimit = new Date(now);
    chatLimit.setDate(now.getDate() - 60);
    const deletedChat = await prisma.chatHistory.deleteMany({ where: { createdAt: { lt: chatLimit } } });

    const loginLimit = new Date(now);
    loginLimit.setMonth(now.getMonth() - 4);
    const deletedLogins = await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: loginLimit } } });

    const duration = Date.now() - startTime;
    console.log(`[CLEANUP] Concluído em ${duration}ms:`);
    console.log(` - AuditLogs removidos: ${deletedAudit.count}`);
    console.log(` - ApiCalls removidos: ${deletedApiCalls.count}`);
    console.log(` - ChatHistory removidos: ${deletedChat.count}`);
    console.log(` - LoginAttempts removidos: ${deletedLogins.count}`);

  } catch (error) {
    console.error('[CLEANUP] Erro durante a limpeza do banco:', error);
  }
}

export function initCleanupSchedule() {
  cron.schedule('0 3 * * *', () => {
    runDatabaseCleanup();
  });
}
