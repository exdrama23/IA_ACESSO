import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { chat } from "./controllers/chat";

dotenv.config();

const projectRoot = path.resolve(__dirname, "../../.."); 
const publicAudioPath = path.join(projectRoot, "public", "audio");

console.log("Caminho de Áudio Detectado:", publicAudioPath);
if (!fs.existsSync(publicAudioPath)) {
  console.log("Criando pasta de áudio...");
  fs.mkdirSync(publicAudioPath, { recursive: true });
}
console.log("teste - ElevenLabs Key:", process.env.ELEVENLABS_API_KEY ? `Carregada (${process.env.ELEVENLABS_API_KEY.length})` : "NÃO ENCONTRADA");

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
}));

app.use(express.json());

app.use("/audio", express.static(publicAudioPath));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.post("/api/chat", upload.single("audio"), chat);

app.get("/health", (req, res) => {
  res.json({ status: "ok", publicAudioPath });
});

import { initFAQEmbeddings } from "./ai/embeddings";

app.listen(port, async () => {
  await initFAQEmbeddings();
  console.log(`Servidor AcessoIA rodando em http://localhost:${port}`);
});

export default app;
