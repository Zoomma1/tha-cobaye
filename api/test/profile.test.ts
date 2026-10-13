import { describe, expect, it } from "vitest";
import { SEED_PROFILE } from "../src/seed-data.js";
import { db } from "../src/db.js";
import { get, profileSchema, readJson } from "./helpers.js";

describe("GET /api/profile", () => {
  it("returns the seeded profile", async () => {
    const res = await get("/api/profile");
    expect(res.status).toBe(200);
    const body = await readJson(res, profileSchema);
    expect(body).toMatchObject(SEED_PROFILE);
  });

  it("answers 404 when no profile exists, then the profile is restored", async () => {
    const stored = await db.profile.findFirstOrThrow();
    await db.profile.delete({ where: { id: stored.id } });
    try {
      expect((await get("/api/profile")).status).toBe(404);
    } finally {
      await db.profile.create({ data: stored });
    }
    expect((await get("/api/profile")).status).toBe(200);
  });

  it("is not reachable without the /api prefix", async () => {
    expect((await get("/profile")).status).toBe(404);
  });
});
