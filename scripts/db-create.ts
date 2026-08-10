/**
 * db:create — creates the PostgreSQL user and database if they don't exist.
 *
 * Reads DATABASE_URL from the environment (or .env.local / .env.production).
 *
 * TWO MODES:
 *
 * 1. Docker mode (default for this project):
 *    The postgres container auto-creates the user + DB via POSTGRES_USER /
 *    POSTGRES_PASSWORD / POSTGRES_DB env vars and db/init.sql. Running
 *    `docker compose up` is all you need — skip this script.
 *
 * 2. Bare-metal / external Postgres mode:
 *    Pass --superuser-url to connect as a superuser that has CREATE ROLE /
 *    CREATE DATABASE permissions, then the script creates the app user + DB.
 *
 *    npm run db:create -- --superuser-url="postgres://postgres:yourpw@localhost:5432/postgres"
 *
 *    Or set the SUPERUSER_URL env var instead of the flag.
 *
 * Safe to run multiple times — skips creation if user/DB already exists.
 *
 * Usage:
 *   npm run db:create                                  # Docker: just checks connectivity
 *   npm run db:create -- --superuser-url="postgres://postgres:pw@localhost/postgres"
 *   SUPERUSER_URL="postgres://postgres:pw@localhost/postgres" npm run db:create
 */

import { loadEnvConfig } from "@next/env";
import { Client } from "pg";

loadEnvConfig(process.cwd());

// ── Resolve URLs ──────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL?.trim();
if (!DATABASE_URL) {
  console.error("[db:create] ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

// --superuser-url flag or SUPERUSER_URL env var
const superuserUrlFlag = process.argv.find((a) => a.startsWith("--superuser-url="))?.split("=").slice(1).join("=");
const SUPERUSER_URL = (superuserUrlFlag ?? process.env.SUPERUSER_URL ?? "").trim();

// ── Parse DATABASE_URL ────────────────────────────────────────────────────────

function parseUrl(url: string, label: string) {
  try {
    const parsed = new URL(url);
    const dbName = parsed.pathname.replace(/^\//, "").split("?")[0];
    if (!dbName) throw new Error("no database name in path");
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 5432,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: dbName,
    };
  } catch (e) {
    console.error(`[db:create] ERROR: ${label} is not a valid URL: ${url}`);
    console.error("            ", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

function validateIdentifier(name: string, label: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    console.error(
      `[db:create] ERROR: ${label} "${name}" contains invalid characters.\n` +
      `            Only letters, digits, and underscores allowed.`,
    );
    process.exit(1);
  }
}

const app = parseUrl(DATABASE_URL, "DATABASE_URL");
validateIdentifier(app.database, "Database name");
validateIdentifier(app.user, "Username");

// ── Helpers ───────────────────────────────────────────────────────────────────

async function connect(connString: string, label: string): Promise<Client> {
  const client = new Client({ connectionString: connString, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    return client;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n[db:create] ERROR: Could not connect using ${label}.`);
    console.error(`            ${msg}`);

    if (msg.includes("password authentication")) {
      console.error(`\n  The credentials in DATABASE_URL are rejected by Postgres.`);
      console.error(`  If you're using Docker, make sure the container is running:`);
      console.error(`    docker compose up -d postgres`);
      console.error(`\n  If you're using a bare-metal/external Postgres, pass your superuser URL:`);
      console.error(`    npm run db:create -- --superuser-url="postgres://postgres:YOURPW@localhost/postgres"`);
    } else if (msg.includes("ECONNREFUSED") || msg.includes("connect ETIMEDOUT")) {
      console.error(`\n  Postgres is not reachable at ${app.host}:${app.port}.`);
      console.error(`  If you're using Docker, start it first:`);
      console.error(`    docker compose up -d postgres`);
    }
    console.error("");
    process.exit(1);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[db:create] Target database : "${app.database}"`);
  console.log(`[db:create] Target user     : "${app.user}"`);
  console.log(`[db:create] Host            : ${app.host}:${app.port}`);

  // ── MODE 1: No superuser URL — just verify the app user can connect ──────
  if (!SUPERUSER_URL) {
    console.log(`[db:create] No --superuser-url provided.`);
    console.log(`[db:create] Verifying app user can connect to "${app.database}"...`);

    const client = await connect(DATABASE_URL, "DATABASE_URL");
    await client.end();
    console.log(`[db:create] ✓ Connection successful — database "${app.database}" already exists and is accessible.`);
    console.log(`\n  Tip: if you need to CREATE the database from scratch, run:`);
    console.log(`    npm run db:create -- --superuser-url="postgres://postgres:YOURPW@${app.host}/postgres"\n`);
    return;
  }

  // ── MODE 2: Superuser URL provided — create user + DB if needed ──────────
  console.log(`[db:create] Superuser URL provided — running in create mode.`);

  const su = parseUrl(SUPERUSER_URL, "SUPERUSER_URL");
  const suClient = await connect(SUPERUSER_URL, "SUPERUSER_URL");

  try {
    // 1. Create the app role if it doesn't exist
    const { rows: roleRows } = await suClient.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = $1) AS exists",
      [app.user],
    );

    if (roleRows[0]?.exists) {
      console.log(`[db:create] Role "${app.user}" already exists — skipping.`);
    } else {
      // Password must be a literal in CREATE ROLE — we use a parameterised DO block approach
      await suClient.query(
        `CREATE ROLE "${app.user}" LOGIN PASSWORD $1`,
        [app.password],
      );
      console.log(`[db:create] ✓ Role "${app.user}" created.`);
    }

    // 2. Create the database if it doesn't exist
    const { rows: dbRows } = await suClient.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
      [app.database],
    );

    if (dbRows[0]?.exists) {
      console.log(`[db:create] Database "${app.database}" already exists — skipping.`);
    } else {
      // CREATE DATABASE cannot run inside a transaction — that's fine (autocommit)
      await suClient.query(`CREATE DATABASE "${app.database}" OWNER "${app.user}"`);
      console.log(`[db:create] ✓ Database "${app.database}" created (owner: "${app.user}").`);
    }

    // 3. Grant connect + all privileges so the app user can fully operate
    await suClient.query(`GRANT ALL PRIVILEGES ON DATABASE "${app.database}" TO "${app.user}"`);
    console.log(`[db:create] ✓ Privileges granted on "${app.database}" to "${app.user}".`);

  } finally {
    await suClient.end();
  }

  // 4. Verify the app user can now connect
  console.log(`[db:create] Verifying app user can connect...`);
  const verifyClient = await connect(DATABASE_URL, "DATABASE_URL (app user verify)");
  await verifyClient.end();

  console.log(`\n[db:create] ✓ All done! Next steps:`);
  console.log(`    npm run db:migrate   # push Prisma schema`);
  console.log(`    npm run db:seed      # seed admin user + roles`);
  console.log(`  — or run both at once:`);
  console.log(`    npm run db:setup\n`);
}

main().catch((err) => {
  console.error("[db:create] Fatal:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
