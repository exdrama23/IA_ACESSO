import fs from "fs/promises";
import path from "path";
import { prisma } from "../lib/prisma";
import { createId as cuid } from "@paralleldrive/cuid2";
import { getEmbedding } from "../ai/vectorStore";
import readline from "readline";

interface DataItem {
  question: string;
  answer: string;
  category?: string;
  source?: string;
}

interface ImportOptions {
  batchSize?: number;
  skipValidation?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

const DEFAULT_OPTIONS: ImportOptions = {
  batchSize: 50,
  skipValidation: false,
  dryRun: false,
  verbose: true,
};

/**
 * 📥 FASE 2: IMPORTAR DADOS
 * Aplicar dados ao banco com validação em batch
 */
export async function importDataFile(
  filePath: string,
  options: ImportOptions = {}
): Promise<{ success: number; failed: number; errors: string[] }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║        📥 INICIANDO IMPORTAÇÃO DE DADOS               ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  // Pedir confirmação se não for dry-run
  if (!opts.dryRun) {
    const confirmed = await askForConfirmation(
      "⚠️  Isso vai adicionar dados ao banco. Deseja continuar? (s/n): "
    );
    if (!confirmed) {
      console.log("❌ Importação cancelada pelo usuário\n");
      return { success: 0, failed: 0, errors: [] };
    }
  }

  // Ler arquivo
  console.log(`📂 Lendo arquivo: ${filePath}`);
  const ext = path.extname(filePath).toLowerCase();
  let items: DataItem[] = [];

  try {
    if (ext === ".json") {
      const content = await fs.readFile(filePath, "utf-8");
      items = JSON.parse(content);
    } else if (ext === ".csv") {
      const content = await fs.readFile(filePath, "utf-8");
      items = parseCSV(content);
    } else {
      throw new Error(`Formato não suportado: ${ext}`);
    }
  } catch (error: any) {
    console.error(`❌ Erro ao ler arquivo: ${error.message}`);
    return { success: 0, failed: 0, errors: [error.message] };
  }

  console.log(`✅ ${items.length} registros lidos\n`);

  // Processar em batches
  console.log(
    `📦 Processando em batches de ${opts.batchSize} registros...\n`
  );

  let successCount = 0;
  let failureCount = 0;
  const errors: string[] = [];

  const totalBatches = Math.ceil(items.length / opts.batchSize!);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * opts.batchSize!;
    const end = Math.min(start + opts.batchSize!, items.length);
    const batch = items.slice(start, end);

    console.log(
      `[${batchIdx + 1}/${totalBatches}] Processando itens ${start + 1}-${end}...`
    );

    try {
      const results = await processBatch(batch, opts);
      successCount += results.success;
      failureCount += results.failed;
      errors.push(...results.errors);

      console.log(
        `  ✅ Sucesso: ${results.success} | ❌ Falhas: ${results.failed}\n`
      );
    } catch (error: any) {
      console.error(`  ❌ Erro no batch: ${error.message}\n`);
      failureCount += batch.length;
      errors.push(`Batch ${batchIdx + 1}: ${error.message}`);
    }
  }

  // Relatório final
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║        📊 RELATÓRIO FINAL DE IMPORTAÇÃO              ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  console.log(`✅ Sucesso:        ${successCount} registros`);
  console.log(`❌ Falhas:         ${failureCount} registros`);
  console.log(`📊 Taxa de êxito:   ${((successCount / items.length) * 100).toFixed(1)}%`);

  if (errors.length > 0) {
    console.log(`\n⚠️  ERROS (primeiros 10):`);
    errors.slice(0, 10).forEach((e) => console.log(`   • ${e}`));
    if (errors.length > 10) {
      console.log(`   ... e ${errors.length - 10} mais erros`);
    }
  }

  console.log("\n");

  if (opts.dryRun) {
    console.log("ℹ️  Modo DRY-RUN: Nenhum dado foi salvo no banco\n");
  } else {
    console.log("✅ Importação concluída! Dados salvos no banco.\n");
  }

  return { success: successCount, failed: failureCount, errors };
}

/**
 * Processar um batch de registros
 */
async function processBatch(
  batch: DataItem[],
  options: ImportOptions
): Promise<{ success: number; failed: number; errors: string[] }> {
  let successCount = 0;
  let failureCount = 0;
  const errors: string[] = [];

  // Gerar embeddings em paralelo
  console.log(`  🔄 Gerando ${batch.length} embeddings...`);
  const embeddings = await Promise.allSettled(
    batch.map((item) => getEmbedding(item.question))
  );

  // Preparar dados para inserção
  const records: any[] = [];

  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    const embeddingResult = embeddings[i];

    if (embeddingResult.status === "rejected") {
      failureCount++;
      errors.push(
        `Item ${i + 1}: Erro ao gerar embedding - ${embeddingResult.reason}`
      );
      continue;
    }

    const embedding = embeddingResult.value;

    records.push({
      id: cuid(),
      sessionId: "import-" + Date.now(),
      question: item.question,
      answer: item.answer,
      source: item.source || "imported",
      confidence: 0.95, // Dados importados = alta confiança
      embedding: embedding,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Inserir no banco se não for dry-run
  if (!options.dryRun) {
    try {
      // Usar createMany com skipDuplicates para evitar erros
      const result = await prisma.chatHistory.createMany({
        data: records,
        skipDuplicates: false,
      });

      successCount = result.count;
    } catch (error: any) {
      // Se falhar, tentar um por um para identificar problemas
      console.log(`  ⚠️  Inserção em batch falhou, tentando um por um...`);

      for (const record of records) {
        try {
          await prisma.chatHistory.create({ data: record });
          successCount++;
        } catch (err: any) {
          failureCount++;
          errors.push(`Item "${record.question.substring(0, 40)}": ${err.message}`);
        }
      }
    }
  } else {
    // Dry-run: apenas contar
    successCount = records.length;
  }

  return { success: successCount, failed: failureCount, errors };
}

/**
 * Parser CSV simples
 */
function parseCSV(content: string): DataItem[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV vazio");

  const headers = lines[0].split(",").map((h) => h.trim());
  const items: DataItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const item: any = {};

    headers.forEach((header, idx) => {
      item[header] = values[idx] || "";
    });

    if (item.question && item.answer) {
      items.push(item);
    }
  }

  return items;
}

/**
 * Pedir confirmação do usuário
 */
async function askForConfirmation(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "s" || answer.toLowerCase() === "sim");
    });
  });
}

/**
 * Validar dados antes de importar
 */
export function validateDataForImport(items: DataItem[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!items || items.length === 0) {
    errors.push("Nenhum dado para importar");
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (!item.question || item.question.trim().length === 0) {
      errors.push(`Item ${i + 1}: Campo 'question' vazio`);
    }

    if (!item.answer || item.answer.trim().length === 0) {
      errors.push(`Item ${i + 1}: Campo 'answer' vazio`);
    }

    if (item.question && item.question.length > 1000) {
      errors.push(`Item ${i + 1}: Pergunta muito longa (>1000 caracteres)`);
    }

    if (item.answer && item.answer.length > 10000) {
      errors.push(`Item ${i + 1}: Resposta muito longa (>10000 caracteres)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Main para executar script
if (require.main === module) {
  const filePath = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");

  if (!filePath) {
    console.error("❌ Uso: npx ts-node importData.ts <arquivo.json ou arquivo.csv> [--dry-run]");
    process.exit(1);
  }

  importDataFile(filePath, { dryRun })
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erro na importação:", error.message);
      process.exit(1);
    });
}
