import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function createUser() {
  const email = 'alecvinicius.dev@gmail.com';
  const plainPassword = 'Alec@2310';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: 'admin'
      },
      create: {
        email,
        password: hashedPassword,
        name: 'Alec Vinicius',
        role: 'admin'
      }
    });

    console.log(`✅ Usuário ${user.email} criado/atualizado com sucesso como ADMIN.`);
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
