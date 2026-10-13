import { z } from "zod";
import { app } from "../src/app.js";
import { db } from "../src/db.js";

export const profileSchema = z.object({
  id: z.number(),
  fullName: z.string(),
  headline: z.string(),
  bio: z.string(),
  email: z.string(),
  location: z.string(),
});

export const experienceSchema = z.object({
  id: z.number(),
  company: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  description: z.string(),
});

export const projectSchema = z.object({
  id: z.number(),
  name: z.string(),
  summary: z.string(),
  url: z.string().nullable(),
  position: z.number(),
});

export async function get(path: string): Promise<Response> {
  return app.request(path);
}

// Raw string bodies let tests send malformed JSON.
export async function post(path: string, body: unknown): Promise<Response> {
  return app.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export async function readJson<T extends z.ZodType>(res: Response, schema: T): Promise<z.output<T>> {
  return schema.parse(await res.json());
}

export const createdExperienceIds: number[] = [];

export async function removeCreatedExperiences(): Promise<void> {
  await db.experience.deleteMany({ where: { id: { in: createdExperienceIds } } });
  createdExperienceIds.length = 0;
}
