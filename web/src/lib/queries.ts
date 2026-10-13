import type { Api } from "./api-client";
import { HttpError } from "./use-load";

// Takes a widened type: hc only types the documented statuses, but a proxy or crash can still answer 5xx.
function assertOk(res: { ok: boolean; status: number }): void {
  if (!res.ok) throw new HttpError(res.status);
}

export async function loadProfile(api: Api) {
  const res = await api.api.profile.$get();
  if (!res.ok) throw new HttpError(res.status);
  return res.json();
}

export async function loadExperiences(api: Api) {
  const res = await api.api.experiences.$get();
  assertOk(res);
  return res.json();
}

export async function loadProjects(api: Api) {
  const res = await api.api.projects.$get();
  assertOk(res);
  return res.json();
}

export interface NewExperience {
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  description: string;
}

// The body is never read: a proxy can blank it, and a parse failure would invite a duplicate create.
export async function createExperience(api: Api, input: NewExperience): Promise<void> {
  const res = await api.api.experiences.$post({ json: input });
  assertOk(res);
}
