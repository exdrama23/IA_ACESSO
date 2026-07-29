# 🎯 Fluxo de Decisão: Cache vs API IA

## ✅ SIM! Essa Regra Já Existe!

O sistema **já implementa exatamente essa lógica** no [backend/src/controllers/chat.ts](backend/src/controllers/chat.ts)

---

## 📊 Fluxo Decisório Atual

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PERGUNTA CHEGA                                            │
│    Exemplo: "Qual o valor da internet 50 Mega?"            │
└────────────┬────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. GERAR EMBEDDING                                           │
│    ├─ Converte pergunta em vetor 384 dimensões             │
│    └─ Usa @xenova/transformers (local, sem API)            │
└────────────┬────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. BUSCAR NO BANCO (pgvector)                               │
│    ├─ SIMILARITY THRESHOLD: 0.85 (alta precisão)           │
│    ├─ Busca em: ChatHistory + FAQ                          │
│    └─ SELECT * WHERE embedding <-> vector > 0.85           │
└────┬──────────────────────────────────┬────────────────────┘
     │                                  │
     ↓ ENCONTROU!                       ↓ NÃO ENCONTROU!
┌──────────────────────┐       ┌────────────────────────┐
│ 4A. USAR CACHE       │       │ 4B. CHAMAR API IA      │
├──────────────────────┤       ├────────────────────────┤
│ ✅ RÁPIDO!           │       │ ⏳ MAIS LENTO           │
│                      │       │                        │
│ source:              │       │ source:                │
│ "DATABASE_           │       │ "IA_GEMINI" |          │
│  VECTOR_MATCH"       │       │ "IA_OPENAI" |          │
│                      │       │ "IA_OPENROUTER"        │
│ confidence: 0.95+    │       │                        │
│                      │       │ Fallback logic:        │
│ Latência: 50-100ms   │       │ 1. Primary provider    │
│ Custo: $0            │       │ 2. Se falha → Fallback │
│                      │       │ 3. Se falha → Tertiary │
│                      │       │ 4. Se tudo falha → MSG │
│                      │       │                        │
│                      │       │ Latência: 1-3 segundos │
│                      │       │ Custo: ~$0.01-0.10     │
│                      │       │                        │
│ Logo: 🚀 RÁPIDO      │       │ Logo: ⏳ ESPERANDO     │
└──────────────┬───────┘       └────────────┬───────────┘
               │                            │
               └────────────┬───────────────┘
                            ↓
            ┌─────────────────────────────────┐
            │ 5. RETORNAR RESPOSTA             │
            │ ├─ text: resposta                │
            │ ├─ audioUrl: TTS se necessário   │
            │ ├─ source: origem                │
            │ └─ confidence: score             │
            └─────────────────────────────────┘
```

---

## 🔍 Código Atual (Prova)

### Backend - chat.ts (Linhas 150-170)

```typescript
// ✅ BUSCA VETORIAL NO HISTÓRICO E FAQ (PGVECTOR)
const vectorMatches = await findSimilarQuestions(questionEmbedding, 0.85, 1);

if (vectorMatches.length > 0) {
  const bestMatch = vectorMatches[0];
  console.log(`[CHAT] Match de alta precisão via PGVECTOR: Similarity: ${bestMatch.similarity.toFixed(3)}`);
  
  respostaText = bestMatch.answer;
  source = "DATABASE_VECTOR_MATCH";  // ✅ CACHE HIT!
  matchScore = bestMatch.similarity;
}

// Se não encontrou no banco, ENTÃO chama IA:
if (!respostaText) {
  try {
    console.log(`[AI] Consultando provedor primário: ${primary}...`);
    respostaText = await askAI(primary, question, contextText, history);
    source = `IA_${primary.toUpperCase()}`;  // ✅ CHAMAR IA!
    
  } catch (primaryError) {
    // Fallback para provedor secundário
    // Se falha → tenta fallback
    // Se fallback falha → tenta tertiary
  }
}
```

---

## 📈 Métricas Atuais (Rastreadas)

Cada resposta salva tem:

```typescript
interface ChatHistoryResponse {
  text: string;
  audioUrl: string;
  
  // ✅ Rastreamento de origem:
  source: 
    | "DATABASE_VECTOR_MATCH"      // Cache hit (banco)
    | "IA_GEMINI"                   // IA Gemini
    | "IA_OPENAI"                   // IA OpenAI
    | "IA_OPENROUTER"               // IA OpenRouter
    | "IA_GEMINI_FALLBACK"          // Gemini (fallback)
    | "ERRO_SISTEMA"                // Erro
  
  // ✅ Confiança:
  confidence: number;  // 0.0 - 1.0
  // Para CACHE: 0.95-1.0 (alta)
  // Para IA: 0.5-0.7 (média-baixa)
}
```

---

## 🎨 Efeito Visual Proposto

### 📊 Matriz de Estados

```
┌────────────────────────────────────────────────────┐
│ ESTADO                 │ VISUAL              │ TEMPO │
├────────────────────────────────────────────────────┤
│                                                    │
│ 🚀 CACHE HIT           │ Resposta imediata  │ <100ms│
│ (Database Vector       │ ✅ Verde           │       │
│  Match)                │ "Velocidade        │       │
│                        │  garantida! 🚀"    │       │
│                        │ (ou sem notif)     │       │
├────────────────────────────────────────────────────┤
│                                                    │
│ ⏳ CHAMANDO IA          │ Animação +         │ 1-3s  │
│ (API Request)          │ Mensagem:          │       │
│                        │ "Sua pergunta      │       │
│                        │  foi interessante, │       │
│                        │  vou processar     │       │
│                        │  mais um pouco..." │       │
│                        │ (spinner/loading)  │       │
├────────────────────────────────────────────────────┤
│                        │                    │       │
│ ❌ ERRO                │ Mensagem de erro   │ N/A   │
│                        │ "Houve um erro..."  │       │
│                        │ (vermelho)          │       │
│                        │                    │       │
└────────────────────────────────────────────────────┘
```

---

## 💻 Implementação: Frontend

### Opção 1: Notificação Toast/Badge

```tsx
// frontend/src/components/ChatMessage/ChatBubble.tsx

export const ChatBubble = ({ 
  message, 
  source,      // ← Vem do backend!
  confidence 
}: Props) => {
  
  const isCache = source === "DATABASE_VECTOR_MATCH";
  const isAI = source?.startsWith("IA_");
  
  return (
    <div className={cn(
      "chat-bubble",
      isCache && "bg-green-100",
      isAI && "bg-blue-100"
    )}>
      {/* Mensagem */}
      <p>{message}</p>
      
      {/* Badge de Status */}
      {isCache ? (
        <div className="badge badge-success">
          🚀 Velocidade Garantida
        </div>
      ) : isAI ? (
        <div className="badge badge-info">
          ⏳ Processado com IA
        </div>
      ) : null}
      
      {/* Confiança */}
      <small className="opacity-70">
        Confiança: {(confidence * 100).toFixed(0)}%
      </small>
    </div>
  );
};
```

---

### Opção 2: Overlay de Carregamento com Mensagem

```tsx
// frontend/src/components/LoadingOverlay.tsx

export const LoadingOverlay = ({ 
  isLoading, 
  isDatabaseLookup = false 
}: Props) => {
  
  if (!isLoading) return null;
  
  return (
    <div className="loading-overlay">
      {isDatabaseLookup ? (
        // Carregamento rápido (banco)
        <div className="quick-load">
          <Spinner size="sm" />
          <p>Buscando resposta...</p>
        </div>
      ) : (
        // Carregamento lento (IA)
        <div className="ai-processing">
          <Spinner size="lg" />
          <p className="text-lg">
            Sua pergunta foi interessante 🤔
          </p>
          <p className="text-sm opacity-70">
            Vou processar mais um pouco...
          </p>
          <ProgressBar progress={loadingProgress} />
        </div>
      )}
    </div>
  );
};
```

---

### Opção 3: Indicador de Velocidade (Mais Sutil)

```tsx
// frontend/src/components/ResponseSpeedIndicator.tsx

export const ResponseSpeedIndicator = ({ 
  latency,  // em ms
  source 
}: Props) => {
  
  const speedLabel = (ms: number) => {
    if (ms < 100) return "⚡ Ultra Rápido";
    if (ms < 500) return "🚀 Muito Rápido";
    if (ms < 1000) return "✅ Rápido";
    if (ms < 3000) return "⏳ Normal";
    return "🤖 Processando IA";
  };
  
  return (
    <div className="speed-indicator">
      <span className={cn(
        source === "DATABASE_VECTOR_MATCH" 
          ? "text-green-600" 
          : "text-blue-600"
      )}>
        {speedLabel(latency)}
      </span>
      <span className="text-xs opacity-50">
        {latency}ms
      </span>
    </div>
  );
};
```

---

## 📱 Implementação: Backend Response

Backend já retorna tudo isso! Precisamos garantir que o frontend use:

```typescript
// O backend JÁ retorna isso:
res.json({
  text: respostaText,                    // ← Resposta
  audioUrl: audioUrl,                    // ← Áudio (se houver)
  source: "DATABASE_VECTOR_MATCH",       // ← ✅ ORIGEM!
  confidence: 0.95                       // ← ✅ CONFIANÇA!
});
```

**Frontend deve usar `source` e `confidence` para determinar visual!**

---

## 🎯 Frontend: Hook para Detectar Estado

```typescript
// frontend/src/hooks/useResponseState.ts

export const useResponseState = (response: ChatResponse) => {
  const isCache = response.source === "DATABASE_VECTOR_MATCH";
  const isAI = response.source?.startsWith("IA_");
  const isFastResponse = response.latency < 200;
  
  return {
    isCache,
    isAI,
    isFastResponse,
    showMessage: isAI ? "Sua pergunta foi interessante, vou processar mais um pouco..." : null,
    showBadge: isCache ? "🚀 Velocidade Garantida" : null,
    color: isCache ? "success" : isAI ? "info" : "warning"
  };
};
```

---

## 📊 Fluxo Completo (Backend + Frontend)

### Cenário 1: Cache Hit (Rápido)

```
USER: "Qual o preço da internet?"
       ↓
BACKEND: Busca no banco (similarity 0.95)
       ↓ ENCONTROU!
BACKEND: {
  text: "Temos planos de 50 Mega por R$ 79,90...",
  source: "DATABASE_VECTOR_MATCH",  ✅
  confidence: 0.95,
  latency: 45ms
}
       ↓
FRONTEND: 
  - Mostra resposta instantaneamente
  - Badge: "🚀 Velocidade Garantida"
  - Cor: Verde
  - Sem loading!
```

### Cenário 2: API IA (Mais Lento)

```
USER: "Qual a política de cancelamento?"
       ↓
BACKEND: Busca no banco (similarity < 0.85)
       ↓ NÃO ENCONTROU!
BACKEND: Começa loading visual...
       ↓
FRONTEND (antes da resposta):
  - Mostra: "Buscando..."
  - Spinner animado
  
BACKEND: Chama Gemini/OpenAI
       ↓ CONSEGUIU!
BACKEND: {
  text: "Você pode cancelar a qualquer momento...",
  source: "IA_GEMINI",  ✅
  confidence: 0.68,
  latency: 1200ms
}
       ↓
FRONTEND:
  - Para o spinner
  - Mostra resposta
  - Badge: "⏳ Processado com IA"
  - Cor: Azul
  - Mensagem opcional: "Sua pergunta foi interessante, vou processar..."
```

---

## 🔧 Modificações Necessárias

### 1. Backend (Mínimo)

```typescript
// backend/src/controllers/chat.ts - JÁ EXISTE!
// Só precisa garantir que:
res.json({
  text: respostaText,
  audioUrl: audioUrl,
  source: source,           // ✅ Já envia
  confidence: confidence    // ✅ Já envia
});
```

### 2. Frontend (Novo)

```typescript
// frontend/src/App.tsx

const [isLoading, setIsLoading] = useState(false);
const [lastSource, setLastSource] = useState("");

const handleSendMessage = async (text: string) => {
  setIsLoading(true);
  setLastSource(""); // Reset
  
  try {
    const response = await sendText(text);
    setLastSource(response.source);
    
    // Decidir visual baseado em source
    if (response.source === "DATABASE_VECTOR_MATCH") {
      showCacheNotification("🚀 Resposta instantânea!");
    } else if (response.source?.startsWith("IA_")) {
      showAINotification("⏳ Processada com IA");
    }
    
  } finally {
    setIsLoading(false);
  }
};
```

---

## ✨ Resumo: O Que Fazer

### ✅ Já Existe (Backend):
```
✅ Regra de decisão cache vs API
✅ Rastreamento de source
✅ Score de confiança
✅ Fallback automático entre provedores
✅ Logging completo
```

### 🆕 Precisamos Adicionar (Frontend):

```
1. Usar "source" do response para determinar visual
2. Se source === "DATABASE_VECTOR_MATCH":
   - Mostrar badge "🚀 Velocidade Garantida"
   - Sem loading/spinner
   - Cor verde
   
3. Se source.startsWith("IA_"):
   - Mostrar notificação durante loading
   - Mensagem: "Sua pergunta foi interessante, vou processar mais um pouco..."
   - Spinner animado
   - Mostrar tempo estimado
   
4. Mostrar confidence no rodapé
   - Para cache: 95-100%
   - Para IA: 50-70%
```

---

## 📝 Código Pronto para Copiar

### Frontend Component (React)

```tsx
// frontend/src/components/ChatResponse.tsx

interface ChatResponseProps {
  response: {
    text: string;
    source: string;
    confidence: number;
    audioUrl?: string;
  };
  latency?: number;
}

export const ChatResponse: React.FC<ChatResponseProps> = ({ 
  response, 
  latency = 0 
}) => {
  const isCache = response.source === "DATABASE_VECTOR_MATCH";
  const isAI = response.source?.startsWith("IA_");

  return (
    <div className={cn(
      "chat-response p-4 rounded-lg",
      isCache && "bg-green-50 border-l-4 border-green-500",
      isAI && "bg-blue-50 border-l-4 border-blue-500"
    )}>
      {/* Mensagem */}
      <p className="text-base leading-relaxed mb-3">
        {response.text}
      </p>

      {/* Rodapé com Meta-informações */}
      <div className="flex items-center justify-between text-xs opacity-70">
        <div className="flex gap-3">
          {isCache ? (
            <span className="flex items-center gap-1 text-green-600 font-medium">
              🚀 Velocidade Garantida
            </span>
          ) : isAI ? (
            <span className="flex items-center gap-1 text-blue-600 font-medium">
              🤖 Processado com IA
            </span>
          ) : null}

          <span>
            Confiança: {(response.confidence * 100).toFixed(0)}%
          </span>

          {latency > 0 && (
            <span className="text-gray-400">
              Latência: {latency}ms
            </span>
          )}
        </div>

        {response.audioUrl && (
          <button className="text-blue-500 hover:text-blue-700">
            🔊 Ouvir
          </button>
        )}
      </div>
    </div>
  );
};
```

---

## 🎬 Visual: Animação de Loading

```tsx
// frontend/src/components/ProcessingIndicator.tsx

export const ProcessingIndicator: React.FC<{
  isLoading: boolean;
}> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="processing-indicator">
      <div className="spinner" />
      <div className="text-center">
        <p className="text-lg font-medium">
          Sua pergunta foi interessante 🤔
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Vou processar mais um pouco...
        </p>
        <div className="mt-3">
          <div className="progress-bar">
            <div className="progress-fill animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 🚀 Próximo Passo

**Qual você quer fazer primeiro?**

```
1. ✅ Implementar visual no frontend (badges de cache vs IA)
2. ✅ Adicionar notificação de carregamento com mensagem
3. ✅ Mostrar confiança e tempo de resposta
4. ✅ Testar fluxo cache vs IA com casos reais
```
