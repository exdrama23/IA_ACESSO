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

export const formatarRespostaParaTotem = formatarRespostaComDirecionamento;

export function gerarSugestoesRelacionadas(
  categoria: string
): string[] {
  return [];
}
