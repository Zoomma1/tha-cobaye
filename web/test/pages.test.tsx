import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fakeApi, readOnlyHandler, renderApp } from "./helpers";

describe("navigation", () => {
  it("links to every page and navigates without a reload", async () => {
    const { api } = fakeApi(readOnlyHandler());
    renderApp(api, "/");
    const nav = screen.getByRole("navigation");
    for (const name of ["Home", "Experience", "Projects", "Admin"]) {
      expect(within(nav).getByRole("link", { name })).toBeInTheDocument();
    }
    await userEvent.click(within(nav).getByRole("link", { name: "Projects" }));
    expect(await screen.findByRole("heading", { name: "Projects" })).toBeInTheDocument();
  });
});

describe("Home", () => {
  it("shows the profile name, headline, bio and location", async () => {
    const { api } = fakeApi(readOnlyHandler());
    renderApp(api, "/");
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(await screen.findByRole("heading", { name: "Test Person" })).toBeInTheDocument();
    expect(screen.getByText("Tester of things")).toBeInTheDocument();
    expect(screen.getByText("A short bio.")).toBeInTheDocument();
    expect(screen.getByText("Nowhere, Testland")).toBeInTheDocument();
  });

  it("shows the status when the API answers 404", async () => {
    const { api } = fakeApi(() => Response.json({ error: "profile not found" }, { status: 404 }));
    renderApp(api, "/");
    expect(await screen.findByRole("alert")).toHaveTextContent("status 404");
  });
});

describe("Experience", () => {
  it("lists every experience in API order with its dates", async () => {
    const { api } = fakeApi(readOnlyHandler());
    renderApp(api, "/experience");
    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Lead at Current Co");
    expect(items[0]).toHaveTextContent("2022-01-01 - Present");
    expect(items[0]).toHaveTextContent("Still here.");
    expect(items[1]).toHaveTextContent("Intern at Old Co");
    expect(items[1]).toHaveTextContent("2019-01-01 - 2020-01-01");
  });

  it("shows Present only for the open-ended experience", async () => {
    const { api } = fakeApi(readOnlyHandler());
    renderApp(api, "/experience");
    await screen.findAllByRole("listitem");
    expect(screen.getAllByText(/Present/)).toHaveLength(1);
  });

  it("shows a generic error with the status on 500", async () => {
    const { api } = fakeApi(() => new Response("boom", { status: 500 }));
    renderApp(api, "/experience");
    expect(await screen.findByRole("alert")).toHaveTextContent("Request failed with status 500");
  });

  it("shows an unreachable-server error when the request rejects", async () => {
    const { api } = fakeApi(() => Promise.reject(new TypeError("network down")));
    renderApp(api, "/experience");
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server");
  });
});

describe("Projects", () => {
  it("renders name and summary for every project", async () => {
    const { api } = fakeApi(readOnlyHandler());
    renderApp(api, "/projects");
    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Linked");
    expect(items[0]).toHaveTextContent("Has a url.");
    expect(items[1]).toHaveTextContent("Private");
  });

  it("renders a link only for the project with a url", async () => {
    const { api } = fakeApi(readOnlyHandler());
    renderApp(api, "/projects");
    await screen.findAllByRole("listitem");
    const links = within(screen.getByRole("main")).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "https://example.com/linked");
    expect(screen.getByText("Visit Linked")).toBeInTheDocument();
    expect(screen.queryByText("Visit Private")).not.toBeInTheDocument();
    expect(within(screen.getByRole("main")).queryAllByRole("link", { hidden: true })).toHaveLength(1);
  });

  it("shows a generic error with the status on 500", async () => {
    const { api } = fakeApi(() => new Response("boom", { status: 500 }));
    renderApp(api, "/projects");
    expect(await screen.findByRole("alert")).toHaveTextContent("status 500");
  });

  it.each(["javascript:alert(1)", "data:text/html,x", "not a url"])("renders no link for the unsafe url %s", async (url) => {
    const { api } = fakeApi(({ path }) =>
      path === "/api/projects"
        ? Response.json([{ id: 1, name: "Shady", summary: "Bad url.", url, position: 1 }])
        : new Response("nope", { status: 404 }),
    );
    renderApp(api, "/projects");
    expect(await screen.findByText("Shady")).toBeInTheDocument();
    expect(within(screen.getByRole("main")).queryAllByRole("link", { hidden: true })).toHaveLength(0);
  });

  it("renders a link for an https url", async () => {
    const { api } = fakeApi(({ path }) =>
      path === "/api/projects"
        ? Response.json([{ id: 1, name: "Safe", summary: "Good url.", url: "https://example.com/x", position: 1 }])
        : new Response("nope", { status: 404 }),
    );
    renderApp(api, "/projects");
    expect(await screen.findByRole("link", { name: "Visit Safe" })).toHaveAttribute("href", "https://example.com/x");
  });
});
