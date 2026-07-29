# 🔧 Problemas Técnicos Encontrados no Sistema Atual

## CRÍTICO: Embeddings Opcionais

### Problema Identificado
```sql
-- schema.prisma
embedding Unsupported("vector(384)")?  -- ⚠️ OPCIONAL COM ?
```

**Impacto**: 
- Buscas vetoriais falham silenciosamente
- Sistema cai para busca textual (menos preciso)
- Com milhares de dados, accuracy cai drasticamente

### Solução
```sql
-- Corrigir para:
embedding vector(384) NOT NULL
```

---

## CRÍTICO: Sem Índice Vetorial de Busca

### Problema Identificado
```typescript
// neuralEmbeddings.ts
async searchInFAQ(query: string): Promise<FAQMatch[]> {
  const queryEmbedding = ...;
  
  // ⚠️ LOOP LINEAR O(n) - MORRE COM 100K DADOS
  for (const item of this.faqEmbeddings) {
    const score = this.cosineSimilarity(
      queryEmbedding,
      item.embedding
    );
    // ... comparar score
  }
}
```

**Performance Esperada**:
- 100 itens: ~2ms ✓
- 10K itens: ~200ms ⚠️
- 100K itens: ~2s ❌ (timeout!)

### Solução (Query Vetorial)
```typescript
// Usar pgvector do PostgreSQL
const similar = await prisma.$queryRaw`
  SELECT 
    id, question, answer, confidence,
    (embedding <=> $1::vector(384)) as distance
  FROM "ChatHistory"
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> $1::vector(384)
  LIMIT 5;
`;
// Com índice HNSW: ~3-5ms mesmo com 1M de registros ✅
```

---

## CRÍTICO: TTS Redundante

### Problema Identificado
```typescript
// chat.ts (linha ~300)
// SEMPRE gera áudio, mesmo em cache hit

if (cacheHit) {
  const cachedAudio = await getCache(key);
  // ⚠️ MAS DEPOIS REGERA ÁUDIO
  const novoAudio = await gerarAudio(resposta);  // Desperdício!
}
```

**Custo Mensal**:
- 1K perguntas/dia × 30 dias = 30K TTS calls
- 30K × $0.03/call = **$900/mês desnecessário** ❌

### Solução
```typescript
// Armazenar audioUrl junto com resposta
if (cacheHit) {
  const { answer, audioUrl } = cached;
  
  // Se já tem áudio, reutilizar
  if (audioUrl) {
    return { answer, audioUrl };  // ✅ $0 custo
  }
  
  // Só gerar se não tiver
  const newAudio = await gerarAudio(answer);
  await cache.set(key, { answer, audioUrl: newAudio });
  return { answer, audioUrl: newAudio };
}
```

---

## CRÍTICO: Cache Hit Rate Baixa

### Problema Identificado
```typescript
// Apenas ~30-40% de hit rate com 50 FAQ

// MOTIVO 1: Embeddings com threshold alto (0.85)
const GEMINI_THRESHOLD = 0.85;  // ⚠️ Muito restritivo

// MOTIVO 2: Perguntas levemente diferentes não matcham
"Qual o valor da internet fibra?"
"Quanto custa a fibra?"
// São semanticamente iguais, mas texto diferente
// Threshold 0.85 rejeita a segunda
```

**Com 100K pares**: Deveria ser 85-90% hit rate

### Solução
```typescript
// 1. Lowering threshold baseado em dados
const OPTIMIZED_THRESHOLD = 0.65;  // Menos rigoroso

// 2. Variações de perguntas
// Para cada resposta, guardar múltiplas formas

{
  answer: "Plano Fibra 50 Mega por R$ 79,90",
  questions: [
    "Qual o valor da internet fibra 50 mega?",
    "Quanto custa fibra 50 mega?",
    "Preço da fibra 50 megas",
    "Qual é o valor do plano de 50 megas?",
    // ... 10+ variações
  ]
}

// 3. Threshold adaptativo
const threshold = 0.65 + (confidence * 0.2);
// Quanto mais confiante, menos rigoroso
```

---

## CRÍTICO: Falta de Deduplicação

### Problema Identificado
```
FAQ atual tem perguntas duplicadas/similares:

"Qual o preço da internet fibra?"
"Qual o valor da internet fibra?"
"Quanto custa a internet fibra?"
"Qual é o valor da fibra?"
→ Todas apontam para mesma resposta

Espaço desperdiçado com 100K dados!
```

### Solução
```typescript
async function deduplicateQuestions() {
  const allQuestions = await prisma.chatHistory.findMany({
    select: { id, question, embedding }
  });
  
  const duplicates = new Map();
  
  for (let i = 0; i < allQuestions.length; i++) {
    for (let j = i + 1; j < allQuestions.length; j++) {
      const similarity = cosineSimilarity(
        allQuestions[i].embedding,
        allQuestions[j].embedding
      );
      
      if (similarity > 0.95) {  // Praticamente iguais
        // Manter apenas a melhor
        duplicates.set(allQuestions[j].id, allQuestions[i].id);
      }
    }
  }
  
  // Remover duplicatas
  for (const dupId of duplicates.keys()) {
    await prisma.chatHistory.delete({ where: { id: dupId } });
  }
  
  console.log(`Removidas ${duplicates.size} duplicatas`);
}
```

---

## CRÍTICO: Sem Feedback Loop

### Problema Identificado
```
Sistema não aprende com usuário:

User: "Qual o valor da fibra?"
System: [Cache hit] "Plano Fibra 50 Mega R$ 79,90"
User: [Não gostou da resposta] ❌
  → Sistema NÃO SABE que a resposta foi ruim

User: [Tenta novamente]
System: [Mesmo resultado] ❌❌
```

### Solução
```typescript
// Adicionar modelo Feedback
model Feedback {
  id        String   @id @default(cuid())
  chatId    String
  chat      ChatHistory @relation(...)
  
  rating    Int      // 1-5 stars
  comment   String?  @db.Text
  wasHelpful Boolean // true/false
  
  correctedAnswer String? @db.Text  // Se usuário corrigir
  
  createdAt DateTime @default(now())
  
  @@index([chatId])
  @@index([rating])
}

// Usar feedback para ajustar confiança
const newConfidence = 
  (existingConfidence + avgRating / 5) / 2;

// Desativar respostas com rating baixo
if (confidence < 0.3) {
  // Forçar LLM mesmo em cache hit
  useCache = false;
}
```

---

## IMPORTANTE: Armazenamento Ineficiente

### Problema Identificado
```
Cada embedding (384 dims, float32) = 1.536 KB
Com 100K: 100K × 1.536 KB = 153 MB

MAS EM MEMÓRIA (ChatGPT style):
100K embeddings × 384 dims × float32 = 153 MB

Com 1M: 1.5 GB (ainda ok para um servidor)
Com 10M: 15 GB (problema!)
```

### Solução: Sharding + Lazy Loading
```typescript
// 1. Dividir por categoria
const shards = {
  "internet": 40000,      // 40% de dados
  "saude": 30000,         // 30% de dados
  "admin": 20000,         // 20% de dados
  "outros": 10000         // 10% de dados
};

// 2. Carregar apenas shard necessário
async function detectCategory(question: string) {
  // LLM rápido só pra categoria
  const category = await quickCategorize(question);
  
  // Carregar embedding shard específico
  const shard = loadShard(category);
  
  return searchInShard(question, shard);
}
```

---

## IMPORTANTE: Sem Versionamento de Modelo

### Problema Identificado
```
Usar sempre "Xenova/all-MiniLM-L6-v2"

MAS quando atualizar?
- Novo modelo disponível
- Fine-tuning no modelo atual
- Rollback necessário?

Sem versionamento = impossível A/B test!
```

### Solução
```typescript
model EmbeddingVersion {
  id           String   @id
  version      String   @unique  // "v1", "v1.1-finetuned"
  modelName    String             // "Xenova/all-MiniLM-L6-v2"
  dimensions   Int                // 384
  isActive     Boolean  @default(false)
  accuracy     Float?             // 0.85
  latency_ms   Int?               // 12
  
  createdAt    DateTime @default(now())
  
  @@index([isActive])
}

// Usar versão ativa
const activeVersion = await getActiveEmbeddingVersion();
const embedding = await generateEmbedding(text, activeVersion);

// A/B test fácil
await activateVersion("v1.1-finetuned");
```

---

## IMPORTANTE: Sem Observabilidade

### Problema Identificado
```
Não sabe:
- Qual % das perguntas são cache hits?
- Qual categoria tem melhor accuracy?
- Qual modelo (Gemini vs OpenAI) é melhor?
- Tempo médio de resposta?
- Embeddings mais usados?
```

### Solução: Logs Estruturados + Métricas
```typescript
interface QueryMetrics {
  question: string;
  category?: string;
  cacheHit: boolean;
  confidence: number;
  responseTime_ms: number;
  modelUsed: "cache" | "gemini" | "openai" | "openrouter";
  rating?: number;
  
  timestamp: Date;
}

// Salvar metrics
await prisma.queryMetrics.create({ data: metrics });

// Dashboard Grafana
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as total,
  SUM(CASE WHEN cacheHit THEN 1 ELSE 0 END)::float / COUNT(*) as hitRate,
  AVG(responseTime_ms) as avgLatency,
  AVG(confidence) as avgConfidence
FROM query_metrics
GROUP BY hour
ORDER BY hour DESC;
```

---

## Resumo dos Problemas

```
┌─────────────────────────────────────────┬──────┬─────────────┐
│ Problema                                │ Sev  │ Fix Time    │
├─────────────────────────────────────────┼──────┼─────────────┤
│ 1. Embeddings Opcionais                 │ 🔴   │ 1h          │
│ 2. Sem Índice Vetorial                  │ 🔴   │ 2h          │
│ 3. TTS Redundante                       │ 🔴   │ 3h          │
│ 4. Cache Hit Rate Baixa                 │ 🟠   │ 2h          │
│ 5. Falta de Deduplicação                │ 🟠   │ 4h          │
│ 6. Sem Feedback Loop                    │ 🟠   │ 6h          │
│ 7. Armazenamento Ineficiente            │ 🟡   │ 4h          │
│ 8. Sem Versionamento                    │ 🟡   │ 3h          │
│ 9. Falta de Observabilidade             │ 🟡   │ 5h          │
└─────────────────────────────────────────┴──────┴─────────────┘

🔴 CRÍTICO: 3 × 1-3h = ~3 horas
🟠 IMPORTANTE: 3 × 2-6h = ~12 horas  
🟡 DEVERIA: 3 × 3-5h = ~12 horas

TOTAL: ~27 horas de trabalho para optimizar
```

---

## Recomendação

**1️⃣ FAZER IMEDIATAMENTE** (3 horas):
- Corrigir schema (NOT NULL)
- Adicionar índice vetorial
- Remover TTS redundante

**2️⃣ FAZER PRÓXIMA SPRINT** (12 horas):
- Implementar deduplicação
- Adicionar feedback loop
- Melhorar hit rate com threshold adaptativo

**3️⃣ FAZER DEPOIS** (12 horas):
- Otimizar armazenamento
- Versionar modelo
- Adicionar observabilidade

**Com essas correções**: Pronto para 100K+ pares Q&A! 🚀
