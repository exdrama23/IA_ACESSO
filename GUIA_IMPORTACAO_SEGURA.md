# 🛡️ Guia Seguro: Ingerir Dados em Massa com Análise

## ⚠️ Princípios de Segurança

```
1️⃣ ANÁLISE PRIMEIRO
   ├─ Validar formato e qualidade
   ├─ Detectar duplicatas
   └─ Revisar preview

2️⃣ APROVAÇÃO DO USUÁRIO
   ├─ Revisar relatório
   ├─ Confirmar operação
   └─ Salvar dados

3️⃣ PROCESSAMENTO EM BATCHES
   ├─ Dividir em chunks pequenos
   ├─ Monitorar progresso
   └─ Recuperar de falhas
```

---

## 📋 Passo-a-Passo Completo

### PASSO 1: Preparar Arquivo de Dados

Seu arquivo deve ser JSON ou CSV com esta estrutura:

**JSON:**
```json
[
  {
    "question": "Qual é o preço da internet fibra 50 mega?",
    "answer": "O plano de 50 Mega custa R$ 79,90 por mês",
    "category": "internet_fibra",
    "source": "faq_atualizado"
  },
  {
    "question": "Como funciona o plano de saúde?",
    "answer": "O plano oferece cobertura para consultas...",
    "category": "acesso_saude",
    "source": "docs_saude"
  }
]
```

**CSV:**
```csv
question,answer,category,source
Qual é o preço da internet fibra 50 mega?,O plano de 50 Mega custa R$ 79,90 por mês,internet_fibra,faq_atualizado
Como funciona o plano de saúde?,O plano oferece cobertura para consultas...,acesso_saude,docs_saude
```

### PASSO 2: Analisar os Dados

```bash
# Executar análise (SEM aplicar ao banco)
npx ts-node backend/src/scripts/analyzeData.ts dados.json

# Você verá:
# ├─ Resumo (total, válidos, inválidos, duplicatas)
# ├─ Armazenamento estimado
# ├─ Tempo estimado de processamento
# ├─ Avisos e recomendações
# ├─ Preview dos primeiros 5 registros
# └─ Arquivo relatório_report.json
```

**Exemplo de Saída:**
```
╔════════════════════════════════════════════════════════╗
║        📊 RELATÓRIO DE ANÁLISE DE DADOS               ║
╚════════════════════════════════════════════════════════╝

📈 RESUMO:
   Total de registros:    1500
   ✅ Válidos:            1485
   ❌ Inválidos:          15
   🔄 Duplicatas:         3

💾 ARMAZENAMENTO:
   Estimado:              3.25 MB

⏱️  TEMPO ESTIMADO:
   Processamento:         ~25 minutos

⚠️  AVISOS (2):
   • 45 respostas muito curtas (<20 caracteres)
   • 127 itens sem categoria

💡 RECOMENDAÇÕES:
   🔄 3 duplicatas encontradas - considere revisar
   ⚠️ Problemas de qualidade detectados - revisar dados
   📁 Adicionar categorias aos itens para melhor organização

📋 PREVIEW:
   [1]
   Q: Qual é o preço da internet fibra 50 mega?
   A: O plano de 50 Mega custa R$ 79,90 por mês
   C: internet_fibra
   
   [2]
   Q: Como funciona o plano de saúde?
   A: O plano oferece cobertura para consultas e pediatra
   C: acesso_saude
   
   ... (mais 3 registros)

╔════════════════════════════════════════════════════════╗
║  ✅ ANÁLISE COMPLETA - Pronto para próximo passo      ║
║  Execute: npm run ingest:apply -- dados.json          ║
╚════════════════════════════════════════════════════════╝
```

### PASSO 3: Revisar o Relatório

**Coisas para verificar:**

- ✅ Taxa de validade > 95% ?
- ✅ Duplicatas < 5 ?
- ✅ Armazenamento necessário está ok ?
- ✅ Tempo de processamento é aceitável ?
- ✅ Preview dos dados parece correto ?

**Se tudo OK:** Prosseguir para PASSO 4
**Se há problemas:** Corrigir dados e voltar ao PASSO 1

### PASSO 4: Teste Seco (Dry-Run)

```bash
# Executar importação SEM salvar no banco
# Apenas simula o processo
npx ts-node backend/src/scripts/importData.ts dados.json --dry-run

# Você verá:
# ├─ Quantidade que seria importada
# ├─ Possíveis erros que ocorreriam
# ├─ Tempo que levaria
# └─ "Modo DRY-RUN: Nenhum dado foi salvo"
```

### PASSO 5: Importar para o Banco

```bash
# Agora de verdade!
npx ts-node backend/src/scripts/importData.ts dados.json

# Será pedido confirmação:
# ⚠️  Isso vai adicionar dados ao banco. Deseja continuar? (s/n):

# Digite: s

# Aguarde o processamento:
# [1/30] Processando itens 1-50...
#   ✅ Sucesso: 50 | ❌ Falhas: 0
# [2/30] Processando itens 51-100...
#   ✅ Sucesso: 50 | ❌ Falhas: 0
# ...

# No final, você verá o relatório:
# ✅ Sucesso:        1485 registros
# ❌ Falhas:         15 registros
# 📊 Taxa de êxito:   98.9%
```

---

## 📊 Monitoramento Durante Importação

### Em Tempo Real

```bash
# Enquanto a importação está rodando:
# [1/30] Processando itens 1-50...
# 🔄 Gerando 50 embeddings...
# ✅ Sucesso: 48 | ❌ Falhas: 2
```

### Pausar Importação

Se precisar parar:
- Pressione **Ctrl+C**
- Os dados já inseridos SERÃO MANTIDOS
- Você pode reintentar depois

### Recuperar de Falhas

Se alguns registros falharam:

```bash
# 1. Exportar os que falharam
npx ts-node backend/src/scripts/analyzeData.ts dados_falhados.json

# 2. Corrigir os problemas
# 3. Tentar novamente com arquivo corrigido
npx ts-node backend/src/scripts/importData.ts dados_falhados_corrigidos.json
```

---

## 🔍 Entender o Relatório de Análise

### Campos Validados

```
✅ Pergunta (obrigatória)
   ├─ Não vazia
   ├─ Tamanho: 5-1000 caracteres
   └─ Sem caracteres suspeitos

✅ Resposta (obrigatória)
   ├─ Não vazia
   ├─ Tamanho: 10-10000 caracteres
   └─ Sem injeção XSS

✅ Categoria (opcional)
   └─ Apenas informativo

✅ Source (opcional)
   └─ Apenas informativo
```

### Interpretando Avisos

| Aviso | Severidade | Ação |
|-------|-----------|------|
| Pergunta muito curta (<5 caracteres) | 🟡 Média | Considere reescrever |
| Resposta muito curta (<20 caracteres) | 🟡 Média | Detalhar resposta |
| Resposta muito longa (>5000 caracteres) | 🟠 Alta | Dividir em múltiplas respostas |
| Duplicatas encontradas | 🔴 Crítica | Remover antes de importar |
| Sem categoria | 🟡 Baixa | Não bloqueia, apenas organização |

### Recomendações Comuns

```
⚠️ "${duplicates.length} duplicatas encontradas"
└─ Remover registros com pergunta idêntica

🔄 "Problemas de qualidade detectados"
└─ Revisar respostas muito curtas/longas

📁 "Adicionar categorias aos itens"
└─ Melhor organização, não obrigatório

📊 "Dataset grande - considere processar em batches"
└─ Automático, mas processará mais lento
```

---

## 🚨 Checklist Segurança Antes de Importar

```
Antes de fazer QUALQUER importação:

☐ Fez backup do banco de dados?
  └─ backup: pg_dump neondb > backup_$(date +%Y%m%d).sql

☐ Verificou a análise completa?
  └─ Taxa de validade > 95%?
  └─ Sem problemas críticos?

☐ Testou com dry-run primeiro?
  └─ npx ts-node backend/src/scripts/importData.ts dados.json --dry-run

☐ Revisou o preview dos dados?
  └─ Perguntas e respostas fazem sentido?

☐ Tem tempo para aguardar processamento?
  └─ Não interrompa a operação

☐ Você entende quais dados estão sendo importados?
  └─ Sabe de onde vieram? Por que?

Se respondeu SIM para tudo: ✅ Seguro para importar!
```

---

## 💾 Exemplo Prático Completo

### Cenário: Importar 5.000 pares Q&A

**Passo 1: Preparar arquivo**
```bash
# Colocar dados em: backend/data/import_5k.json
```

**Passo 2: Analisar**
```bash
npx ts-node backend/src/scripts/analyzeData.ts backend/data/import_5k.json

# Resultado esperado:
# ✅ Válidos: 4950 (99%)
# ❌ Inválidos: 50 (1%)
# 🔄 Duplicatas: 12
# ⏱️ Tempo: ~80 minutos
# 💾 Tamanho: ~10 MB
```

**Passo 3: Revisar relatório**
```
✅ Taxa de validade excelente (99%)
✅ Duplicatas baixas (0.2%)
✅ Espaço aceitável (~10 MB)
✅ Preview OK
⚠️ Recomendação: Remover 12 duplicatas antes
```

**Passo 4: Corrigir dados (remover duplicatas)**
```bash
# Editar arquivo para remover os 12 duplicatas
# Resultado final: 4938 registros únicos
```

**Passo 5: Testar importação (dry-run)**
```bash
npx ts-node backend/src/scripts/importData.ts backend/data/import_5k.json --dry-run

# Resultado:
# ✅ Sucesso: 4938 registros (simulado)
# ❌ Falhas: 0
# ℹ️ Modo DRY-RUN: Nenhum dado foi salvo
```

**Passo 6: Importar de verdade**
```bash
npx ts-node backend/src/scripts/importData.ts backend/data/import_5k.json

# Aguarde:
# [1/99] Processando itens 1-50...
# ✅ Sucesso: 50 | ❌ Falhas: 0
# [2/99] Processando itens 51-100...
# ✅ Sucesso: 50 | ❌ Falhas: 0
# ... (prossegue por ~80 minutos)

# Resultado final:
# ✅ Sucesso: 4938 registros
# ❌ Falhas: 0
# 📊 Taxa de êxito: 100%
# ✅ Importação concluída! Dados salvos no banco.
```

**Passo 7: Verificar no banco**
```bash
# Consultar se os dados foram salvos
SELECT COUNT(*) FROM "ChatHistory" WHERE source = 'imported';

# Esperado: 4938 novos registros
```

---

## 🔧 Troubleshooting

### Problema: "Arquivo não encontrado"
```bash
# Solução: Usar caminho absoluto ou relativo correto
npx ts-node backend/src/scripts/analyzeData.ts ./dados/meu_arquivo.json
# ou
npx ts-node backend/src/scripts/analyzeData.ts /full/path/to/dados.json
```

### Problema: "Formato não suportado"
```bash
# Solução: Usar apenas .json ou .csv
✅ dados.json
✅ dados.csv
❌ dados.xlsx
❌ dados.txt
```

### Problema: "Memória insuficiente"
```bash
# Solução: Dividir arquivo em partes menores
# Se tem 100K registros, dividir em 5 arquivos de 20K

# Importar em sequência
npx ts-node backend/src/scripts/importData.ts parte1.json
npx ts-node backend/src/scripts/importData.ts parte2.json
npx ts-node backend/src/scripts/importData.ts parte3.json
# ... etc
```

### Problema: "Muitas duplicatas"
```bash
# Solução: Remover antes de importar

# 1. Usar ferramenta de deduplicação
node -e "
  const data = require('./dados.json');
  const seen = new Set();
  const unique = data.filter(item => {
    const key = item.question.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(\`${data.length} → ${unique.length} após dedup\`);
  require('fs').writeFileSync('./dados_dedup.json', JSON.stringify(unique, null, 2));
"

# 2. Importar arquivo desduplicado
npx ts-node backend/src/scripts/importData.ts dados_dedup.json
```

---

## 📚 Próximos Passos Após Importação

### 1. Validar Dados no Banco
```bash
# Verificar registros importados
SELECT COUNT(*) FROM "ChatHistory" WHERE source = 'imported';

# Verificar embeddings foram gerados
SELECT COUNT(*) FROM "ChatHistory" WHERE embedding IS NOT NULL;

# Verificar distribuição por categoria
SELECT category, COUNT(*) FROM "ChatHistory" WHERE source = 'imported' GROUP BY category;
```

### 2. Testar Buscas Vetoriais
```bash
# Fazer uma pergunta e ver se encontra os novos dados
# No frontend, tente perguntar algo que deveria estar nos dados importados
```

### 3. Monitorar Performance
```bash
# Ver tempo de resposta
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "text": "pergunta teste",
    "sessionId": "test-123"
  }'

# Deve retornar rápido (<100ms em cache hit)
```

### 4. Fazer Backup Final
```bash
# Após sucesso, fazer backup dos dados importados
pg_dump neondb > backup_pos_importacao_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🎯 Resumo do Fluxo Seguro

```
┌─────────────────┐
│  1. Preparar    │ ← Arquivo JSON/CSV
│   Arquivo       │
└────────┬────────┘
         ↓
┌─────────────────┐
│  2. Analisar    │ ← NENHUM dado inserido
│   Dados         │   Apenas validação
└────────┬────────┘
         ↓
┌─────────────────┐
│  3. Revisar     │ ← Você lê relatório
│   Relatório     │   Aprova ou rejeita
└────────┬────────┘
         ↓
┌─────────────────┐
│  4. Teste Seco  │ ← DRY-RUN simula processo
│   (Dry-Run)     │   NENHUM dado inserido
└────────┬────────┘
         ↓
┌─────────────────┐
│  5. Aprovar &   │ ← Você confirma "SIM"
│   Importar      │   Dados AGORA são salvos
└────────┬────────┘
         ↓
┌─────────────────┐
│  6. Verificar   │ ← Confirmar sucesso
│   no Banco      │   Fazer backup
└─────────────────┘
```

---

## 💡 Boas Práticas

```
✅ FAÇA:
   • Análise completa ANTES de importar
   • Teste com dry-run primeiro
   • Backup SEMPRE antes de importar
   • Dividir dados grandes em batches
   • Revisar preview dos dados
   • Monitorar progresso da importação

❌ NÃO FAÇA:
   • Importar sem análise
   • Ignorar avisos do relatório
   • Matar processo (Ctrl+C) durante importação
   • Usar dados de fonte não confiável sem revisar
   • Importar 1 milhão de registros de uma vez
   • Esquecer de fazer backup
```

---

## 📞 Próximo Passo

Quando estiver pronto para importar dados:

1. Prepare seu arquivo
2. Execute: `npx ts-node backend/src/scripts/analyzeData.ts seu_arquivo.json`
3. Revise o relatório
4. Se tudo OK, execute: `npx ts-node backend/src/scripts/importData.ts seu_arquivo.json`
5. Confirme com "s" quando solicitado
6. Aguarde conclusão

**Total de tempo:** Análise (~30s) + Importação (~variável conforme tamanho)

🚀 **Você agora tem um sistema seguro e controlado para importar dados!**
