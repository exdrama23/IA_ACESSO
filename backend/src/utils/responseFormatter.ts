export interface FormattedResponse {
  text: string;
  link: string;
  categoria: string;
}

export function formatarRespostaComDirecionamento(
  respostaFAQ: string,
  linkDirecionamento: string,
  categoria: string
): FormattedResponse {
  return {
    text: respostaFAQ,
    link: linkDirecionamento,
    categoria: categoria
  };
}

// Alias para compatibilidade
export const formatarRespostaParaTotem = formatarRespostaComDirecionamento;

export function gerarSugestoesRelacionadas(
  categoria: string
): string[] {
  const sugestoes: Record<string, string[]> = {
    "Internet Fibra": [
      "https://acesso.net/planos",
      "https://acesso.net/contratacao",
      "https://acesso.net/instalacao"
    ],
    "Acesso Saúde": [
      "https://acesso.net/saude/beneficios",
      "https://acesso.net/saude/cobertura"
    ],
    "Celular e Telefone": [
      "https://acesso.net/celular/planos",
      "https://acesso.net/celular/portabilidade"
    ]
  };

  return sugestoes[categoria] || ["https://acesso.net/ajuda"];
}
