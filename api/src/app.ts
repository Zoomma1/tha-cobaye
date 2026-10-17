import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "./db.js";

const createExperienceSchema = z
  .object({
    company: z.string().min(1),
    role: z.string().min(1),
    startDate: z.iso.date(),
    endDate: z.iso.date().nullish(),
    description: z.string().min(1),
  })
  .refine((e) => e.endDate === undefined || e.endDate === null || e.endDate >= e.startDate, {
    path: ["endDate"],
    message: "endDate must not be before startDate",
  });

const websiteSchema = z.object({
  website: z.url({ protocol: /^https?$/ }).nullable(),
});

export const app = new Hono()
  .get("/api/health", (c) => c.json({ status: "ok" as const }, 200))
  .get("/api/profile", async (c) => {
    const profile = await db.profile.findFirst({ orderBy: { id: "asc" } });
    if (profile === null) return c.json({ error: "profile not found" }, 404);
    return c.json(profile, 200);
  })
  .patch(
    "/api/profile/website",
    zValidator("json", websiteSchema, (result, c) => {
      if (!result.success) return c.json({ error: "invalid website" }, 400);
    }),
    async (c) => {
      const { website } = c.req.valid("json");
      const profile = await db.profile.findFirst({ orderBy: { id: "asc" } });
      if (profile === null) return c.json({ error: "profile not found" }, 404);
      const updated = await db.profile.update({ where: { id: profile.id }, data: { website } });
      return c.json(updated, 200);
    },
  )
  .get("/api/experiences", async (c) => {
    const experiences = await db.experience.findMany({ orderBy: [{ startDate: "desc" }, { id: "asc" }] });
    return c.json(experiences, 200);
  })
  .post("/api/experiences", zValidator("json", createExperienceSchema), async (c) => {
    const input = c.req.valid("json");
    const created = await db.experience.create({
      data: {
        company: input.company,
        role: input.role,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        description: input.description,
      },
    });
    return c.json(created, 201);
  })
  .get("/api/projects", async (c) => {
    const projects = await db.project.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }] });
    return c.json(projects, 200);
  });

export type AppType = typeof app;
