import { askOpenRouter } from "../ai/openrouter";
import { askOpenAI } from "../ai/openai";
import { askGemini } from "../ai/gemini";
import { lpgKnowledge, KNOWLEDGE_VERSION } from "../data/lpgKnowledge";

const LPG_CONTEXT = `
LPG – Link Petróleo e Gás é uma startup que conecta profissionais, empresas prestadoras de serviços e grandes contratantes do setor de petróleo e gás.

Missão: Reduzir a distância entre quem busca mão de obra qualificada e quem procura oportunidades profissionais no setor de óleo e gás.

Diferencial: IA especializada que analisa perfis, certificações e experiências para fazer matching inteligente em tempo real.

Público-alvo: Profissionais do setor de petróleo e gás, empresas prestadoras de serviços e grandes contratantes.

Funcionalidades: Cadastro de currículos com certificações, experiências offshore e onshore, portfólio de empresas, matching inteligente com IA, recomendação em tempo real, varredura contínua de compatibilidade.

Status: Startup em fase de desenvolvimento e validação do modelo de negócio.

Visão: Tornar-se a principal plataforma inteligente de conexão profissional do setor de petróleo e gás na América Latina.
`;
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
  const context = LPG_CONTEXT;
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
      Você é um JUIZ DE QUALIDADE da LPG – Link Petróleo e Gás.
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
