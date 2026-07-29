import { prisma } from '../lib/prisma';
import { client } from '../cache/redis';

async function cleanDatabase() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Script de limpeza não pode ser executado em produção!');
    process.exit(1);
  }

  try {
    console.log('🗑️ Iniciando limpeza de dados...');

    // Limpar dados do PostgreSQL
    console.log('\n📊 Limpando banco de dados PostgreSQL...');
    
    const deletedChatHistory = await prisma.chatHistory.deleteMany({});
    console.log(`✓ ChatHistory: ${deletedChatHistory.count} registros removidos`);

    const deletedAuditLogs = await prisma.auditLog.deleteMany({});
    console.log(`✓ AuditLogs: ${deletedAuditLogs.count} registros removidos`);

    const deletedApiCalls = await prisma.apiCall.deleteMany({});
    console.log(`✓ ApiCalls: ${deletedApiCalls.count} registros removidos`);

    const deletedLoginAttempts = await prisma.loginAttempt.deleteMany({});
    console.log(`✓ LoginAttempts: ${deletedLoginAttempts.count} registros removidos`);

    // Limpar Redis
    console.log('\n🔴 Limpando cache Redis...');
    
    await client.flushdb();
    console.log(`✓ Redis: Cache limpo completamente`);

    console.log('\n✅ Limpeza concluída com sucesso!');
    console.log('\nResumo:');
    console.log(`  - ChatHistory deletados: ${deletedChatHistory.count}`);
    console.log(`  - AuditLogs deletados: ${deletedAuditLogs.count}`);
    console.log(`  - ApiCalls deletados: ${deletedApiCalls.count}`);
    console.log(`  - LoginAttempts deletados: ${deletedLoginAttempts.count}`);
    console.log(`  - Redis: Totalmente limpo`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante limpeza:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanDatabase();
