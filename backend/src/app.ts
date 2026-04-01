import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { chat } from "./controllers/chat";
import { initFAQEmbeddings } from "./ai/embeddings";
import { initSemantic } from "./ai/semantic";
import { neuralDetector } from "./ai/neuralEmbeddings";
import { getTables, getTableData } from "./controllers/database";
import { 
  getAdminDashboard, 
  updateSystemConfig, 
  getCacheStatistics,
  getUserProfile,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getMetricsDetailed,
  getNotifications,
  requestIntegrationChange,
  verifyIntegrationCode,
  updateIntegrationKey,
  updateNotificationPreferences,
  markNotificationRead,
  deleteNotification
} from "./controllers/admin";
import { getMetrics, getAuditLogs } from "./controllers/metrics";
import { login, logout, forgotPassword, resetPassword, changePassword } from "./controllers/auth";
import { verifyToken, requireAdmin } from "./middleware/auth";
import { createRateLimiter } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/errorHandler";
import { healthCheck } from "./controllers/health";
import { prisma } from "./lib/prisma";
import { initCleanupSchedule, runDatabaseCleanup } from "./utils/cleanup";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
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
app.post("/auth/change-password", verifyToken, createRateLimiter({ windowMs: 900000, maxRequests: 5 }), changePassword);

app.post("/api/chat", 
  (req, res, next) => {
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
app.get("/admin/database/tables", verifyToken, requireAdmin, getTables);
app.get("/admin/database/tables/:tableName", verifyToken, requireAdmin, getTableData);

app.get("/admin/user-profile", verifyToken, requireAdmin, getUserProfile);
app.get("/admin/calendar-events", verifyToken, requireAdmin, getCalendarEvents);
app.post("/admin/calendar-events", verifyToken, requireAdmin, createCalendarEvent);
app.put("/admin/calendar-events/:id", verifyToken, requireAdmin, updateCalendarEvent);
app.delete("/admin/calendar-events/:id", verifyToken, requireAdmin, deleteCalendarEvent);
app.get("/admin/metrics-detailed", verifyToken, requireAdmin, getMetricsDetailed);

app.get("/admin/notifications", verifyToken, requireAdmin, getNotifications);
app.patch("/admin/notifications/:id/read", verifyToken, requireAdmin, markNotificationRead);
app.delete("/admin/notifications/:id", verifyToken, requireAdmin, deleteNotification);
app.put("/admin/notifications/preferences", verifyToken, requireAdmin, updateNotificationPreferences);

app.post("/admin/integrations/request", verifyToken, requireAdmin, requestIntegrationChange);
app.post("/admin/integrations/verify", verifyToken, requireAdmin, verifyIntegrationCode);
app.post("/admin/integrations/update", verifyToken, requireAdmin, updateIntegrationKey);

app.post("/auth/logout", verifyToken, logout);

app.use(errorHandler);

const server = app.listen(port, async () => {
  try {
    await prisma.$connect();
  } catch (error) {
  }

  await initFAQEmbeddings();
  await initSemantic();
  
  try {
    await neuralDetector.initialize();
  } catch (error) {
  }

  initCleanupSchedule();
  runDatabaseCleanup();
});

process.on('SIGTERM', async () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

export default app;
