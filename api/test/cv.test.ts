import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { db } from "../src/db.js";
import { SEED_EXPERIENCES, SEED_PROFILE, SEED_PROJECTS } from "../src/seed-data.js";
import {
  createdExperienceIds,
  experienceSchema,
  get,
  post,
  profileSchema,
  projectSchema,
  readJson,
  removeCreatedExperiences,
} from "./helpers.js";

const cvSchema = z
  .object({
    profile: profileSchema,
    experiences: z.array(experienceSchema),
    projects: z.array(projectSchema),
  })
  .strict();

const errorSchema = z.object({ error: z.string() }).strict();

const createdProjectIds: number[] = [];

async function createExperience(company: string, startDate: string): Promise<void> {
  const created = await readJson(
    await post("/api/experiences", { company, role: "Tester", startDate, endDate: null, description: "Fixture." }),
    experienceSchema,
  );
  createdExperienceIds.push(created.id);
}

async function createProject(name: string, position: number): Promise<void> {
  const created = await db.project.create({ data: { name, summary: "Fixture.", url: null, position } });
  createdProjectIds.push(created.id);
}

afterEach(async () => {
  await removeCreatedExperiences();
  await db.project.deleteMany({ where: { id: { in: createdProjectIds } } });
  createdProjectIds.length = 0;
});

describe("GET /api/cv", () => {
  it("answers 200 with exactly the profile, experiences and projects keys", async () => {
    const res = await get("/api/cv");
    expect(res.status).toBe(200);
    const body = await readJson(res, cvSchema);
    expect(body.profile).toMatchObject(SEED_PROFILE);
    expect(body.experiences).toHaveLength(SEED_EXPERIENCES.length);
    expect(body.projects).toHaveLength(SEED_PROJECTS.length);
  });

  it("embeds the same profile as GET /api/profile", async () => {
    const body = await readJson(await get("/api/cv"), cvSchema);
    const profile = await readJson(await get("/api/profile"), profileSchema);
    expect(body.profile).toEqual(profile);
  });

  it("sorts experiences exactly as GET /api/experiences does", async () => {
    const body = await readJson(await get("/api/cv"), cvSchema);
    const list = await readJson(await get("/api/experiences"), z.array(experienceSchema));
    expect(body.experiences).toEqual(list);
  });

  it("sorts experiences by startDate descending", async () => {
    const body = await readJson(await get("/api/cv"), cvSchema);
    const expected = [...SEED_EXPERIENCES]
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .map((e) => e.company);
    expect(body.experiences.map((e) => e.company)).toEqual(expected);
  });

  it("breaks startDate ties by id ascending", async () => {
    await createExperience("Tie First", "2029-12-31");
    await createExperience("Tie Second", "2029-12-31");
    const body = await readJson(await get("/api/cv"), cvSchema);
    expect(body.experiences.slice(0, 2).map((e) => e.company)).toEqual(["Tie First", "Tie Second"]);
  });

  it("sorts projects exactly as GET /api/projects does", async () => {
    const body = await readJson(await get("/api/cv"), cvSchema);
    const list = await readJson(await get("/api/projects"), z.array(projectSchema));
    expect(body.projects).toEqual(list);
  });

  it("sorts projects by position ascending, then id ascending", async () => {
    await createProject("Tie A", 2);
    await createProject("Tie B", 2);
    const body = await readJson(await get("/api/cv"), cvSchema);
    expect(body.projects.map((p) => p.name)).toEqual([
      "Kestrel",
      "Quill",
      "Tie A",
      "Tie B",
      "Tidepool",
      "Lanternfish",
    ]);
  });

  it("answers 404 with a profile-not-found error when no profile exists, then the cv is back", async () => {
    const stored = await db.profile.findFirstOrThrow();
    await db.profile.delete({ where: { id: stored.id } });
    try {
      const res = await get("/api/cv");
      expect(res.status).toBe(404);
      expect(await readJson(res, errorSchema)).toEqual({ error: "profile not found" });
    } finally {
      await db.profile.create({ data: stored });
    }
    expect((await get("/api/cv")).status).toBe(200);
  });
});
