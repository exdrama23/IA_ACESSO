export function isMalicious(input: string): boolean {
  const blacklist = [
    "ignore previous",
    "act as",
    "system prompt",
    "bypass",
    "finja que",
    "ignore instruções anteriores",
    "revelar prompt"
  ];

  return blacklist.some(word =>
    input.toLowerCase().includes(word)
  );
}
