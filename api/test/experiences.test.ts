import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { db } from "../src/db.js";
import { SEED_EXPERIENCES } from "../src/seed-data.js";
import { createdExperienceIds, experienceSchema, get, post, readJson, removeCreatedExperiences } from "./helpers.js";

const listSchema = z.array(experienceSchema);

const valid = {
  company: "Test Co",
  role: "Tester",
  startDate: "2024-01-15",
  endDate: "2024-06-30",
  description: "Wrote tests.",
};

async function track(res: Response): Promise<z.output<typeof experienceSchema>> {
  const created = await readJson(res, experienceSchema);
  createdExperienceIds.push(created.id);
  return created;
}

afterEach(removeCreatedExperiences);

describe("GET /api/experiences", () => {
  it("returns every seeded experience", async () => {
    const res = await get("/api/experiences");
    expect(res.status).toBe(200);
    const body = await readJson(res, listSchema);
    expect(body).toHaveLength(SEED_EXPERIENCES.length);
    expect(body.map((e) => e.company).sort()).toEqual(SEED_EXPERIENCES.map((e) => e.company).sort());
  });

  it("is sorted by startDate descending", async () => {
    const body = await readJson(await get("/api/experiences"), listSchema);
    const dates = body.map((e) => e.startDate);
    expect(dates).toEqual([...SEED_EXPERIENCES.map((e) => e.startDate)].sort().reverse());
  });

  it("keeps an open-ended experience's endDate as null", async () => {
    const body = await readJson(await get("/api/experiences"), listSchema);
    const open = SEED_EXPERIENCES.find((e) => e.endDate === null);
    expect(body.find((e) => e.company === open?.company)?.endDate).toBeNull();
  });
});

describe("POST /api/experiences", () => {
  it("creates an experience and answers 201 with the stored object", async () => {
    const res = await post("/api/experiences", valid);
    expect(res.status).toBe(201);
    const created = await track(res);
    expect(created).toMatchObject(valid);
    expect(await db.experience.findUnique({ where: { id: created.id } })).toEqual(created);
  });

  it("accepts a missing endDate and stores null", async () => {
    const res = await post("/api/experiences", { ...valid, endDate: undefined });
    expect(res.status).toBe(201);
    expect((await track(res)).endDate).toBeNull();
  });

  it("accepts an explicit null endDate and stores null", async () => {
    const res = await post("/api/experiences", { ...valid, endDate: null });
    expect(res.status).toBe(201);
    expect((await track(res)).endDate).toBeNull();
  });

  it("accepts an open-ended experience read back from GET", async () => {
    const listed = await readJson(await get("/api/experiences"), listSchema);
    const open = listed.find((e) => e.endDate === null);
    if (open === undefined) throw new Error("seed has no open-ended experience");
    const res = await post("/api/experiences", { ...open, id: undefined });
    expect(res.status).toBe(201);
    expect((await track(res)).endDate).toBeNull();
  });

  it("accepts endDate equal to startDate", async () => {
    const res = await post("/api/experiences", { ...valid, endDate: valid.startDate });
    expect(res.status).toBe(201);
    await track(res);
  });

  it("makes the new row appear first in the sorted list", async () => {
    await track(await post("/api/experiences", { ...valid, startDate: "2030-01-01", endDate: "2030-02-01" }));
    const body = await readJson(await get("/api/experiences"), listSchema);
    expect(body[0]?.startDate).toBe("2030-01-01");
  });

  it("rejects endDate before startDate with 400 and stores nothing", async () => {
    const before = await db.experience.count();
    const res = await post("/api/experiences", { ...valid, startDate: "2024-06-30", endDate: "2024-01-15" });
    expect(res.status).toBe(400);
    expect(await db.experience.count()).toBe(before);
  });

  it.each([
    ["missing company", { ...valid, company: undefined }],
    ["empty company", { ...valid, company: "" }],
    ["empty role", { ...valid, role: "" }],
    ["non-ISO startDate", { ...valid, startDate: "15/01/2024" }],
    ["impossible calendar date", { ...valid, startDate: "2024-02-31" }],
    ["datetime instead of date", { ...valid, startDate: "2024-01-15T00:00:00Z" }],
    ["non-string description", { ...valid, description: 42 }],
  ])("rejects %s with 400 and stores nothing", async (_name, body) => {
    const before = await db.experience.count();
    const res = await post("/api/experiences", body);
    expect(res.status).toBe(400);
    expect(await db.experience.count()).toBe(before);
  });

  it("rejects a malformed JSON body with 400", async () => {
    const res = await post("/api/experiences", "{not json");
    expect(res.status).toBe(400);
  });
});
