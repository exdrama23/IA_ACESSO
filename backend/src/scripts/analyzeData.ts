import fs from "fs/promises";
import path from "path";
import { prisma } from "../lib/prisma";
import { createId as cuid } from "@paralleldrive/cuid2";

interface RawDataItem {
  question: string;
  answer: string;
  category?: string;
  source?: string;
  [key: string]: any;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface AnalysisReport {
  totalItems: number;
  validItems: number;
  invalidItems: number;
  duplicates: number;
  warnings: string[];
  preview: RawDataItem[];
  estimatedStorage: string;
  timeEstimate: string;
  recommendations: string[];
}

/**
 * 🔍 FASE 1: ANÁLISE DE DADOS
 * Validar arquivo antes de aplicar
 */
export async function analyzeDataFile(filePath: string): Promise<AnalysisReport> {
  console.log("\n📊 INICIANDO ANÁLISE DE DADOS\n");
  console.log(`Arquivo: ${filePath}`);

  // 1. Ler arquivo
  const rawData = await readDataFile(filePath);
  console.log(`✅ Arquivo lido: ${rawData.length} registros\n`);

  // 2. Validar cada item
  const validationResults: ValidationResult[] = [];
  const validItems: RawDataItem[] = [];
  const invalidItems: RawDataItem[] = [];

  console.log("🔍 Validando registros...");
  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    const result = validateItem(item, i);

    validationResults.push(result);

    if (result.isValid) {
      validItems.push(item);
    } else {
      invalidItems.push(item);
    }

    if ((i + 1) % 100 === 0) {
      console.log(`  ✓ ${i + 1}/${rawData.length} processados`);
    }
  }

  console.log(`✅ Validação completa\n`);

  // 3. Detectar duplicatas
  console.log("🔎 Detectando duplicatas...");
  const duplicates = detectDuplicates(validItems);
  console.log(`✅ Análise de duplicatas concluída\n`);

  // 4. Analisar qualidade
  const qualityIssues = analyzeQuality(validItems);

  // 5. Estimar recursos
  const estimatedStorage = estimateStorage(validItems);
  const timeEstimate = estimateProcessingTime(validItems);

  // 6. Gerar recomendações
  const recommendations = generateRecommendations(
    validItems,
    duplicates,
    qualityIssues
  );

  // 7. Criar preview
  const preview = validItems.slice(0, 5);

  const report: AnalysisReport = {
    totalItems: rawData.length,
    validItems: validItems.length,
    invalidItems: invalidItems.length,
    duplicates: duplicates.length,
    warnings: qualityIssues,
    preview,
    estimatedStorage,
    timeEstimate,
    recommendations,
  };

  return report;
}

/**
 * Ler arquivo (suporta JSON e CSV)
 */
async function readDataFile(filePath: string): Promise<RawDataItem[]> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".json") {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } else if (ext === ".csv") {
    const content = await fs.readFile(filePath, "utf-8");
    return parseCSV(content);
  } else {
    throw new Error(`Formato não suportado: ${ext}. Use .json ou .csv`);
  }
}

/**
 * Parser CSV simples
 */
function parseCSV(content: string): RawDataItem[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV vazio");

  const headers = lines[0].split(",").map((h) => h.trim());
  const items: RawDataItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const item: RawDataItem = { question: '', answer: '' };

    headers.forEach((header, idx) => {
      item[header] = values[idx] || "";
    });

    items.push(item);
  }

  return items;
}

/**
 * Validar um item individual
 */
function validateItem(item: RawDataItem, index: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Campos obrigatórios
  if (!item.question || item.question.trim().length === 0) {
    errors.push(`Linha ${index + 1}: Campo 'question' vazio`);
  }

  if (!item.answer || item.answer.trim().length === 0) {
    errors.push(`Linha ${index + 1}: Campo 'answer' vazio`);
  }

  // Validações de tamanho
  if (item.question && item.question.length < 5) {
    warnings.push(`Linha ${index + 1}: Pergunta muito curta (<5 caracteres)`);
  }

  if (item.answer && item.answer.length < 10) {
    warnings.push(`Linha ${index + 1}: Resposta muito curta (<10 caracteres)`);
  }

  if (item.question && item.question.length > 1000) {
    errors.push(`Linha ${index + 1}: Pergunta muito longa (>1000 caracteres)`);
  }

  if (item.answer && item.answer.length > 10000) {
    errors.push(`Linha ${index + 1}: Resposta muito longa (>10000 caracteres)`);
  }

  // Validar caracteres especiais suspeitos
  if (item.question && item.question.includes("<script>")) {
    errors.push(`Linha ${index + 1}: Possível injeção XSS detectada`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Detectar duplicatas (perguntas muito similares)
 */
function detectDuplicates(
  items: RawDataItem[]
): Array<{ item1: RawDataItem; item2: RawDataItem; similarity: number }> {
  const duplicates: Array<{
    item1: RawDataItem;
    item2: RawDataItem;
    similarity: number;
  }> = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const q1 = normalize(items[i].question);
      const q2 = normalize(items[j].question);

      if (q1 === q2) {
        duplicates.push({
          item1: items[i],
          item2: items[j],
          similarity: 1.0,
        });
      }
    }
  }

  return duplicates;
}

/**
 * Analisar qualidade dos dados
 */
function analyzeQuality(items: RawDataItem[]): string[] {
  const issues: string[] = [];

  let shortAnswers = 0;
  let missingCategories = 0;
  let veryLongAnswers = 0;

  items.forEach((item) => {
    if (item.answer.length < 20) shortAnswers++;
    if (!item.category) missingCategories++;
    if (item.answer.length > 5000) veryLongAnswers++;
  });

  if (shortAnswers > items.length * 0.1) {
    issues.push(`⚠️ ${shortAnswers} respostas muito curtas (<20 caracteres)`);
  }

  if (missingCategories > items.length * 0.2) {
    issues.push(`⚠️ ${missingCategories} itens sem categoria`);
  }

  if (veryLongAnswers > items.length * 0.05) {
    issues.push(`⚠️ ${veryLongAnswers} respostas muito longas (>5000 caracteres)`);
  }

  return issues;
}

/**
 * Estimar armazenamento necessário
 */
function estimateStorage(items: RawDataItem[]): string {
  // Cada embedding: 384 floats × 4 bytes = 1.536 KB
  // Cada pergunta/resposta: ~500 bytes média
  // Total: ~2 KB por item

  const bytesPerItem = 2048; // 2 KB
  const totalBytes = items.length * bytesPerItem;

  if (totalBytes < 1024 * 1024) {
    return `${(totalBytes / 1024).toFixed(2)} KB`;
  } else if (totalBytes < 1024 * 1024 * 1024) {
    return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

/**
 * Estimar tempo de processamento
 */
function estimateProcessingTime(items: RawDataItem[]): string {
  // ~10ms por item para gerar embedding
  const msPerItem = 10;
  const totalMs = items.length * msPerItem;

  const minutes = Math.ceil(totalMs / 60000);
  const hours = Math.ceil(minutes / 60);

  if (minutes < 60) {
    return `~${minutes} minutos`;
  } else {
    return `~${hours} horas`;
  }
}

/**
 * Gerar recomendações
 */
function generateRecommendations(
  items: RawDataItem[],
  duplicates: any[],
  qualityIssues: string[]
): string[] {
  const recommendations: string[] = [];

  if (duplicates.length > 0) {
    recommendations.push(
      `🔄 ${duplicates.length} duplicatas encontradas - considere revisar antes de aplicar`
    );
  }

  if (qualityIssues.length > 0) {
    recommendations.push(`⚠️ Problemas de qualidade detectados - revisar dados`);
  }

  if (items.some((i) => !i.category)) {
    recommendations.push(`📁 Adicionar categorias aos itens para melhor organização`);
  }

  if (items.length > 10000) {
    recommendations.push(`📊 Dataset grande - considere processar em batches`);
  }

  if (items.length > 100000) {
    recommendations.push(
      `⚠️ Dataset MUITO grande - processar em múltiplos batches pequenos`
    );
  }

  return recommendations;
}

/**
 * Normalizar texto para comparação
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Imprimir relatório formatado
 */
export function printAnalysisReport(report: AnalysisReport): void {
  console.clear();
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║        📊 RELATÓRIO DE ANÁLISE DE DADOS               ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  // Resumo
  console.log("📈 RESUMO:");
  console.log(`   Total de registros:    ${report.totalItems}`);
  console.log(`   ✅ Válidos:            ${report.validItems}`);
  console.log(`   ❌ Inválidos:          ${report.invalidItems}`);
  console.log(`   🔄 Duplicatas:         ${report.duplicates}`);

  // Armazenamento
  console.log(`\n💾 ARMAZENAMENTO:`);
  console.log(`   Estimado:              ${report.estimatedStorage}`);

  // Tempo
  console.log(`\n⏱️  TEMPO ESTIMADO:`);
  console.log(`   Processamento:         ${report.timeEstimate}`);

  // Avisos
  if (report.warnings.length > 0) {
    console.log(`\n⚠️  AVISOS (${report.warnings.length}):`);
    report.warnings.slice(0, 5).forEach((w) => console.log(`   • ${w}`));
    if (report.warnings.length > 5) {
      console.log(
        `   ... e ${report.warnings.length - 5} mais avisos (ver arquivo completo)`
      );
    }
  }

  // Recomendações
  if (report.recommendations.length > 0) {
    console.log(`\n💡 RECOMENDAÇÕES:`);
    report.recommendations.forEach((r) => console.log(`   ${r}`));
  }

  // Preview
  console.log(`\n📋 PREVIEW (primeiros 5 registros):`);
  console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  report.preview.forEach((item, idx) => {
    console.log(`\n   [${idx + 1}]`);
    console.log(`   Q: ${item.question.substring(0, 60)}...`);
    console.log(`   A: ${item.answer.substring(0, 60)}...`);
    if (item.category) console.log(`   C: ${item.category}`);
  });
  console.log(`\n   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Ação
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  ✅ ANÁLISE COMPLETA - Pronto para próximo passo      ║");
  console.log("║                                                        ║");
  console.log("║  Se está satisfeito com a análise:                   ║");
  console.log("║  Execute: npm run ingest:apply -- <arquivo>          ║");
  console.log("║                                                        ║");
  console.log("║  Se encontrou problemas:                             ║");
  console.log("║  Corrija os dados e tente novamente                  ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");
}

// Main para executar script
if (require.main === module) {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error("❌ Uso: npx ts-node analyzeData.ts <arquivo.json ou arquivo.csv>");
    process.exit(1);
  }

  analyzeDataFile(filePath)
    .then((report) => {
      printAnalysisReport(report);

      // Salvar relatório em JSON
      const reportPath = filePath.replace(/\.[^/.]+$/, "") + "_report.json";
      fs.writeFile(reportPath, JSON.stringify(report, null, 2)).then(() => {
        console.log(`📄 Relatório salvo: ${reportPath}\n`);
      });
    })
    .catch((error) => {
      console.error("❌ Erro na análise:", error.message);
      process.exit(1);
    });
}
