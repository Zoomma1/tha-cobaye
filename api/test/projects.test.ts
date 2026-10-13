import { describe, expect, it } from "vitest";
import { z } from "zod";
import { SEED_PROJECTS } from "../src/seed-data.js";
import { get, projectSchema, readJson } from "./helpers.js";

describe("GET /api/projects", () => {
  it("returns every seeded project", async () => {
    const res = await get("/api/projects");
    expect(res.status).toBe(200);
    const body = await readJson(res, z.array(projectSchema));
    expect(body).toHaveLength(SEED_PROJECTS.length);
    expect(body.map((p) => p.name).sort()).toEqual(SEED_PROJECTS.map((p) => p.name).sort());
  });

  it("is sorted by position ascending", async () => {
    const body = await readJson(await get("/api/projects"), z.array(projectSchema));
    const positions = body.map((p) => p.position);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(positions).toEqual([...SEED_PROJECTS.map((p) => p.position)].sort((a, b) => a - b));
  });

  it("returns each project's seeded url", async () => {
    const body = await readJson(await get("/api/projects"), z.array(projectSchema));
    for (const seeded of SEED_PROJECTS) {
      expect(body.find((p) => p.name === seeded.name)?.url).toBe(seeded.url);
    }
  });

  it("keeps a null url as null", async () => {
    const body = await readJson(await get("/api/projects"), z.array(projectSchema));
    const withoutUrl = SEED_PROJECTS.find((p) => p.url === null);
    expect(body.find((p) => p.name === withoutUrl?.name)?.url).toBeNull();
  });
});
