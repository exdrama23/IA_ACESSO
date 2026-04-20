const redis = require('ioredis');
require('dotenv').config();

const client = new redis(process.env.REDIS_URL);

const configKeys = [
  'config:embedding:strategy',
  'config:embedding:tfidf_threshold',
  'config:embedding:gemini_threshold',
  'config:chat:primary',
  'config:chat:fallback',
  'config:chat:tertiary',
  'config:chat:useFallback',
  'config:audio:storage',
  'config:audio:ttl_seconds',
  'config:tts:model',
  'config:cache:max_per_session',
  'config:admin:last_modified',
  'config:admin:modified_by',
  'config:admin:version'
];

(async () => {
  try {
    console.log('[RESET] 🔄 Conectando ao Redis...');
    
    let deleted = 0;
    for (const key of configKeys) {
      const result = await client.del(key);
      if (result > 0) {
        console.log(`[RESET] ✅ Deletado: ${key}`);
        deleted++;
      }
    }

    console.log(`\n[RESET] 🎉 Configuração resetada! ${deleted} chaves deletadas.`);
    console.log('[RESET] 📝 Sistema agora usa DEFAULT_CONFIG (strategy: "hybrid")\n');
    
    await client.quit();
    process.exit(0);
  } catch (error) {
    console.error('[RESET] ❌ Erro:', error.message);
    process.exit(1);
  }
})();
