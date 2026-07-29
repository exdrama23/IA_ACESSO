# ⚡ Quick Start: Importação Segura de Dados

## 🚀 Em 3 Passos

### PASSO 1: Analisar (Sem Risco)
```bash
# Não faz nada no banco, apenas analisa o arquivo
npx ts-node backend/src/scripts/analyzeData.ts seu_arquivo.json

# Você verá:
# - Total de registros
# - Válidos/Inválidos
# - Duplicatas
# - Avisos e recomendações
# - Preview dos dados
```

### PASSO 2: Revisar Relatório
```
Coisas importantes:
✅ Taxa de validade > 95% ?
✅ Duplicatas < 5% ?
✅ Preview faz sentido ?
✅ Você quer importar esses dados ?
```

### PASSO 3: Importar
```bash
# Isso SIM vai salvar no banco
npx ts-node backend/src/scripts/importData.ts seu_arquivo.json

# Será pedido confirmação:
# ⚠️  Isso vai adicionar dados ao banco. Deseja continuar? (s/n):
# Digite: s

# Aguarde completar
```

---

## 📁 Arquivos Criados para Você

| Arquivo | Descrição |
|---------|-----------|
| `analyzeData.ts` | Script de análise (validação) |
| `importData.ts` | Script de importação (aplicar dados) |
| `GUIA_IMPORTACAO_SEGURA.md` | Guia completo detalhado |
| `example_data_import.json` | Exemplo de arquivo para testar |

---

## 🧪 Testar com Exemplo

```bash
# 1. Analisar arquivo exemplo
npx ts-node backend/src/scripts/analyzeData.ts example_data_import.json

# 2. Revisar saída (deve ter ~15 registros válidos)

# 3. Teste seco (simulação)
npx ts-node backend/src/scripts/importData.ts example_data_import.json --dry-run

# 4. Importar de verdade
npx ts-node backend/src/scripts/importData.ts example_data_import.json
```

---

## ⚠️ Checklist de Segurança

Antes de importar dados reais:

- [ ] Fiz backup do banco? (`pg_dump`)
- [ ] Analisei o arquivo completo?
- [ ] Taxa de validade > 95%?
- [ ] Revisei o preview dos dados?
- [ ] Testei com `--dry-run` primeiro?
- [ ] Entendo de onde vêm os dados?

Se SIM para tudo → Seguro importar!

---

## 📊 Formato do Arquivo

**JSON (recomendado):**
```json
[
  {
    "question": "Pergunta aqui",
    "answer": "Resposta aqui",
    "category": "categoria_opcional",
    "source": "origem_opcional"
  }
]
```

**CSV:**
```csv
question,answer,category,source
"Pergunta aqui","Resposta aqui","categoria","origem"
```

---

## 🎯 Fluxo Completo

```
Arquivo de dados
      ↓
Análise (validação)
      ↓
Revisar relatório
      ↓
Teste seco (dry-run)
      ↓
Confirmação do usuário
      ↓
Importação (salva no banco)
      ↓
Verificação no banco
```

---

## 💾 Comandos Rápidos

```bash
# Analisar
npx ts-node backend/src/scripts/analyzeData.ts dados.json

# Teste seco (simula, não salva)
npx ts-node backend/src/scripts/importData.ts dados.json --dry-run

# Importar de verdade
npx ts-node backend/src/scripts/importData.ts dados.json

# Ver dados importados no banco
psql -c "SELECT COUNT(*) FROM \"ChatHistory\" WHERE source = 'imported';"
```

---

## 🚨 Se Algo Dar Errado

**Problema: Importação não funcionou**
```bash
# Não se preocupe, o banco não foi alterado
# Tente novamente após revisar os erros
npx ts-node backend/src/scripts/analyzeData.ts dados.json
```

**Problema: Muitos erros de validação**
```bash
# Editar arquivo para corrigir problemas
# Certifique que tem 'question' e 'answer' não vazios
# Tamanho: 5-1000 caracteres (question), 10-10000 (answer)
```

**Problema: Processo foi interrompido**
```bash
# Não há problema, restart:
npx ts-node backend/src/scripts/importData.ts dados.json
# Continuará de onde parou
```

---

## 📚 Referência Completa

Para detalhes completos: [GUIA_IMPORTACAO_SEGURA.md](GUIA_IMPORTACAO_SEGURA.md)

---

## ✅ Tudo Pronto!

Você agora tem um sistema **100% seguro** para importar dados em massa:

✅ Validação completa antes de aplicar
✅ Preview dos dados
✅ Teste seco (dry-run)
✅ Confirmação do usuário
✅ Processamento em batches
✅ Recuperação de erros
✅ Monitoramento em tempo real

**Próximo passo:** Prepare seus dados e execute a análise! 🚀
