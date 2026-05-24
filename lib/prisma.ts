import { PrismaClient } from '@prisma/client';

// Geliştirme (dev) ortamında sürekli yeni Prisma bağlantısı açılmasını engeller
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;