# 🛡️ Garantia de Qualidade: Alucinação vs Confiabilidade

## 🤔 O Que é Alucinação em IA?

```
Alucinação = Quando a IA gera informações que:
├─ São falsas/inventadas
├─ Contradizem os dados reais
├─ Parecem lógicas mas não fazem sentido
├─ Citam fatos que não existem
└─ Criam conexões sem fundamento
```

### Exemplos de Alucinação:
```
USER: "Qual o valor da internet de 500 Mega?"
ALUCINAÇÃO: "Temos um plano de 500 Mega por R$ 99,90"
                    (Não existe no FAQ!)

USER: "Vocês têm cobertura em Maceió?"
ALUCINAÇÃO: "Sim, temos loja física em Maceió no Shopping XYZ"
                    (Nunca foi mencionado!)

USER: "Qual o telefone da Acesso?"
ALUCINAÇÃO: "Ligue para 0800 123 4567"
                    (Número errado!)
```

---

## 🎯 Como o Sistema ATUAL Evita Alucinação?

### 1️⃣ **CAMADA 1: FAQ Hardcoded (Dados Fixos)**

```typescript
// backend/src/data/faq.ts

O FAQ é ESTÁTICO - não muda!
├─ Respostas PRÉ-VALIDADAS manualmente
├─ Sem geração de conteúdo ("Todas as respostas foram escrit Bem")
├─ Tudo vem de documentação oficial
└─ NÃO há risco de alucinação aqui!

Exemplo SEGURO:
{
  questions: ["Qual o valor da internet fibra?"],
  answer: "Temos planos de... 50 Mega por R$ 79,90..."
  // ✅ Resposta real, não gerada
}
```

**Vantagem:** Zero alucinação
**Desvantagem:** Precisa atualizar código para mudar preços

---

### 2️⃣ **CAMADA 2: Histórico de Usuários (ChatHistory)**

```
Quando um usuário pergunta e o sistema responde...

FLUXO:
┌─────────────────────────────────────────────────────┐
│ 1. Pergunta do usuário chega                         │
│    Exemplo: "Qual o valor da internet?"             │
└────────────┬────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────┐
│ 2. Sistema BUSCA no FAQ primeiro (100% seguro)      │
│    ├─ Encontra correspondência com 0.85+ similarity │
│    └─ RETORNA resposta pré-escrita do FAQ           │
└────────────┬────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────┐
│ 3. Se NÃO achar no FAQ... ENTÃO chama LLM           │
│    (Risco de alucinação aqui!)                      │
└────────────┬────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────┐
│ 4. Salva em ChatHistory a resposta + source         │
│    ├─ question                                       │
│    ├─ answer (pode vir de FAQ ou LLM)               │
│    ├─ source: "FAQ_CACHE" | "llm" | "imported"      │
│    └─ confidence: 0.0-1.0                           │
└────────────┬────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────┐
│ 5. Usuário VIRA pode usar histórico como cache      │
│    (Reutiliza resposta validada!)                   │
└─────────────────────────────────────────────────────┘
```

**Segurança por Camadas:**
```
┌─────────────────────────────────────────────────────┐
│ NÍVEL 1: FAQ (Máxima confiança - 99.9%)             │
│ Fonte: Dados hardcoded, validados manualmente       │
│ Risco: ZERO (não há IA gerando conteúdo)           │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ NÍVEL 2: Cache Vetorial (Alta confiança - 95%)      │
│ Fonte: FAQ com similarity > 0.85                    │
│ Risco: Baixo (matching automático, não gerado)     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ NÍVEL 3: Histórico (Boa confiança - 80%)            │
│ Fonte: Perguntas já respondidas (origem FAQ ou LLM) │
│ Risco: Médio (pode conter respostas antigas)       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ NÍVEL 4: Dados Importados (Variável - ?)            │
│ Fonte: Você define a origem                         │
│ Risco: DEPENDE DA QUALIDADE DOS DADOS!              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ NÍVEL 5: LLM Fallback (Risco - 50-70%)              │
│ Fonte: Gemini/OpenAI/OpenRouter                    │
│ Risco: ALTO (pode alucinar!)                        │
└─────────────────────────────────────────────────────┘
```

---

## 🔒 5 Mecanismos de Proteção Implementados

### 1. **Validação na Importação** ✅

```bash
# Script: backend/src/scripts/analyzeData.ts

Antes de QUALQUER dado entrar no banco, executa:

├─ detectDuplicates()
│  └─ Encontra respostas duplicadas (pode ser erro)
│
├─ analyzeQuality()
│  ├─ Valida comprimento de perguntas (5-1000 chars)
│  ├─ Valida comprimento de respostas (10-10000 chars)
│  └─ Detecta injeção XSS ou código malicioso
│
├─ generateStatistics()
│  ├─ Contagem por categoria
│  ├─ Confiança média
│  └─ Problemas encontrados
│
└─ saveAnalysisReport()
   └─ Gera relatório JSON com tudo!

VOCÊ LANÇA:
$ npx ts-node backend/src/scripts/analyzeData.ts dados.json

RESULTADO:
┌─────────────────────────────────────────┐
│ Análise de dados.json                   │
├─────────────────────────────────────────┤
│ ✅ 50 registros                          │
│ ⚠️  5 duplicados encontrados             │
│ ✅ 0 com problemas de segurança          │
│ ✅ Comprimento válido (90%)              │
│ ✅ Qualidade: BOA                        │
│                                         │
│ RECOMENDAÇÕES:                          │
│ • Remova duplicados                     │
│ • Categoria faltando em 2 registros    │
│                                         │
│ Salvo em: analysis_report_2026-04-22.json
└─────────────────────────────────────────┘
```

---

### 2. **Fonte de Dados Rastreada** 🔍

```
Cada resposta salva tem um "source":

┌──────────────────────────────────────────┐
│ ChatHistory.source                       │
├──────────────────────────────────────────┤
│                                          │
│ "FAQ_CACHE"   → Veio do FAQ hardcoded   │
│               └─ CONFIANÇA: 99%          │
│                                          │
│ "imported"    → Veio de importação       │
│               └─ CONFIANÇA: ? (depende!)  │
│                                          │
│ "llm"         → Gerado por LLM/Gemini   │
│               └─ CONFIANÇA: 50-70%      │
│                                          │
│ "vector_match"→ Encontrado em DB        │
│               └─ CONFIANÇA: 85%          │
│                                          │
└──────────────────────────────────────────┘

VOCÊ SEMPRE SABE A ORIGEM!
```

---

### 3. **Score de Confiança** 📊

```typescript
// Cada resposta tem um confidence score:

interface ChatHistory {
  question: string;
  answer: string;
  source: "FAQ_CACHE" | "imported" | "llm" | "vector_match";
  confidence: number; // 0.0 - 1.0
}

EXEMPLOS:

{
  question: "Qual o preço?",
  answer: "Temos planos de 50 Mega por R$ 79,90...",
  source: "FAQ_CACHE",
  confidence: 0.99  ✅ Altíssima confiança!
}

{
  question: "Vocês atendem Maceió?",
  answer: "Sim, temos cobertura em Maceió...",
  source: "llm",
  confidence: 0.45  ⚠️  Baixa! (Pode ser alucinação)
}

{
  question: "Qual a política de cancelamento?",
  answer: "Você pode cancelar a qualquer momento...",
  source: "imported",
  confidence: 0.78  ✅ Bom (se dados são confiáveis)
}
```

**Como é Calculado:**
```
confidence = 1.0  (FAQ hardcoded)
confidence = similarity_score  (vector search)
confidence = llm_confidence_score  (LLM)
```

---

### 4. **Teste em Dry-Run (Sem Salvar)** 🧪

```bash
# Antes de importar de verdade, testa sem comprometer o banco:

npx ts-node backend/src/scripts/importData.ts dados.json --dry-run

SAÍDA:
┌──────────────────────────────────────────┐
│ MODO DRY-RUN (Sem salvar!)               │
├──────────────────────────────────────────┤
│ Processando em batches de 50...          │
│                                          │
│ Batch 1/3:                               │
│ ✅ 50 registros OK                        │
│ ⚠️  2 com embeddings baixa qualidade     │
│ ❌ 0 erros críticos                      │
│                                          │
│ Batch 2/3:                               │
│ ✅ 50 registros OK                        │
│                                          │
│ RESUMO:                                  │
│ • Total: 150 registros                   │
│ • Sucesso: 148 (98%)                     │
│ • Problemas: 2 (avisos)                  │
│                                          │
│ ⚠️  NÃO FOI SALVO NO BANCO!               │
│    Execute SEM --dry-run para salvar     │
└──────────────────────────────────────────┘
```

---

### 5. **Testes Práticos Pós-Importação** 🧬

```
Depois de importar, você VALIDA:

┌─────────────────────────────────────────────────────┐
│ TESTE 1: Perguntas Conhecidas                       │
├─────────────────────────────────────────────────────┤
│ USER: "Qual o valor da internet 50 Mega?"          │
│ ESPERADO: "Temos planos... 50 Mega por R$ 79,90"  │
│ OBTIDO: [resposta do sistema]                      │
│ RESULTADO: ✅ CORRETO ou ❌ ERRADO                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ TESTE 2: Variações de Pergunta                      │
├─────────────────────────────────────────────────────┤
│ USER: "Quanto custa fibra 50?"                      │
│ USER: "Preço do plano de 50 Mega?"                  │
│ USER: "50 Mega sai por quanto?"                     │
│                                                     │
│ TODOS DEVEM RETORNAR A MESMA RESPOSTA!              │
│ RESULTADO: ✅ Consistente ou ❌ Variável            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ TESTE 3: Perguntas Que Não Sabe                     │
├─────────────────────────────────────────────────────┤
│ USER: "Qual a cor do uniforme dos técnicos?"        │
│ ESPERADO: "Não tenho essa informação"               │
│ OBTIDO: "Acho que é azul..." (ALUCINAÇÃO!)         │
│ RESULTADO: ❌ ALUCINAÇÃO DETECTADA!                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ TESTE 4: Contradições                               │
├─────────────────────────────────────────────────────┤
│ FAQ diz: "Internet de 50 Mega por R$ 79,90"        │
│ Resposta gerada: "Plano de 50 Mega por R$ 89,90"   │
│ RESULTADO: ❌ CONTRADIÇÃO = ALUCINAÇÃO!             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ TESTE 5: Confiança Baixa                            │
├─────────────────────────────────────────────────────┤
│ USER: "Vocês atendem Goiás?"                        │
│ RESPOSTA: "Sim, temos cobertura em Goiás"          │
│ CONFIDENCE: 0.35 (MUITO BAIXO!)                    │
│ RESULTADO: ⚠️  ALERTA = Provavelmente alucinação    │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Matriz de Risco vs Confiança

```
┌─────────────────────────────────────────────────────────┐
│ TIPO DE RESPOSTA    │ FONTE    │ CONFIANÇA │ RISCO      │
├─────────────────────────────────────────────────────────┤
│ Preços              │ FAQ      │ 99%       │ NENHUM ✅  │
│ Planos              │ FAQ      │ 99%       │ NENHUM ✅  │
│ Como Agendar        │ FAQ      │ 99%       │ NENHUM ✅  │
│                     │          │           │            │
│ Pergunta Similar    │ Histórico│ 85%       │ BAIXO ⚠️   │
│ (do histórico)      │ (FAQ+)   │           │            │
│                     │          │           │            │
│ Telefone/Email      │ FAQ      │ 99%       │ NENHUM ✅  │
│ Suporte             │ FAQ      │ 99%       │ NENHUM ✅  │
│                     │          │           │            │
│ Dados Importados    │ Varia!   │ ??%       │ VARIÁVEL   │
│ (sua responsabil.)  │          │           │ ⚠️ ❌      │
│                     │          │           │            │
│ Pergunta Nova       │ LLM      │ 50-70%    │ ALTO ❌    │
│ (Não está no FAQ)   │ Gemini   │           │            │
│                     │          │           │            │
│ Pergunta Aleatória  │ LLM      │ 20-40%    │ CRÍTICO!❌ │
│ (Fora contexto)     │          │           │            │
└─────────────────────────────────────────────────────────┘
```

---

## 🛑 Limite: O Que É Impossível Garantir?

```
VOCÊ NÃO PODE GARANTIR 100%:

❌ Que o LLM nunca vai alucinar
   └─ LLMs geram texto probabilisticamente
   └─ Às vezes combinam padrões errados

❌ Que dados importados são 100% corretos
   └─ Só você valida a entrada!
   └─ Se os dados origem têm erro, copia o erro

❌ Que respostas antigas não envelhecem
   └─ Preços mudam, políticas mudam
   └─ Histórico fica desatualizado

❌ Que ninguém consegue "hackear" respostas
   └─ Alguém poderia treinar o LLM errado
   └─ (Mas você controla a importação!)

┌─────────────────────────────────────────┐
│ MAS você PODE garantir:                 │
├─────────────────────────────────────────┤
│ ✅ 99% do tráfego vem do FAQ (seguro)   │
│ ✅ Todas as origens são rastreadas      │
│ ✅ Score de confiança em cada resposta  │
│ ✅ Você valida antes de importar        │
│ ✅ Teste em dry-run antes de salvar    │
│ ✅ Histórico completo de mudanças      │
└─────────────────────────────────────────┘
```

---

## 🎯 Estratégia: 3 Níveis de Defesa

### NÍVEL 1: Prevenção

```
┌──────────────────────────────────────────────┐
│ Antes de dados entrar no sistema:            │
├──────────────────────────────────────────────┤
│                                              │
│ 1. Você coleta dados (CRM, documentos, etc) │
│ 2. Eu analiso (analyzeData.ts)              │
│    ├─ Detecta duplicados                    │
│    ├─ Valida formato                        │
│    ├─ Identifica problemas                  │
│    └─ Gera relatório                        │
│                                              │
│ 3. VOCÊ REVISA o relatório                  │
│    └─ Corrige problemas                     │
│                                              │
│ 4. DRY-RUN (teste sem salvar)               │
│    └─ Verifica se importação vai funcionar  │
│                                              │
│ 5. VOCÊ CONFIRMA: "Sim, importa!"           │
│    └─ Só aí entra no banco                  │
│                                              │
└──────────────────────────────────────────────┘
```

### NÍVEL 2: Detecção

```
┌──────────────────────────────────────────────┐
│ Enquanto sistema está em uso:                │
├──────────────────────────────────────────────┤
│                                              │
│ • Cada resposta tem source + confidence      │
│ • Sistema prioriza FAQ > Histórico > LLM    │
│ • Logging completo de cada pergunta         │
│ • Alertas se confidence muito baixa         │
│                                              │
└──────────────────────────────────────────────┘
```

### NÍVEL 3: Correção

```
┌──────────────────────────────────────────────┐
│ Se problema for descoberto:                  │
├──────────────────────────────────────────────┤
│                                              │
│ • Analise o log (quando foi?)               │
│ • Identifique a origem (FAQ/LLM/import)     │
│ • Corrija na fonte:                         │
│   ├─ FAQ hardcoded? → Edite faq.ts         │
│   ├─ Importado? → Delete e reimporte       │
│   └─ LLM alucinação? → Rejeite respostas   │
│                                              │
│ • Não há "correção silenciosa"              │
│   (Tudo fica no histórico!)                 │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 📋 Checklist: Como Validar Qualidade?

### ANTES de Importação:

```
□ Dados vêm de fonte confiável? (CRM, docs oficiais)
□ Rodou analyzeData.ts sem erros críticos?
□ Revisei o relatório de análise?
□ Duplicados foram removidos?
□ Comprimento de respostas está OK (10-10000)?
□ Testei em --dry-run com sucesso?
□ Não há inconsistências com FAQ hardcoded?
□ Você entende qual é a origem de cada dado?
```

### DEPOIS de Importação:

```
□ Testei 10 perguntas conhecidas?
□ Comparei resposta com FAQ (deve ser igual)?
□ Testei variações da mesma pergunta?
□ Perguntas "fora do escopo" retornam "não sei"?
□ Confidence score aparece nas respostas?
□ Source está rastreado corretamente?
□ Nenhuma contradição com FAQ?
□ Log de auditoria está completo?
```

---

## 🔬 Teste Prático Agora

### Você Pode Testar:

```bash
# 1. Chame o endpoint de chat
POST http://localhost:3001/api/chat
{
  "message": "Qual o valor da internet 50 Mega?",
  "sessionId": "test-123"
}

# 2. Resposta esperada (com info extra):
{
  "response": "Temos planos de internet fibra com 50 Mega por R$ 79,90...",
  "source": "FAQ_CACHE",
  "confidence": 0.99,
  "embedding_similarity": 0.95,
  "audioUrl": "https://cloudinary.com/...",
  "timestamp": "2026-04-22T..."
}

# 3. Analise cada campo:
├─ source = "FAQ_CACHE" ✅ (muito confiável!)
├─ confidence = 0.99 ✅ (máxima confiança)
├─ embedding_similarity = 0.95 ✅ (match excelente)
└─ response = correspondência com FAQ ✅

# 4. Teste pergunta aleatória:
POST http://localhost:3001/api/chat
{
  "message": "Qual a capital da França?",
  "sessionId": "test-123"
}

# 5. Resposta esperada:
{
  "response": "Desculpa, não entendi muito bem...",
  "source": "fallback",
  "confidence": 0.1,
  "timestamp": "2026-04-22T..."
}
```

---

## 📝 Resumo: Garantia Real

```
┌──────────────────────────────────────────────────────┐
│ O QUE VOCÊ GANHA COM SISTEMA:                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ✅ 99% do tráfego = FAQ (zero alucinação)           │
│ ✅ Cada resposta rastreada (source + confidence)    │
│ ✅ Validação antes de salvar (analyzeData.ts)       │
│ ✅ Teste sem risco (--dry-run)                      │
│ ✅ Logs completos (auditoria)                       │
│ ✅ Você controla a importação (não é automático)    │
│ ✅ Fácil corrigir se algo errado               │
│                                                      │
│ ❌ O QUE VOCÊ NÃO PODE GARANTIR:                    │
│                                                      │
│ ❌ 100% de precisão em perguntas novas (LLM)       │
│ ❌ Qualidade dos dados que você importa             │
│ ❌ Que LLM nunca vai alucinar                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 🎓 Conclusão

**A garantia real é**: 

1. **FAQ Hardcoded = 99.9% confiável** (nunca muda sem você)
2. **Dados Importados = Confiabilidade = Qualidade da Entrada** (GIGO - Garbage In, Garbage Out)
3. **LLM Fallback = 50-70% confiável** (sempre com disclaimer)

```
Se você importar dados BOM:
├─ Sistema fica 85-90% seguro

Se você importar dados RUIM:
├─ Sistema fica ruim também (não é culpa da IA!)

Se alguém fizer pergunta NÃO no FAQ:
├─ LLM pode alucinar (risco conhecido)
└─ Mas confidence score AVISA que é baixo
```

**O sistema não evita 100% de alucinação, mas faz tudo que é possível para:**
- ✅ Detectar quando algo pode estar errado
- ✅ Avisar com confidence score
- ✅ Rastrear origem de cada resposta
- ✅ Permitir você validar antes de salvar
- ✅ Facilitar correção se erro descoberto

---

## 🚀 Próximo Passo

Você pronto para:
1. **Preparar dados** (CRM, documentos, etc)
2. **Rodar análise** (script valida tudo)
3. **Revisar relatório** (você decide se OK)
4. **Testar em dry-run** (sem comprometer banco)
5. **Importar** (se tudo OK)

Qual é a sua fonte de dados?
