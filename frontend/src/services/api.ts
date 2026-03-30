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
