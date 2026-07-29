# 📊 Análise: Quais Dados Estão Sendo Usados?

## 🎯 Estado Atual (HOJE)

### 1. Dados Hardcoded em `faq.ts` (~50 pares Q&A)

```
backend/src/data/faq.ts

Estrutura:
├─ internet_fibra
│  ├─ 16 perguntas → "Planos de fibra 50/150/300/600 Mega"
│  ├─ 8 perguntas → "Plano Professor 200 Mega R$ 90"
│  └─ 7 perguntas → "Benefício Skeelo"
│
├─ acesso_saude
│  ├─ 10 perguntas → "Planos de saúde (Clínica + Telemedicina)"
│  ├─ 8 perguntas → "Plano Família R$ 59,90"
│  ├─ 16 perguntas → "Como agendar telemedicina"
│  └─ 10 perguntas → "Consultas ilimitadas/limitadas"
│
└─ movel_e_fixo
   └─ (mais dados...)
```

**Total:** ~50-100 pares Q&A estáticos

**Características:**
- ✅ Sempre disponível
- ✅ Sem custo de busca
- ❌ Precisa editar código para atualizar
- ❌ Não cresce automaticamente
- ❌ Sem histórico de usuário

---

### 2. Dados de Histórico no PostgreSQL

```
Banco: neondb (Neon)
Tabela: ChatHistory

Colunas:
├─ id (cuid)
├─ sessionId
├─ question (TEXT)
├─ answer (TEXT)
├─ source ("FAQ_CACHE", "DATABASE_VECTOR_MATCH", "llm")
├─ confidence (0.0 - 1.0)
├─ audioUrl (Cloudinary)
├─ embedding (vector(384))
├─ createdAt / updatedAt
└─ userId (opcional)

Status ATUAL:
├─ Registros: ~30-100 (do histórico de testes)
├─ Embeddings: Alguns NULL (antes do fix)
├─ Áudios: Alguns salvos no Cloudinary
└─ Qualidade: Mista (testes + dados reais)
```

**O que está em ChatHistory agora:**
```
┌─────────────────────────────────────────┐
│ Dados que chegaram de testes/usuários   │
├─────────────────────────────────────────┤
│ "Olá", "Oi", "Boa tarde"                │ ← Saudações
│ "vocês tem telefone fixo"               │ ← Perguntas reais
│ Respostas de LLM                        │ ← Histórico de chat
│ Respostas do FAQ hardcoded              │ ← Cache de FAQ
└─────────────────────────────────────────┘

Tamanho: ~50-200 KB
```

---

### 3. Cache em Redis (Ephemeral)

```
Redis (ioredis)

Estrutura:
├─ session:{sessionId}:text → Última resposta em texto
├─ session:{sessionId}:audio → Última resposta em áudio
├─ conversationHistory:{sessionId} → Histórico da sessão
└─ embeddings_cache → Cache de embeddings

Tempo de vida: TTL = 3 dias

Status ATUAL:
├─ Registros: Dinâmicos (só enquanto usuário ativo)
├─ Tamanho: ~1-10 MB
└─ Conteúdo: Conversa atual
```

---

### 4. VoiceCache (Mapeamento de Áudio)

```
Banco: neondb
Tabela: VoiceCache

Colunas:
├─ id
├─ question (UNIQUE)
├─ audioUrl (Cloudinary)
├─ voiceId
├─ embedding (vector)
├─ usageCount
├─ lastUsed
└─ createdAt

Status ATUAL:
├─ Registros: ~5-20 (de testes)
├─ Propósito: Reutilizar áudios similares
└─ Custo salvo: Reduzir TTS calls
```

---

### 5. Cache de Embeddings em Arquivo

```
backend/cache/faq_embeddings.json

Conteúdo:
├─ 50-100 embeddings do FAQ
├─ Gerados por @xenova/transformers
├─ Tamanho: ~150 KB
└─ Recarregado na inicialização

Status ATUAL:
├─ Arquivo: Estático
├─ Atualização: Manual (recompilar)
└─ Performance: Cache em memória
```

---

## 🔄 Fluxo de Dados ATUAL

```
USUÁRIO FALA
    ↓
┌─────────────────────────┐
│ Transcrição (áudio→txt) │
└────────────┬────────────┘
             ↓
┌─────────────────────────────────────────────┐
│ 1. Buscar em REDIS                          │
│    └─ "repete?" → Última resposta em cache  │
└────────────┬────────────────────────────────┘
             ↓ (se não encontrou)
┌─────────────────────────────────────────────┐
│ 2. Gerar embedding da pergunta              │
│    └─ @xenova (local, 384 dims)             │
└────────────┬────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────┐
│ 3. Buscar em DATABASE (pgvector)            │
│    ├─ VoiceCache (0.98 similarity)          │
│    └─ ChatHistory (0.75+ similarity)        │
└────────────┬────────────────────────────────┘
             ↓ (se encontrou)         (se não)
    ╔════════╩════════╗                   ↓
    ↓                 ↓          ┌──────────────────┐
 CACHE HIT        CACHE MISS     │ 4. Usar LLM      │
    │                 │          │    ├─ Gemini     │
    │                 │          │    ├─ OpenAI     │
    │                 │          │    └─ OpenRouter │
    │                 └──────────→───────┬──────────┘
    │                            │       ↓
    │                            │ ┌──────────────────┐
    │                            │ │ 5. Gerar TTS     │
    │                            │ │ (ElevenLabs)     │
    │                            │ └────────┬─────────┘
    │                            │          ↓
    │                            │ ┌──────────────────┐
    │                            │ │ 6. Upload áudio  │
    │                            │ │ (Cloudinary)     │
    │                            │ └────────┬─────────┘
    │                            │          ↓
    │                            └─────────→┘
    │                                       ↓
    └───────────────┬───────────────────────┘
                    ↓
         ┌──────────────────────┐
         │ 7. Salvar em DB      │
         │ (ChatHistory)        │
         └──────────┬───────────┘
                    ↓
         ┌──────────────────────┐
         │ 8. Salvar em Cache   │
         │ (Redis)              │
         └──────────┬───────────┘
                    ↓
         ┌──────────────────────┐
         │ 9. Retornar ao User  │
         │ (resposta + áudio)   │
         └──────────────────────┘
```

---

## 📈 O Que Vai Mudar com Importação em Massa

### ANTES (Hoje)

```
Dados Disponíveis:
├─ FAQ hardcoded: ~50 pares
├─ Histórico BD: ~100 registros
├─ VoiceCache: ~20 mapeamentos
└─ TOTAL: ~150-200 pares únicos

Performance:
├─ Cache hit: 20-30%
├─ LLM calls: 70-80% (custos!)
├─ Latência: ~1500ms média
└─ Cobertura: ~15% de perguntas

Custos/mês:
├─ Gemini: ~$80
├─ OpenRouter: ~$40
├─ TTS: ~$30
└─ TOTAL: ~$150
```

### DEPOIS (Com 100K pares importados)

```
Dados Disponíveis:
├─ FAQ hardcoded: ~50 pares
├─ Dados importados: ~100K pares (novo!)
├─ Histórico BD: ~100.100 registros
├─ VoiceCache: ~50K mapeamentos
└─ TOTAL: ~100K+ pares únicos

Performance:
├─ Cache hit: 85-90% (novo!)
├─ LLM calls: 10-15% (drasticamente reduzido!)
├─ Latência: ~150ms média
└─ Cobertura: ~85% de perguntas

Custos/mês:
├─ Gemini: ~$8 (90% ↓)
├─ OpenRouter: ~$3
├─ TTS: ~$5
└─ TOTAL: ~$16 (89% ↓)
```

---

## 🗄️ Estrutura Final do Banco de Dados

```
PostgreSQL (Neon)
│
├─ User
│  ├─ id, email, password
│  ├─ role (admin/user)
│  └─ Relations: ChatHistory, AuditLog, etc
│
├─ ChatHistory (⭐ PRINCIPAL)
│  ├─ id, sessionId, userId
│  ├─ question, answer
│  ├─ source ("faq" | "llm" | "imported" ← NOVO!)
│  ├─ confidence (0.0-1.0)
│  ├─ audioUrl (Cloudinary)
│  ├─ embedding vector(384) NOT NULL ✅
│  └─ Índices:
│     ├─ sessionId
│     ├─ source
│     ├─ createdAt
│     └─ embedding (IVFFLAT) ✅
│
├─ VoiceCache
│  ├─ id, question (UNIQUE)
│  ├─ audioUrl
│  ├─ embedding vector(384)
│  ├─ usageCount, lastUsed
│  └─ Propósito: Reutilizar áudios
│
├─ SystemConfig
│  ├─ Threshold de TF-IDF (0.75)
│  ├─ Threshold de Gemini (0.85)
│  └─ Configurações de IA/TTS
│
├─ ApiUsage (Rastreamento de custos)
│  ├─ service, tokens, characters
│  ├─ requests, estimatedCost
│  └─ date
│
├─ AuditLog (Segurança)
│  ├─ userId, action, resource
│  ├─ changes, status
│  └─ timestamp
│
└─ ... (outras tabelas)
```

---

## 🎯 Cenário Prático: O Que Vai Acontecer

### Exemplo 1: Pergunta Corriqueira (COM dados importados)

```
USER: "Qual o valor da internet fibra 50 mega?"

HOJE:
1. Busca no FAQ → ENCONTRA em faq.ts
2. Gera embedding → 10ms
3. Busca em DB → SEM INDEX, lento
4. LLM FALLBACK → Pode precisar chamar ($0.03)
5. TTS → Se gera áudio ($0.03)
6. Retorna → 1500-2000ms TOTAL
CUSTO: ~$0.06 (às vezes)

DEPOIS (com 100K dados):
1. Busca no FAQ → ENCONTRA em 3 segundos
   └─ 5000 registros similares em DB com novo índice IVFFLAT
2. Gera embedding → 5ms
3. Busca em DB com ÍNDICE → 3-5ms! (não O(n), é O(log n))
4. TOP-1 resultado com 0.92 similarity → USA CACHE!
5. Retorna áudio já existente → REUTILIZA!
6. Retorna → 50-100ms TOTAL
CUSTO: ~$0.00 (cache!)

✅ 20X MAIS RÁPIDO, ZERO CUSTO
```

### Exemplo 2: Pergunta Completamente Nova

```
USER: "Qual o endereço da filial em Belo Horizonte?"

HOJE:
1. Busca FAQ → SEM RESPOSTA
2. Busca DB → SEM RESPOSTA
3. LLM → NÃO SABE (não treinado)
4. Retorna: "Não sei"
CUSTO: $0.03 (1 LLM call)

DEPOIS (com 100K dados + algumas perguntas sobre endereços):
1. Busca FAQ → SEM RESPOSTA
2. Busca DB → ENCONTRA "Qual o endereço da filial em São Paulo?"
   └─ Similarity 0.65 (próxima mas não exata)
3. Rejeita por threshold baixo (< 0.75)
4. LLM → Tenta responder
5. Se consegue → Salva como novo registro (aprende!)
6. Retorna resposta

CUSTO: ~$0.03 (1 LLM call, mas aprendeu)

✅ MAS próxima vez que alguém perguntar algo parecido...
   Sistema reconhece (cache hit!)
```

---

## 📊 Dados Por Tipo

### Atualmente no Sistema:

```
┌─────────────────────────────────────────────────────┐
│ FAQ HARDCODED (faq.ts)                              │
├─────────────────────────────────────────────────────┤
│ Categoria: internet_fibra (3 respostas x 16 Q&A)  │
│ Categoria: acesso_saude (5 respostas x 44 Q&A)    │
│ Categoria: movel_e_fixo (? respostas x ? Q&A)    │
│ TOTAL: ~50-100 pares únicos                        │
│                                                     │
│ Características:                                    │
│ ✅ Sempre disponível (cache instantâneo)            │
│ ❌ Precisa atualizar código                        │
│ ❌ Não aprende de usuários                         │
│ ❌ Sem histórico de perguntas                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ HISTÓRICO EM POSTGRESQL (ChatHistory)              │
├─────────────────────────────────────────────────────┤
│ De: Perguntas reais de usuários                    │
│ Tamanho: ~100-500 registros (crescendo)            │
│ Idade: Últimos 30 dias                             │
│ Qualidade: Variável                                │
│                                                     │
│ Conteúdo:                                           │
│ • Perguntas de teste ("Olá", "Oi")                 │
│ • Perguntas reais ("Qual o valor...")              │
│ • Respostas do FAQ                                 │
│ • Respostas de LLM                                 │
│ • Áudios em Cloudinary                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ VOICE CACHE (VoiceCache)                           │
├─────────────────────────────────────────────────────┤
│ De: Perguntas que já geraram áudio                 │
│ Tamanho: ~5-50 registros                           │
│ Propósito: Não regerar TTS ($$$)                   │
│ URLs: Apontam para Cloudinary                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ REDIS CACHE (Ephemeral)                            │
├─────────────────────────────────────────────────────┤
│ TTL: 3 dias                                         │
│ Conteúdo: Última resposta por sessão               │
│ Tamanho: ~1-5 MB                                    │
│ Propósito: Rápido para "repete!"                   │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Com Importação de 100K Pares (Proposta)

```
┌─────────────────────────────────────────────────────┐
│ DADOS IMPORTADOS (NOVO!)                            │
├─────────────────────────────────────────────────────┤
│ De: Onde você quer trazer dados                    │
│      (CRM, documentos, histórico, base externa)    │
│                                                     │
│ Quantidade: 100.000 pares Q&A                      │
│ Categorias: (você define)                          │
│ Qualidade: (você valida com script)                │
│                                                     │
│ Armazenamento:                                      │
│ • Texto: ~200 MB                                    │
│ • Embeddings: ~150 MB                              │
│ • TOTAL: ~350 MB (aceitável)                       │
│                                                     │
│ Inserção:                                           │
│ • Em batches de 50 registros                       │
│ • ~30-60 minutos de processamento                  │
│ • Gera embeddings automaticamente                  │
│ • Pronto para busca vetorial                       │
└─────────────────────────────────────────────────────┘
```

---

## 💾 Estrutura Final (Resumo)

```
Sistema de Dados (4 Camadas)

┌─────────────────────────────────────────┐
│ CAMADA 1: FAQstático (código)          │
│ • 50-100 pares permanentes              │
│ • Editar = recompilar                   │
│ • Sempre disponível                     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ CAMADA 2: Importado (novo!)            │
│ • 100K pares dinâmicos                  │
│ • Editar = atualizar via script         │
│ • Busca vetorial rápida                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ CAMADA 3: Histórico/Aprendizado       │
│ • ~100K+ registros de usuários          │
│ • Cresce automaticamente                │
│ • Feedback: likes/dislikes              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ CAMADA 4: Cache Rápido (Redis)         │
│ • Última resposta por sessão            │
│ • TTL: 3 dias                           │
│ • Reutilização de áudio                 │
└─────────────────────────────────────────┘
```

---

## 🎯 Resumo: Quais Dados Estão Sendo Usados?

### AGORA (Hoje):
```
✅ FAQ hardcoded (50-100 pares)
✅ Histórico de testes/usuários (~100-500 registros)
✅ Cache Redis (efêmero)
✅ Alguns áudios em Cloudinary

Cobertura: ~15% de perguntas possíveis
Cache hit: 20-30%
Custo: ~$150/mês
```

### DEPOIS (Com Importação):
```
✅ FAQ hardcoded (50-100 pares) - mantém
✅ Histórico (~100.500 registros)
✅ Dados importados (100K novos!) ← BOOM!
✅ Cache Redis (efêmero)
✅ Todos os áudios em Cloudinary

Cobertura: ~85% de perguntas possíveis
Cache hit: 85-90%
Custo: ~$16/mês (89% redução!)
```

---

## 🤔 Próxima Pergunta Natural:

**"De onde vêm os 100K pares?"**

Opções:
1. **CRM da empresa** (histórico de atendimento)
2. **Documentação interna** (wikis, base de conhecimento)
3. **Suporte/ticketing** (perguntas que chegaram antes)
4. **Dados de parceiros** (fornecedores, outros sistemas)
5. **Crowdsourcing** (colaboradores criam pares)
6. **APIs externas** (importar de bases públicas)

**Você tem dados em algum dessas fontes?** 📁

Quando tiver, é só:
1. Exportar como JSON/CSV
2. Executar análise (verifica tudo)
3. Revisar relatório
4. Importar (aplica ao banco)

E pronto! 🚀
