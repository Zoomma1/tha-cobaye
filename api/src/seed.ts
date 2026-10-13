import type { PrismaClient } from "./generated/client.js";
import { SEED_EXPERIENCES, SEED_PROFILE, SEED_PROJECTS } from "./seed-data.js";

export async function seed(db: PrismaClient): Promise<void> {
  await db.profile.create({ data: SEED_PROFILE });
  await db.experience.createMany({ data: [...SEED_EXPERIENCES] });
  await db.project.createMany({ data: [...SEED_PROJECTS] });
}
