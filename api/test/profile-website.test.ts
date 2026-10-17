import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { app } from "../src/app.js";
import { db } from "../src/db.js";
import { SEED_PROFILE } from "../src/seed-data.js";
import { get, profileSchema, readJson } from "./helpers.js";

const withWebsiteSchema = profileSchema.extend({ website: z.string().nullable() });
const errorSchema = z.object({ error: z.string() });

async function patchWebsite(body: unknown): Promise<Response> {
  return app.request("/api/profile/website", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function currentProfile(): Promise<z.output<typeof withWebsiteSchema>> {
  return readJson(await get("/api/profile"), withWebsiteSchema);
}

afterEach(async () => {
  // Put the seeded profile back to no website, whatever the test did.
  await patchWebsite({ website: null });
});

describe("GET /api/profile website field", () => {
  it("returns website as null when none is set", async () => {
    expect((await currentProfile()).website).toBeNull();
  });
});

describe("PATCH /api/profile/website", () => {
  it("stores an https URL and answers 200 with the updated profile", async () => {
    const res = await patchWebsite({ website: "https://example.com/me" });
    expect(res.status).toBe(200);
    const body = await readJson(res, withWebsiteSchema);
    expect(body).toMatchObject({ ...SEED_PROFILE, website: "https://example.com/me" });
    expect((await currentProfile()).website).toBe("https://example.com/me");
  });

  it("accepts an http URL", async () => {
    const res = await patchWebsite({ website: "http://example.com/me" });
    expect(res.status).toBe(200);
    expect((await readJson(res, withWebsiteSchema)).website).toBe("http://example.com/me");
  });

  it("clears the field when given null, answering 200", async () => {
    await patchWebsite({ website: "https://example.com/me" });
    const res = await patchWebsite({ website: null });
    expect(res.status).toBe(200);
    expect((await readJson(res, withWebsiteSchema)).website).toBeNull();
    expect((await currentProfile()).website).toBeNull();
  });

  it("updates the first profile (lowest id) and not a later one", async () => {
    const first = await db.profile.findFirstOrThrow({ orderBy: { id: "asc" } });
    const other = await db.profile.create({
      data: { fullName: "Autre", headline: "Autre", bio: "Autre", email: "autre@example.com", location: "Ailleurs" },
    });
    try {
      const res = await patchWebsite({ website: "https://example.com/first" });
      expect(res.status).toBe(200);
      expect((await readJson(res, withWebsiteSchema)).id).toBe(first.id);
      const current = await currentProfile();
      expect(current.id).toBe(first.id);
      expect(current.website).toBe("https://example.com/first");
    } finally {
      await db.profile.delete({ where: { id: other.id } });
    }
  });

  it.each(["ftp://x", "pas une url"])("answers 400 for the invalid URL %j", async (website) => {
    const res = await patchWebsite({ website });
    expect(res.status).toBe(400);
    expect(await readJson(res, errorSchema)).toEqual({ error: "invalid website" });
    expect((await currentProfile()).website).toBeNull();
  });

  it.each([{}, { website: 42 }])("answers 400 for the invalid body %j", async (body) => {
    const res = await patchWebsite(body);
    expect(res.status).toBe(400);
    expect(await readJson(res, errorSchema)).toEqual({ error: "invalid website" });
  });

  it("answers 404 when no profile exists", async () => {
    const stored = await db.profile.findFirstOrThrow({ orderBy: { id: "asc" } });
    await db.profile.delete({ where: { id: stored.id } });
    try {
      const res = await patchWebsite({ website: "https://example.com/me" });
      expect(res.status).toBe(404);
      expect(await readJson(res, errorSchema)).toEqual({ error: "profile not found" });
    } finally {
      await db.profile.create({ data: stored });
    }
  });
});
