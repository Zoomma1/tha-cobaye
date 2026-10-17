import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { app } from "../src/app.js";
import { db } from "../src/db.js";
import type { Profile } from "../src/generated/client.js";
import { SEED_PROFILE } from "../src/seed-data.js";
import { get, profileSchema, readJson } from "./helpers.js";

const websiteProfileSchema = profileSchema.extend({ website: z.string().nullable() });
const errorSchema = z.object({ error: z.string() });

const WEBSITE = "https://example.com/alex";

// Raw string bodies let tests send malformed JSON.
async function patchWebsite(body: unknown): Promise<Response> {
  return app.request("/api/profile/website", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function readWebsite(): Promise<string | null> {
  const body = await readJson(await get("/api/profile"), websiteProfileSchema);
  return body.website;
}

// Each test starts and ends with the profile as the seed left it.
let original: Profile;

beforeEach(async () => {
  original = await db.profile.findFirstOrThrow();
});

afterEach(async () => {
  await db.profile.deleteMany({ where: { id: { not: original.id } } });
  await db.profile.upsert({ where: { id: original.id }, create: original, update: original });
});

describe("PATCH /api/profile/website", () => {
  it("stores an https URL and answers 200 with the updated profile", async () => {
    const res = await patchWebsite({ website: WEBSITE });
    expect(res.status).toBe(200);
    const body = await readJson(res, websiteProfileSchema);
    expect(body).toMatchObject({ ...SEED_PROFILE, website: WEBSITE });
  });

  it("accepts an http URL", async () => {
    const res = await patchWebsite({ website: "http://example.com" });
    expect(res.status).toBe(200);
    expect((await readJson(res, websiteProfileSchema)).website).toBe("http://example.com");
  });

  it("makes the stored website visible to GET /api/profile", async () => {
    await patchWebsite({ website: WEBSITE });
    expect(await readWebsite()).toBe(WEBSITE);
  });

  it("clears the website when given null, answering 200 with website null", async () => {
    await patchWebsite({ website: WEBSITE });
    const res = await patchWebsite({ website: null });
    expect(res.status).toBe(200);
    expect((await readJson(res, websiteProfileSchema)).website).toBeNull();
    expect(await readWebsite()).toBeNull();
  });

  it("updates only the first profile (orderBy id asc)", async () => {
    const second = await db.profile.create({ data: { ...SEED_PROFILE } });
    try {
      expect((await patchWebsite({ website: WEBSITE })).status).toBe(200);
      expect((await db.profile.findUniqueOrThrow({ where: { id: original.id } })).website).toBe(WEBSITE);
      expect((await db.profile.findUniqueOrThrow({ where: { id: second.id } })).website).toBeNull();
    } finally {
      await db.profile.delete({ where: { id: second.id } });
    }
  });

  it.each([{ website: "ftp://x" }, { website: "pas une url" }, { website: "javascript:alert(1)" }, { website: "" }, { website: 42 }, {}])(
    "answers 400 with { error: \"invalid website\" } for %j and stores nothing",
    async (body) => {
      await patchWebsite({ website: WEBSITE });
      const res = await patchWebsite(body);
      expect(res.status).toBe(400);
      expect(await readJson(res, errorSchema)).toEqual({ error: "invalid website" });
      expect(await readWebsite()).toBe(WEBSITE);
    },
  );

  it("answers 400 to a malformed JSON body", async () => {
    const res = await patchWebsite("{ website: ");
    expect(res.status).toBe(400);
  });

  it("answers 404 with { error: \"profile not found\" } when no profile exists", async () => {
    await db.profile.delete({ where: { id: original.id } });
    const res = await patchWebsite({ website: WEBSITE });
    expect(res.status).toBe(404);
    expect(await readJson(res, errorSchema)).toEqual({ error: "profile not found" });
  });
});
