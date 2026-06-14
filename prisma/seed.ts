import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

const MENU_ITEMS = [
  { id: "5c9b931d-fd45-4efa-9ebf-aa18dd97a8dc", label: "Dashboard", path: "/dashboard", sortOrder: 0, description: "test description" },
  { id: "82e4d5db-f33c-4fca-a8be-a9d0631ac751", label: "User Management", path: "/users", sortOrder: 1 },
  { id: "9555f0bd-d829-44e9-a31f-5cb230a10478", label: "Appointment Agent", path: "/appointments", sortOrder: 2 },
  { id: "a6efd6f9-fc80-4555-a3f6-11889a625b0f", label: "Review Response", path: "/reviews", sortOrder: 3 },
  { id: "33c86cd0-a6b0-48f9-a04b-684dd8671ef7", label: "Access Control", path: "/settings/access", sortOrder: 4 },
  { id: "18d185ec-9cb2-46d9-bd27-e65d1341b66c", label: "Platform Settings", path: "/platform", sortOrder: 5 },
  { id: "7604c907-bca0-4927-adff-4dc0febc2868", label: "Profile", path: "/profile", sortOrder: 6 },
  { id: "48be418c-69cf-4c35-93b0-b572519677e3", label: "Overview", path: "/appointments/overview", sortOrder: 0, parentId: "9555f0bd-d829-44e9-a31f-5cb230a10478" },
  { id: "487de9f5-1954-4bfc-a0f1-06a3f5798250", label: "Organization", path: "/appointments/organization", sortOrder: 1, parentId: "9555f0bd-d829-44e9-a31f-5cb230a10478" },
  { id: "f9ea5923-c5a5-4a4a-81f4-76d09447d7e8", label: "Knowledge Base", path: "/appointments/knowledge-base", sortOrder: 2, parentId: "9555f0bd-d829-44e9-a31f-5cb230a10478" },
  { id: "87a7fa54-288b-4195-b466-efb22b80d0da", label: "Configure Chatbot", path: "/appointments/chatbot", sortOrder: 3, parentId: "9555f0bd-d829-44e9-a31f-5cb230a10478" },
  { id: "ef2ecbaf-f949-4d46-ab22-fb1e4262c87a", label: "Roles", path: "/settings/access/roles", sortOrder: 0, parentId: "33c86cd0-a6b0-48f9-a04b-684dd8671ef7" },
  { id: "e1f3ffe1-2158-4e4a-8b10-c6a2476dadb3", label: "Menus", path: "/settings/access/menus", sortOrder: 1, parentId: "33c86cd0-a6b0-48f9-a04b-684dd8671ef7" },
  { id: "b4b7c925-5791-4108-aafd-941d31a610c6", label: "Permissions", path: "/settings/access/permissions", sortOrder: 2, parentId: "33c86cd0-a6b0-48f9-a04b-684dd8671ef7" },
  { id: "8391fd57-8c49-46e1-8356-424d12f4d1d2", label: "Providers", path: "/platform/providers", sortOrder: 0, parentId: "18d185ec-9cb2-46d9-bd27-e65d1341b66c" },
] as const;

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme";
  const fullName = (process.env.SEED_ADMIN_NAME ?? "Seed Admin").trim();

  if (!email || !password || !fullName) {
    throw new Error("Seed admin email, password, and display name must be non-empty.");
  }

  if (process.env.SEED_ADMIN_PASSWORD === undefined) {
    console.warn(
      "[seed] SEED_ADMIN_PASSWORD not set; using default \"changeme\". Set SEED_ADMIN_PASSWORD in production.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    create: { name: "Admin" },
    update: {},
  });

  await prisma.role.upsert({
    where: { name: "User" },
    create: { name: "User" },
    update: {},
  });

  for (const item of MENU_ITEMS) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        label: item.label,
        path: item.path,
        sortOrder: item.sortOrder,
        description: "description" in item ? item.description : null,
        parentId: "parentId" in item ? item.parentId : null,
      },
      update: {
        label: item.label,
        path: item.path,
        sortOrder: item.sortOrder,
        description: "description" in item ? item.description : null,
        parentId: "parentId" in item ? item.parentId : null,
      },
    });
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      create: {
        email,
        fullName,
        passwordHash,
        accountStatus: "active",
        emailVerified: true,
      },
      update: {
        fullName,
        passwordHash,
        accountStatus: "active",
      },
    });

    await tx.userRole.deleteMany({ where: { userId: user.id } });
    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
      },
    });

    const membership = await tx.organizationMember.findFirst({
      where: { userId: user.id },
    });

    if (!membership) {
      const organization = await tx.organization.create({
        data: {
          name: `${fullName.split(/\s+/)[0] || "Admin"} Workspace`,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "owner",
        },
      });
    }
  });

  console.log(`[seed] Menu items ready: ${MENU_ITEMS.length}`);
  console.log(`[seed] Admin user ready: ${email}`);
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
