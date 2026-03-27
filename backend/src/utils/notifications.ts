import { prisma } from '../lib/prisma';

export type NotificationType = 'error' | 'warning' | 'success' | 'info';

export async function createSystemNotification(data: {
  adminId?: string;
  type: NotificationType;
  title: string;
  message: string;
}) {
  try {
    const admins = data.adminId 
      ? [{ id: data.adminId }] 
      : await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });

    const notifications = admins.map(admin => ({
      adminId: admin.id,
      type: data.type,
      title: data.title,
      message: data.message,
    }));

    await prisma.notification.createMany({
      data: notifications
    });

    console.log(`[NOTIFICATION] ${data.type.toUpperCase()}: ${data.title}`);
  } catch (error) {
    console.error('[NOTIFICATION] Erro ao criar notificação:', error);
  }
}
