import { describe, expect, it } from "vitest";
import { z } from "zod";
import { get } from "./helpers.js";

const healthSchema = z.object({ status: z.string() });

describe("GET /api/health", () => {
  it("answers 200", async () => {
    const res = await get("/api/health");
    expect(res.status).toBe(200);
  });

  it("answers JSON", async () => {
    const res = await get("/api/health");
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);
  });

  it("returns exactly { status: \"ok\" }", async () => {
    const res = await get("/api/health");
    expect(healthSchema.parse(await res.json())).toEqual({ status: "ok" });
  });
});
