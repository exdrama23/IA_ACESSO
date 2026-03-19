import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { chat } from "./controllers/chat";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.post("/api/chat", upload.single("audio"), chat);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "AcessoIA Backend" });
});

import { initFAQEmbeddings } from "./ai/embeddings";

app.listen(port, async () => {
  await initFAQEmbeddings();
  console.log(`Servidor AcessoIA rodando em http://localhost:${port}`);
});

export default app;
