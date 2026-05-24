import { prisma } from "@/lib/prisma";

/** Tables mapped from prisma/schema.prisma — used to verify prod DB is in sync. */
export const EXPECTED_DB_TABLES = [
  "users",
  "sessions",
  "organizations",
  "organization_members",
  "organization_chatbot_settings",
  "organization_knowledge_bases",
  "review_services",
  "reviews",
  "appointments",
  "leads",
  "audit_events",
  "roles",
  "user_roles",
  "menu_items",
  "menu_access",
  "providers",
  "provider_connections",
] as const;

export type DbSchemaCheckResult = {
  schemaInSync: boolean;
  missingTables: string[];
  customerEmailColumn: boolean;
};

export async function checkDbSchema(): Promise<DbSchemaCheckResult> {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  `;

  const present = new Set(rows.map((r) => r.table_name));
  const missingTables = EXPECTED_DB_TABLES.filter((t) => !present.has(t));

  const emailCol = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'appointments'
        AND column_name = 'customer_email'
    ) AS exists
  `;

  const customerEmailColumn = Boolean(emailCol[0]?.exists);

  return {
    schemaInSync: missingTables.length === 0 && customerEmailColumn,
    missingTables: [...missingTables],
    customerEmailColumn,
  };
}
