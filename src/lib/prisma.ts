import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as typeof global & {
  _prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma._prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma._prisma = prisma;
}
