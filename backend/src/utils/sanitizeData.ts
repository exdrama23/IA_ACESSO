/**
 * Utilitário de sanitização rigorosa para segurança do sistema.
 */
export function sanitizeInput(text: string): string {
  if (!text) return "";
  
  return text
    .replace(/[<>]/g, "") // Remove tags HTML básicas
    .replace(/[\$\{\}]/g, "") // Remove interpolação de strings (ataques JS/TS)
    .replace(/\\/g, "") // Remove contra-barras
    .trim()
    .substring(0, 500); // Limita tamanho para evitar buffer overflow de tokens
}

/**
 * Remove caracteres que podem ser usados em SQL Injection em queries brutas
 */
export function sanitizeSQL(text: string): string {
  return text.replace(/['";\-\-]/g, "");
}
