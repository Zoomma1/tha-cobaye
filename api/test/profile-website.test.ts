import { describe, expect, it } from "vitest";
import { z } from "zod";
import { db } from "../src/db.js";
import { get, readJson } from "./helpers.js";

const websiteSchema = z.object({ website: z.string().nullable() });

// Written in SQL: the typed Prisma client only knows the column once the schema has it.
async function setWebsite(id: number, website: string | null): Promise<void> {
  await db.$executeRaw`UPDATE Profile SET website = ${website} WHERE id = ${id}`;
}

describe("GET /api/profile website", () => {
  it("answers website null when the profile has none", async () => {
    const body = await readJson(await get("/api/profile"), websiteSchema);
    expect(body.website).toBeNull();
  });

  it("answers the stored website string when the profile has one", async () => {
    const stored = await db.profile.findFirstOrThrow();
    await setWebsite(stored.id, "https://alex.example.com");
    try {
      const body = await readJson(await get("/api/profile"), websiteSchema);
      expect(body.website).toBe("https://alex.example.com");
    } finally {
      await setWebsite(stored.id, null);
    }
  });
});
