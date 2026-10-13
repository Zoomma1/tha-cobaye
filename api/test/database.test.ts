import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { createDb, db } from "../src/db.js";
import { databaseFilePath, resolveDatabaseUrl } from "../src/database-url.js";
import { SEED_EXPERIENCES, SEED_PROJECTS } from "../src/seed-data.js";

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function dumpTables(url: string): Promise<string> {
  const client = createDb(url);
  try {
    const tables = {
      profile: await client.profile.findMany({ orderBy: { id: "asc" } }),
      experience: await client.experience.findMany({ orderBy: { id: "asc" } }),
      project: await client.project.findMany({ orderBy: { id: "asc" } }),
    };
    return JSON.stringify(tables);
  } finally {
    await client.$disconnect();
  }
}

function reset(url: string): void {
  execFileSync("npm", ["run", "db:reset"], { cwd: apiDir, stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });
}

describe("database file (AC-5)", () => {
  it("is a non-empty file on disk, not an in-memory database", () => {
    const url = resolveDatabaseUrl();
    expect(url).not.toContain(":memory:");
    const file = databaseFilePath(url);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeGreaterThan(0);
  });

  it("holds exactly the seeded rows", async () => {
    expect(await db.profile.count()).toBe(1);
    expect(await db.experience.count()).toBe(SEED_EXPERIENCES.length);
    expect(await db.project.count()).toBe(SEED_PROJECTS.length);
  });
});

describe("db:reset determinism (AC-6)", () => {
  const dir = mkdtempSync(join(tmpdir(), "cobaye-reset-"));
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("produces identical rows on two runs, even over a dirty database", async () => {
    const url = `file:${join(dir, "reset.db")}`;
    reset(url);
    const first = await dumpTables(url);

    const dirty = createDb(url);
    await dirty.project.create({ data: { name: "stray", summary: "stray", url: null, position: 99 } });
    await dirty.$disconnect();

    reset(url);
    const second = await dumpTables(url);

    expect(second).toBe(first);
    expect(second).toContain(SEED_PROJECTS[0]?.name);
    expect(second).not.toContain("stray");
  }, 60_000);
});
