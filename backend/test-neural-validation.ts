import { neuralDetector } from "./src/ai/neuralEmbeddings";
import { performance } from "perf_hooks";
import fs from "fs";
import path from "path";

async function runTests() {
  console.log("Iniciando Validação Production-Ready da Rede Neural...\n");

  try {
    await neuralDetector.initialize();

    console.log("--- Test 1: Múltiplas Variações ---");
    const r1 = await neuralDetector.findCategoryBySimilarity("Qual é o valor?");
    const r2 = await neuralDetector.findCategoryBySimilarity("Quanto custa?");
    const r3 = await neuralDetector.findCategoryBySimilarity("Qual preço?");

    if (r1?.categoria === r2?.categoria && r2?.categoria === r3?.categoria && r1?.score! >= 0.85) {
      console.log("PASSED: Todas as variações retornaram a mesma categoria com score > 0.85\n");
    } else {
      console.error("FAILED: Variações inconsistentes ou score baixo");
      console.log({ r1, r2, r3 });
    }

    console.log("--- Test 2: Normalização e Typos ---");
    const resultTypo = await neuralDetector.findCategoryBySimilarity("COMO CONTRATAR???");
    const resultNormal = await neuralDetector.findCategoryBySimilarity("como contratar");

    if (resultTypo?.score! >= 0.95 && resultTypo?.categoria === resultNormal?.categoria) {
      console.log("PASSED: Normalização lidou com CAPS e pontuação (Score: " + resultTypo?.score.toFixed(3) + ")\n");
    } else {
      console.error("FAILED: Normalização falhou");
      console.log({ resultTypo, resultNormal });
    }

    console.log("--- Test 3: Performance ---");
    const measurements = [];
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      await neuralDetector.findCategoryBySimilarity("como contratar fibra");
      measurements.push(performance.now() - start);
    }
    const avgTime = measurements.reduce((a, b) => a + b) / measurements.length;
    if (avgTime < 10) { 
      console.log(`PASSED: Latência média de ${avgTime.toFixed(2)}ms (Alvo: < 10ms)\n`);
    } else {
      console.warn(`WARNING: Latência média de ${avgTime.toFixed(2)}ms está acima do ideal\n`);
    }

    console.log("--- Test 4: Cache de Embeddings ---");
    const cachePath = path.join(process.cwd(), "cache", "faq_embeddings.json");
    if (fs.existsSync(cachePath)) {
      const cache = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
      console.log(`Total embeddings pré-computados: ${cache.length}`);
      if (cache.length >= 150) {
        console.log("PASSED: Cache contém 150+ variações\n");
      } else {
        console.warn(`WARNING: Cache contém apenas ${cache.length} variações. Verifique se todas as perguntas do FAQ estão sendo processadas.\n`);
      }
    } else {
      console.error("FAILED: Arquivo de cache não encontrado\n");
    }

  } catch (error) {
    console.error("Erro durante os testes:", error);
  }
}

runTests();
