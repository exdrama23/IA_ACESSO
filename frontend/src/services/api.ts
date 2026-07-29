export interface ChatResponse {
  text: string;
  audioUrl: string;
  source?: string;
}

// Configuração centralizada da URL da API
export const API_URL = import.meta.env.PROD 
  ? "https://ia-acesso.onrender.com" 
  : (import.meta.env.VITE_API_URL || "http://localhost:3001");

export async function sendText(text: string): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("Erro no Servidor:", errorBody);
    throw new Error("Falha na comunicação com o servidor");
  }

  return res.json();
}

export async function predictAI(text: string): Promise<{ willCallAI: boolean }> {
  try {
    const res = await fetch(`${API_URL}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return { willCallAI: true };
    return res.json();
  } catch {
    return { willCallAI: true };
  }
}

export async function sendAudio(audioBlob: Blob): Promise<ChatResponse> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "user_voice.webm");

  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("Erro no Servidor:", errorBody);
    throw new Error("Falha na comunicação com o servidor");
  }

  return res.json();
}

// Objeto api genérico para suportar chamadas REST (padrão Axios-like)
export const api = {
  getHeaders: () => {
    const token = localStorage.getItem('acessoia_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  },

  get: async (endpoint: string) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: api.getHeaders()
    });
    if (!res.ok) throw new Error(`Erro na requisição: ${res.status}`);
    const data = await res.json();
    return { data };
  },

  post: async (endpoint: string, body?: unknown) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: api.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Erro na requisição: ${res.status}`);
    const data = await res.json();
    return { data };
  },

  delete: async (endpoint: string) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: api.getHeaders()
    });
    if (!res.ok) throw new Error(`Erro na requisição: ${res.status}`);
    const data = await res.json();
    return { data };
  }
};
