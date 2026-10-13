import { describe, expect, it } from "vitest";
import { createApi } from "../src/lib/api-client";
import { experiences, fakeApi, profile, projects } from "./helpers";

describe("api-client", () => {
  it("reaches each resource under /api through the typed client", async () => {
    const { api, requests } = fakeApi(({ path }) => {
      if (path === "/api/profile") return Response.json(profile);
      if (path === "/api/experiences") return Response.json(experiences);
      return Response.json(projects);
    });
    const p = await api.api.profile.$get();
    const e = await api.api.experiences.$get();
    const pr = await api.api.projects.$get();
    expect(requests.map((r) => `${r.method} ${r.path}`)).toEqual(["GET /api/profile", "GET /api/experiences", "GET /api/projects"]);
    expect(p.ok && (await p.json()).fullName).toBe("Test Person");
    expect(await e.json()).toHaveLength(2);
    expect(await pr.json()).toHaveLength(2);
  });

  it("posts json to /api/experiences", async () => {
    const { api, requests } = fakeApi(() => Response.json(experiences[0], { status: 201 }));
    await api.api.experiences.$post({ json: { company: "A", role: "B", startDate: "2020-01-01", description: "C" } });
    expect(requests).toEqual([
      { method: "POST", path: "/api/experiences", body: { company: "A", role: "B", startDate: "2020-01-01", description: "C" } },
    ]);
  });

  it("sends same-origin /api requests for the default base", async () => {
    const seen: string[] = [];
    const api = createApi("/", (input) => {
      seen.push(typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url);
      return Promise.resolve(Response.json(profile));
    });
    await api.api.profile.$get();
    expect(seen).toEqual(["/api/profile"]);
  });
});
