import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Configuración optimizada para el pool de conexiones
export const prisma = globalThis.prisma || new PrismaClient({
  log: ['error', 'warn']
});

// Esto asegura que en desarrollo no se creen múltiples
// instancias de Prisma Client durante hot-reloading
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
