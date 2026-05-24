import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  _prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Bump when Prisma schema changes so dev HMR does not keep a stale client (e.g. missing new columns). */
const PRISMA_CLIENT_GENERATION = "2026-05-24-customer-email";

const globalWithMeta = globalForPrisma as typeof globalForPrisma & {
  _prismaGeneration?: string;
};

if (
  process.env.NODE_ENV !== "production" &&
  globalWithMeta._prisma &&
  globalWithMeta._prismaGeneration !== PRISMA_CLIENT_GENERATION
) {
  void globalWithMeta._prisma.$disconnect();
  globalWithMeta._prisma = undefined;
}

export const prisma = globalWithMeta._prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalWithMeta._prisma = prisma;
  globalWithMeta._prismaGeneration = PRISMA_CLIENT_GENERATION;
}
