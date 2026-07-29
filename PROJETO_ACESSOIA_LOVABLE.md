# Prompt de Reprodução e Evolução: Projeto AcessoIA

Este documento contém a especificação técnica exata e a lógica de negócio do projeto AcessoIA para que a Lovable possa reconstruí-lo e aprimorá-lo.

## 1. Visão Geral do Projeto
Plataforma de acessibilidade e suporte inteligente com interface holográfica 3D, rastreamento gestual (MediaPipe) e motor semântico para economia de tokens e cache de voz.

## 2. Stack Tecnológica Detalhada

### Frontend (React + Vite)
- **Visualização 3D**: `three`, `@react-three/fiber`, `@react-three/drei`, `gsap`.
- **IA/Visão**: `@mediapipe/tasks-vision` (Rastreamento de mão).
- **Estado**: `zustand`.
- **UI**: `lucide-react`, `recharts`, `react-big-calendar`.
- **Estilo**: TailwindCSS + Vanilla CSS para efeitos holográficos.

### Backend (Node.js + Express)
- **ORM**: `prisma` (PostgreSQL).
- **IA/NLP**: `@google/generative-ai` (Gemini), `openai` (OpenRouter), `@xenova/transformers` (Embeddings locais), `natural`.
- **Processamento**: `sharp` (Imagens), `onnxruntime-node`.
- **Infra**: `ioredis` (Cache), `cloudinary` (Storage de áudio), `nodemailer`.

## 3. Schema do Banco de Dados (Prisma)
A Lovable deve seguir este modelo de dados:
- `User`: Autenticação e Roles (Admin/User).
- `ChatHistory`: Armazena perguntas, respostas, embeddings e confiança.
- `VoiceCache`: Mapeia perguntas para URLs de áudio (ElevenLabs/Cloudinary) para evitar custos.
- `SystemConfig`: Limiares de TF-IDF (default 0.75) e Gemini (default 0.85).
- `ApiUsage`: Rastreamento de custos e tokens por serviço.
- `AuditLog` & `ApiCall`: Logs de segurança e performance.

## 4. Lógica de Negócio e Fluxos de Dados

### 4.1. Motor Semântico e Fluxo de Persistência
1. O usuário envia texto ou áudio (transcritura inicial).
2. O sistema gera um embedding da pergunta para busca vetorial.
3. Busca no `ChatHistory` e `faq.ts` por similaridade de cosseno.
4. **Decisão**:
   - **Caso Similaridade > Limiar (Cache Hit)**: 
     - Recupera `answer` e `audioUrl` do `VoiceCache` ou `ChatHistory`.
     - Retorna imediatamente, economizando custos de LLM e TTS.
   - **Caso Similaridade < Limiar (Cache Miss)**: 
     - Envia para LLM (OpenRouter) com contexto injetado.
     - **Pós-Processamento Crítico**: 
       1. Recebe a resposta em texto da LLM.
       2. Dispara o serviço de TTS (ElevenLabs) para converter a resposta em áudio.
       3. Faz o upload do áudio para o Cloudinary e obtém a `audioUrl`.
       4. **Persistência Integral**: Salva um novo registro em `ChatHistory` contendo: `question`, `answer`, `audioUrl`, `source="llm"`, `confidence` (calculada ou padrão), `embedding` da pergunta e `sessionId`.
       5. **Alimenta Cache**: Registra a relação no `VoiceCache` para futuros reusos.
       6. Retorna o objeto completo para o frontend.

### 4.2. Interface de Gestos
- Captura webcam via MediaPipe Vision Tasks.
- Mapeia pontos da mão (landmarks) para coordenadas 3D.
- O componente `VirtualHand.tsx` atua como um cursor invisível que interage com os botões holográficos.

### 4.3. Administração
- Dashboard com métricas de economia (tokens economizados via cache).
- Gerenciamento de FAQ e configurações de sistema em tempo real.

## 5. Endpoints Principais
- `POST /api/chat`: Recebe áudio/texto e processa via motor semântico.
- `POST /auth/login`: Autenticação JWT com controle de tentativas.
- `GET /admin/metrics-detailed`: Dados para Recharts (uso de API, custos, cache hit rate).

## 6. Instruções de Melhoria para Lovable

1. **Eficiência Vetorial**: Substituir a busca linear em JSON por um banco vetorial real (PostgreSQL com `pgvector`).
2. **Visual Impact**: Evoluir o `HolographicUI.tsx` para usar Shaders customizados no Three.js para efeitos de scanline e distorção digital.
3. **Robustez**: Implementar tratamento de erro resiliente para quedas de internet durante o streaming de áudio.
4. **Análise de IA**: Avaliar se a lógica de `neuralEmbeddings.ts` pode ser unificada para rodar 100% no client-side via ONNX.

## 7. Design System
- **Fundo**: `#050505` (Deep Black).
- **Acento**: `#00f2ff` (Cyan Neon) e `#bc00ff` (Purple Vivid).
- **Efeitos**: Glassmorphism, Neon Glow, Scanlines de TV antiga.

Solicito a criação do projeto completo seguindo esta arquitetura e aplicando as melhorias sugeridas.
