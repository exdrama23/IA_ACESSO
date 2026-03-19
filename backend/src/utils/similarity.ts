import stringSimilarity from "string-similarity";
import { FAQItem } from "../data/faq";


const SINONIMOS: Record<string, string[]> = {
  preco: ["valor", "custo", "mensalidade", "quanto e", "pagar", "tabela", "fatura", "conta"],
  melhor: ["boa", "recomendada", "confiavel", "rapida", "estavel", "vantagem", "diferencial"],
  internet: ["fibra", "rede", "conexao", "sinal", "net", "uifi", "wifi"],
  atendimento: ["suporte", "ajuda", "tecnico", "conserto", "problema", "contato", "falar"],
  praia: ["litoral", "abais", "saco", "porto do mato", "veraneio", "ferias"],
  empresa: ["voces", "acesso net", "provedor", "historia", "jf solucoes"]
};

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "")
    .trim();
}

function expandirSemantica(texto: string): string {
  let textoExpandido = texto;
  const textoNorm = normalizar(texto);

  Object.entries(SINONIMOS).forEach(([chave, variacoes]) => {
    variacoes.forEach(v => {
      if (textoNorm.includes(v)) {
        textoExpandido += ` ${chave}`; 
      }
    });
  });
  return textoExpandido;
}

function dividirPergunta(pergunta: string): string[] {
  const partes = pergunta.split(/,| e | tambem | alem disso | alem de | mas /gi);
  return partes.map(p => p.trim()).filter(p => p.length > 3);
}


function calcularRank(input: string, item: FAQItem): number {
  const inputNorm = normalizar(input);
  const inputExpandido = normalizar(expandirSemantica(input));
  
  let maxFraseScore = 0;
  item.questions.forEach(q => {
    const score = stringSimilarity.compareTwoStrings(inputNorm, normalizar(q));
    if (score > maxFraseScore) maxFraseScore = score;
  });

  let keywordScore = 0;
  let matches = 0;
  item.keywords.forEach(kw => {
    if (inputExpandido.includes(normalizar(kw))) {
      matches++;
    }
  });
  if (item.keywords.length > 0) {
    keywordScore = (matches / item.keywords.length) * 0.8;
  }

  const categoryScore = inputExpandido.includes(normalizar(item.category)) ? 0.5 : 0;

  return Math.max(maxFraseScore, keywordScore + categoryScore);
}

export function processComplexQuestion(question: string, faqData: Record<string, FAQItem[]>): string | null {
  const subPerguntas = dividirPergunta(question);
  const flattenedFAQ = Object.values(faqData).flat();
  const itensSelecionados: FAQItem[] = [];
  const respostasUnicas: Set<string> = new Set();

  subPerguntas.forEach(sub => {
    const candidatos = flattenedFAQ
      .map(item => ({ item, score: calcularRank(sub, item) }))
      .filter(c => c.score > 0.55)
      .sort((a, b) => b.score - a.score)
      .slice(0, 1); 

    candidatos.forEach(c => {
      if (!respostasUnicas.has(c.item.answer)) {
        respostasUnicas.add(c.item.answer);
        itensSelecionados.push(c.item);
      }
    });
  });

  if (itensSelecionados.length === 0) return null;

  return itensSelecionados
    .map((item, index) => {
      let texto = item.answer;
      if (index > 0) {
        const conectores = ["Além disso,", "Sobre o outro ponto,", "E tem mais:", "Também vale lembrar que"];
        const conector = conectores[Math.floor(Math.random() * conectores.length)];
        texto = `${conector} ${texto.charAt(0).toLowerCase() + texto.slice(1)}`;
      }
      return texto;
    })
    .join(" ");
}

export function findBestMatch(question: string, lista: FAQItem[]): FAQItem | null {
  let melhorItem: FAQItem | null = null;
  let melhorScore = 0;

  lista.forEach(item => {
    const score = calcularRank(question, item);
    if (score > melhorScore) {
      melhorScore = score;
      melhorItem = item;
    }
  });

  return melhorScore > 0.6 ? melhorItem : null;
}
