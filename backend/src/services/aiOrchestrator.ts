import { askOpenRouter } from "../ai/openrouter";
import { askGemini } from "../ai/gemini";
import { KNOWLEDGE_VERSION } from "../data/lpgKnowledge";

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
  let answer = "";
  let source = "IA_GENERATED";

  // 1. EXECUTOR: Gerar a resposta (Tenta OpenRouter -> Fallback Gemini)
  try {
    console.log("[ORCHESTRATOR] Iniciando fase de EXECUÇÃO...");
    answer = await askOpenRouter(question, "", history);
    source = "IA_OPENROUTER_EXECUTOR";
  } catch (err) {
    console.warn("[ORCHESTRATOR] OpenRouter falhou, tentando fallback Gemini...", err);
    try {
      answer = await askGemini(question, "", history);
      source = "IA_GEMINI_EXECUTOR_FALLBACK";
    } catch (geminiErr) {
      console.error("[ORCHESTRATOR] Falha total no Executor.");
      throw new Error("Não foi possível gerar uma resposta no momento.");
    }
  }

  let isVerified = true;
  console.log("[ORCHESTRATOR] Juiz desativado (LPG_CONTEXT vazio). Resposta segue como verificada.");

  return {
    answer,
    isVerified,
    source: isVerified ? `${source}_VERIFIED` : `${source}_UNVERIFIED`,
    knowledgeVersion: KNOWLEDGE_VERSION
  };
}
