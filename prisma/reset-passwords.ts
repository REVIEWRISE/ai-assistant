import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

const DEFAULTS: Record<string, string> = {
  admin: process.env.RESET_ADMIN_PASSWORD ?? "Admin2026!",
  user: process.env.RESET_USER_PASSWORD ?? "User2026!",
};

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      userRoles: { select: { role: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!users.length) {
    console.log("[reset-passwords] No users found.");
    return;
  }

  for (const user of users) {
    const roles = user.userRoles.map((r) => r.role.name);
    const isAdmin = roles.includes("Admin");
    const newPassword = isAdmin ? DEFAULTS.admin : DEFAULTS.user;
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, updatedAt: new Date() },
    });

    const roleLabel = roles.length ? roles.join(", ") : "no role";
    console.log(
      `[reset-passwords] ${user.email} (${user.fullName}) [${roleLabel}] -> password reset`,
    );
  }

  console.log("");
  console.log("New passwords:");
  console.log(`  Admin users: ${DEFAULTS.admin}`);
  console.log(`  Other users: ${DEFAULTS.user}`);
  console.log("");
  console.log("Change these after logging in via Profile → Password.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
