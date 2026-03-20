import { searchFAQ, initFAQEmbeddings } from "./src/ai/embeddings";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  console.log("Inicializando embeddings...");
  await initFAQEmbeddings();

  const questionsToTest = [
    "qual é o cnpj da empresa?",
    "Quais são os planos de internet fibra?",
    "Quanto custa a internet de fibra?",
    "Qual o valor do serviços da empresa"
  ];

  for (const q of questionsToTest) {
    console.log(`\nTestando: "${q}"`);
    const matches = await searchFAQ(q, 1);
    if (matches.length > 0) {
      console.log(`Top Match: "${matches[0].item.questions[0]}"`);
      console.log(`Score: ${matches[0].score}`);
      console.log(`Resposta: ${matches[0].item.answer.substring(0, 50)}...`);
    } else {
      console.log("Nenhum match encontrado.");
    }
  }
}

test();
