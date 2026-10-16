import { describe, expect, it } from "vitest";
import { z } from "zod";
import { db } from "../src/db.js";
import { SEED_PROFILE } from "../src/seed-data.js";
import { get, profileSchema, readJson } from "./helpers.js";

const websiteProfileSchema = profileSchema.extend({ website: z.string().nullable() });

const WEBSITE = "https://example.test/cobaye";

// Sets the column directly: the public API is read-only for the profile.
async function setWebsite(id: number, website: string | null): Promise<void> {
  await db.$executeRaw`UPDATE Profile SET website = ${website} WHERE id = ${id}`;
}

describe("GET /api/profile website", () => {
  it("returns website as null when the profile has none", async () => {
    const res = await get("/api/profile");
    expect(res.status).toBe(200);
    const body = await readJson(res, websiteProfileSchema);
    expect(body.website).toBeNull();
  });

  it("returns the stored website string when one is filled", async () => {
    const stored = await db.profile.findFirstOrThrow();
    await setWebsite(stored.id, WEBSITE);
    try {
      const body = await readJson(await get("/api/profile"), websiteProfileSchema);
      expect(body.website).toBe(WEBSITE);
    } finally {
      await setWebsite(stored.id, null);
    }
  });

  it("keeps the seeded fields alongside a filled website", async () => {
    const stored = await db.profile.findFirstOrThrow();
    await setWebsite(stored.id, WEBSITE);
    try {
      const body = await readJson(await get("/api/profile"), websiteProfileSchema);
      expect(body).toMatchObject({ ...SEED_PROFILE, website: WEBSITE });
    } finally {
      await setWebsite(stored.id, null);
    }
  });

  it("returns website as null again once it is cleared", async () => {
    const stored = await db.profile.findFirstOrThrow();
    await setWebsite(stored.id, WEBSITE);
    await setWebsite(stored.id, null);
    const body = await readJson(await get("/api/profile"), websiteProfileSchema);
    expect(body.website).toBeNull();
  });
});
