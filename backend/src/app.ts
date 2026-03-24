import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { chat } from "./controllers/chat";
import { initFAQEmbeddings } from "./ai/embeddings";
import { initSemantic } from "./ai/semantic";
import { getAdminDashboard, updateSystemConfig, getCacheStatistics } from "./controllers/admin";
import { getMetrics, getAuditLogs } from "./controllers/metrics";
import { login, logout, forgotPassword, resetPassword } from "./controllers/auth";
import { verifyToken, requireAdmin } from "./middleware/auth";
import { createRateLimiter } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/errorHandler";
import { healthCheck } from "./controllers/health";
import { prisma } from "./lib/prisma";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
}));
app.use(express.json());

app.use(createRateLimiter({ windowMs: 60000, maxRequests: 100 }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.get("/health", healthCheck);
app.post("/auth/login", createRateLimiter({ windowMs: 900000, maxRequests: 10 }), login);
app.post("/auth/forgot-password", createRateLimiter({ windowMs: 900000, maxRequests: 5 }), forgotPassword);
app.post("/auth/reset-password", createRateLimiter({ windowMs: 900000, maxRequests: 5 }), resetPassword);

app.post("/api/chat", 
  (req, res, next) => {
    console.log('[CHAT] POST recebido:', {
      method: req.method,
      ip: req.ip,
      headers: req.headers,
      hasFile: !!req.file
    });
    next();
  },
  upload.single("audio"), 
  chat
);

app.get("/admin/dashboard", verifyToken, requireAdmin, getAdminDashboard);
app.post("/admin/config", verifyToken, requireAdmin, updateSystemConfig);
app.get("/admin/cache-stats", verifyToken, requireAdmin, getCacheStatistics);
app.get("/admin/metrics", verifyToken, requireAdmin, getMetrics);
app.get("/admin/audit-logs", verifyToken, requireAdmin, getAuditLogs);
app.post("/auth/logout", verifyToken, logout);

app.use(errorHandler);

const server = app.listen(port, async () => {
  try {
    
    await prisma.$connect();
    console.log('[PRISMA] Conectado ao Neon DB');
  } catch (error) {
    console.error('[PRISMA] Erro ao conectar:', error);
  }

  await initFAQEmbeddings();
  await initSemantic();
  console.log(`Servidor AcessoIA (PROD-READY) rodando em http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM recebido, encerrando...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

export default app;
