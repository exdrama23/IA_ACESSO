import { askOpenRouter } from "../ai/openrouter";
import { askOpenAI } from "../ai/openai";
import { askGemini } from "../ai/gemini";
import { acessoKnowledge, KNOWLEDGE_VERSION } from "../data/acessoKnowledge";
import { trackAICall } from "./costTracker";

export interface OrchestrationResult {
  answer: string;
  isVerified: boolean;
  source: string;
  knowledgeVersion: string;
}

export async function orchestrateAIResponse(
  question: string, 
  history: any[] = []
): Promise<OrchestrationResult> {
  const context = JSON.stringify(acessoKnowledge);
  let answer = "";
  let source = "IA_GENERATED";

  // 1. EXECUTOR: Gerar a resposta (Tenta OpenRouter -> Fallback Gemini)
  try {
    console.log("[ORCHESTRATOR] Iniciando fase de EXECUÇÃO...");
    answer = await askOpenRouter(question, context, history);
    source = "IA_OPENROUTER_EXECUTOR";
  } catch (err) {
    console.warn("[ORCHESTRATOR] OpenRouter falhou, tentando fallback Gemini...", err);
    try {
      answer = await askGemini(question, context, history);
      source = "IA_GEMINI_EXECUTOR_FALLBACK";
    } catch (geminiErr) {
      console.error("[ORCHESTRATOR] Falha total no Executor.");
      throw new Error("Não foi possível gerar uma resposta no momento.");
    }
  }

  // 2. JUIZ: Validar a resposta (Tenta OpenAI GPT-4o -> Fallback Gemini Pro)
  let isVerified = false;
  try {
    console.log("[ORCHESTRATOR] Iniciando fase de JULGAMENTO...");
    const judgePrompt = `
      Você é um JUIZ DE QUALIDADE da ACESSO.NET.
      Sua tarefa é validar se a RESPOSTA gerada está 100% de acordo com o CONHECIMENTO OFICIAL da empresa.

      CONHECIMENTO OFICIAL:
      ${context}

      PERGUNTA DO CLIENTE: "${question}"
      RESPOSTA GERADA: "${answer}"

      REGRAS DE JULGAMENTO:
      1. Se a resposta contiver PREÇOS, DATAS ou DADOS TÉCNICOS, eles devem ser EXATAMENTE iguais ao Conhecimento Oficial.
      2. Se a resposta for "Não tenho essa informação", considere como VERDADEIRO (desde que a info realmente não esteja no texto).
      3. Se a resposta inventar qualquer dado, considere FALSO.

      Responda APENAS com uma única palavra: "VERDADEIRO" ou "FALSO".
    `;

    // Usando OpenAI como Juiz primário
    const judgeDecision = await askOpenAI(judgePrompt, "Você é um Juiz de Validação Técnica.", []);
    
    if (judgeDecision.toUpperCase().includes("VERDADEIRO")) {
      isVerified = true;
      console.log("[ORCHESTRATOR] ✅ Juiz OpenAI aprovou a resposta.");
    } else {
      console.warn("[ORCHESTRATOR] ❌ Juiz OpenAI REPROVOU a resposta.");
    }

  } catch (judgeErr) {
    console.warn("[ORCHESTRATOR] Juiz OpenAI falhou, tentando Juiz Gemini...", judgeErr);
    try {
      const judgeDecision = await askGemini("Valide se esta resposta é verdadeira ou falsa baseada no contexto: " + answer, context, []);
      if (judgeDecision.toUpperCase().includes("VERDADEIRO")) {
        isVerified = true;
      }
    } catch (e) {
      console.error("[ORCHESTRATOR] Falha total no Juiz. Resposta seguirá como não verificada.");
    }
  }

  return {
    answer,
    isVerified,
    source: isVerified ? `${source}_VERIFIED` : `${source}_UNVERIFIED`,
    knowledgeVersion: KNOWLEDGE_VERSION
  };
}
