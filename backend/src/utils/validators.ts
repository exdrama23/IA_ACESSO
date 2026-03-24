export interface ValidationError {
  field: string;
  message: string;
}

export function validateChatInput(input: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.text && !input.audio) {
    errors.push({ field: 'text/audio', message: 'Texto ou áudio obrigatório' });
  }

  if (input.text) {
    if (typeof input.text !== 'string') {
      errors.push({ field: 'text', message: 'Texto deve ser string' });
    } else {
      if (input.text.trim().length < 2) {
        errors.push({ field: 'text', message: 'Texto muito curto (mínimo 2 caracteres)' });
      }
      if (input.text.length > 500) {
        errors.push({ field: 'text', message: 'Texto muito longo (máximo 500 caracteres)' });
      }
    }
  }

  if (input.sessionId) {
    if (typeof input.sessionId !== 'string') {
      errors.push({ field: 'sessionId', message: 'SessionId deve ser string' });
    }
  }

  return errors;
}

export function validateConfigUpdate(input: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.embedding?.strategy) {
    if (!['tfidf', 'gemini', 'hybrid'].includes(input.embedding.strategy)) {
      errors.push({ field: 'embedding.strategy', message: 'Estratégia inválida' });
    }
  }

  if (input.embedding?.tfidf_threshold !== undefined) {
    const val = input.embedding.tfidf_threshold;
    if (typeof val !== 'number' || val < 0 || val > 1) {
      errors.push({ field: 'embedding.tfidf_threshold', message: 'Deve ser número entre 0 e 1' });
    }
  }

  return errors;
}
