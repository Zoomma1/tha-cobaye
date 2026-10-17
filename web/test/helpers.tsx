import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { InferResponseType } from "hono/client";
import { ApiProvider } from "../src/api-context";
import { App } from "../src/App";
import { createApi, type Api, type FetchImpl } from "../src/lib/api-client";

export type Profile = InferResponseType<Api["api"]["profile"]["$get"], 200>;
export type Experience = InferResponseType<Api["api"]["experiences"]["$get"]>[number];
export type Project = InferResponseType<Api["api"]["projects"]["$get"]>[number];

export const profile: Profile = {
  id: 1,
  fullName: "Test Person",
  headline: "Tester of things",
  bio: "A short bio.",
  email: "test@example.com",
  location: "Nowhere, Testland",
  website: null,
};

export const experiences: Experience[] = [
  { id: 1, company: "Current Co", role: "Lead", startDate: "2022-01-01", endDate: null, description: "Still here." },
  { id: 2, company: "Old Co", role: "Intern", startDate: "2019-01-01", endDate: "2020-01-01", description: "Long gone." },
];

export const projects: Project[] = [
  { id: 1, name: "Linked", summary: "Has a url.", url: "https://example.com/linked", position: 1 },
  { id: 2, name: "Private", summary: "No url.", url: null, position: 2 },
];

export interface RecordedRequest {
  method: string;
  path: string;
  body: unknown;
}

export type Handler = (req: RecordedRequest) => Response | Promise<Response>;

export function fakeApi(handler: Handler): { api: Api; requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];
  const fetchImpl: FetchImpl = async (input, init) => {
    const req = new Request(input, init);
    const text = await req.text();
    const recorded: RecordedRequest = {
      method: req.method,
      path: new URL(req.url).pathname,
      body: text === "" ? undefined : (JSON.parse(text) as unknown),
    };
    requests.push(recorded);
    return handler(recorded);
  };
  return { api: createApi("http://localhost", fetchImpl), requests };
}

export function readOnlyHandler(): Handler {
  return ({ path }) => {
    if (path === "/api/profile") return Response.json(profile);
    if (path === "/api/experiences") return Response.json(experiences);
    if (path === "/api/projects") return Response.json(projects);
    return new Response("not found", { status: 404 });
  };
}

export function renderApp(api: Api, route: string) {
  return render(
    <ApiProvider api={api}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </ApiProvider>,
  );
}
