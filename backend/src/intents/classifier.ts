export function getIntent(text: string): string {
  if (/preço|valor|custo|quanto|pagar/i.test(text)) return "preco";
  if (/plano|internet|velocidade|megas/i.test(text)) return "plano";
  if (/suporte|ajuda|problema|lento|caiu|contato/i.test(text)) return "suporte";

  return "geral";
}
