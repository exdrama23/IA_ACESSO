import { Request, Response } from 'express';
import { MaintenanceService } from '../services/maintenanceService';
import { prisma } from '../lib/prisma';
import { KNOWLEDGE_VERSION } from '../data/acessoKnowledge';

export async function invalidateVersion(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const count = await MaintenanceService.invalidateOldVersions(KNOWLEDGE_VERSION, adminId);
    res.json({ status: 'ok', count });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

export async function invalidatePattern(req: Request, res: Response) {
  try {
    const { pattern } = req.body;
    if (!pattern) return res.status(400).json({ status: 'error', message: 'Padrão não fornecido' });
    
    const adminId = (req as any).user?.id;
    const result = await MaintenanceService.invalidateByPattern(pattern, adminId);
    res.json({ status: 'ok', ...result });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

export async function getPendingCuration(req: Request, res: Response) {
  try {
    // Busca registros não verificados ou que precisam de revalidação
    const pending = await prisma.chatHistory.findMany({
      where: {
        OR: [
          { isVerified: false },
          { needsRevalidation: true }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        question: true,
        answer: true,
        source: true,
        confidence: true,
        isVerified: true,
        createdAt: true
      }
    });
    res.json(pending);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

export async function verifyRecord(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { status } = req.body; // true para aprovar, false para deletar

    if (status) {
      await prisma.chatHistory.update({
        where: { id },
        data: { isVerified: true, needsRevalidation: false }
      });
    } else {
      await prisma.chatHistory.delete({ where: { id } });
    }

    res.json({ status: 'ok' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}
