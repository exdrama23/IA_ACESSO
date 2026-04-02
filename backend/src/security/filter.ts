export function isMalicious(input: string): boolean {
  // 🔒 Verificação de segurança pode ser desativada via variável de ambiente
  const securityEnabled = process.env.ENABLE_SECURITY_CHECK !== 'false';
  
  if (!securityEnabled) {
    console.log('[SECURITY] 🚀 MODO DEV: Verificação de segurança desativada');
    return false;
  }

  const blacklist = [
    "ignore previous",
    "act as",
    "system prompt",
    "bypass",
    "finja que",
    "ignore instruções anteriores",
    "revelar prompt"
  ];

  const isMaliciousInput = blacklist.some(word =>
    input.toLowerCase().includes(word)
  );

  if (isMaliciousInput) {
    console.log('[SECURITY] ⚠️ Input suspeito detectado e bloqueado');
  }

  return isMaliciousInput;
}
