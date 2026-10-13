import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { experiences, fakeApi, readOnlyHandler, renderApp, type Experience, type Handler } from "./helpers";

function statefulHandler(onPost: Handler): { handler: Handler; stored: Experience[] } {
  const stored = [...experiences];
  const handler: Handler = (req) => {
    if (req.method === "POST") return onPost(req);
    if (req.path === "/api/experiences") return Response.json(stored);
    return readOnlyHandler()(req);
  };
  return { handler, stored };
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Company"), "New Co");
  await user.type(screen.getByLabelText("Role"), "Engineer");
  await user.type(screen.getByLabelText("Start date"), "2024-05-06");
  await user.type(screen.getByLabelText("Description"), "Builds things.");
}

describe("Admin", () => {
  it("lists the existing experiences", async () => {
    const { api } = fakeApi(readOnlyHandler());
    renderApp(api, "/admin");
    expect(await screen.findByText("Lead at Current Co")).toBeInTheDocument();
    expect(screen.getByText("Intern at Old Co")).toBeInTheDocument();
  });

  it("posts the typed body to /api/experiences then refreshes the list", async () => {
    const created: Experience = { id: 3, company: "New Co", role: "Engineer", startDate: "2024-05-06", endDate: null, description: "Builds things." };
    const { handler, stored } = statefulHandler(() => {
      stored.push(created);
      return Response.json(created, { status: 201 });
    });
    const { api, requests } = fakeApi(handler);
    renderApp(api, "/admin");
    await screen.findByText("Lead at Current Co");

    const user = userEvent.setup();
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Add experience" }));

    expect(await screen.findByText("Engineer at New Co")).toBeInTheDocument();
    const post = requests.find((r) => r.method === "POST");
    expect(post).toEqual({
      method: "POST",
      path: "/api/experiences",
      body: { company: "New Co", role: "Engineer", startDate: "2024-05-06", description: "Builds things." },
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Company")).toHaveValue("");
  });

  it("includes endDate in the body when provided", async () => {
    const { handler } = statefulHandler(() => Response.json(experiences[1], { status: 201 }));
    const { api, requests } = fakeApi(handler);
    renderApp(api, "/admin");
    await screen.findByText("Lead at Current Co");

    const user = userEvent.setup();
    await fillRequired(user);
    await user.type(screen.getByLabelText("End date (optional)"), "2025-01-02");
    await user.click(screen.getByRole("button", { name: "Add experience" }));

    await screen.findByText("Lead at Current Co");
    expect(requests.find((r) => r.method === "POST")?.body).toEqual({
      company: "New Co",
      role: "Engineer",
      startDate: "2024-05-06",
      endDate: "2025-01-02",
      description: "Builds things.",
    });
  });

  it("trims surrounding whitespace before sending", async () => {
    const { handler } = statefulHandler(() => Response.json(experiences[1], { status: 201 }));
    const { api, requests } = fakeApi(handler);
    renderApp(api, "/admin");
    await screen.findByText("Lead at Current Co");

    const user = userEvent.setup();
    await fillRequired(user);
    await user.type(screen.getByLabelText("Company"), "   ");
    await user.click(screen.getByRole("button", { name: "Add experience" }));

    await screen.findByText("Lead at Current Co");
    expect(requests.find((r) => r.method === "POST")?.body).toMatchObject({ company: "New Co" });
  });

  it("accepts a 201 with an empty body as a success", async () => {
    const { handler, stored } = statefulHandler(() => {
      stored.push(experiences[1] as Experience);
      return new Response(null, { status: 201 });
    });
    const { api } = fakeApi(handler);
    renderApp(api, "/admin");
    await screen.findByText("Lead at Current Co");

    const user = userEvent.setup();
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Add experience" }));

    await waitFor(() => { expect(screen.getAllByRole("listitem")).toHaveLength(3); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Company")).toHaveValue("");
  });

  it("sends one POST when submitted twice while the first is in flight, then re-enables the button", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const { handler } = statefulHandler(async () => {
      await gate;
      return Response.json(experiences[1], { status: 201 });
    });
    const { api, requests } = fakeApi(handler);
    renderApp(api, "/admin");
    await screen.findByText("Lead at Current Co");

    const user = userEvent.setup();
    await fillRequired(user);
    const button = screen.getByRole("button", { name: "Add experience" });
    const form = button.closest("form");
    expect(form).not.toBeNull();
    await user.click(button);
    expect(button).toBeDisabled();
    if (form !== null) fireEvent.submit(form);
    fireEvent.submit(button);

    release();
    await waitFor(() => { expect(button).toBeEnabled(); });
    expect(requests.filter((r) => r.method === "POST")).toHaveLength(1);

    await waitFor(() => { expect(screen.getByLabelText("Company")).toHaveValue(""); });
    // fireEvent: user-event keeps tracking the pre-reset text of the inputs and would append to it.
    for (const [label, value] of [["Company", "Again Co"], ["Role", "Dev"], ["Start date", "2024-05-06"], ["Description", "More."]] as const) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    await user.click(button);
    await waitFor(() => { expect(requests.filter((r) => r.method === "POST")).toHaveLength(2); });
  });

  it("re-enables the button after a failed create", async () => {
    const { handler } = statefulHandler(() => new Response("boom", { status: 500 }));
    const { api } = fakeApi(handler);
    renderApp(api, "/admin");
    await screen.findByText("Lead at Current Co");

    const user = userEvent.setup();
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Add experience" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Add experience" })).toBeEnabled();
  });

  it.each([
    [400, Response.json({ success: false, error: { name: "ZodError" } }, { status: 400 })],
    [500, new Response("Internal Server Error", { status: 500 })],
  ])("shows a generic message with the status on %i and keeps the form", async (status, response) => {
    const { handler } = statefulHandler(() => response.clone());
    const { api } = fakeApi(handler);
    renderApp(api, "/admin");
    await screen.findByText("Lead at Current Co");

    const user = userEvent.setup();
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Add experience" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(`Request failed with status ${String(status)}`);
    expect(alert).not.toHaveTextContent("ZodError");
    expect(screen.getByLabelText("Company")).toHaveValue("New Co");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("does not send an incomplete form and says what is missing", async () => {
    const { handler } = statefulHandler(() => Response.json(experiences[0], { status: 201 }));
    const { api, requests } = fakeApi(handler);
    renderApp(api, "/admin");
    await screen.findByText("Lead at Current Co");

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Company"), "   ");
    await user.click(screen.getByRole("button", { name: "Add experience" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("are required");
    expect(requests.some((r) => r.method === "POST")).toBe(false);
  });

  it("shows an error instead of the list when loading fails", async () => {
    const { api } = fakeApi(() => new Response("boom", { status: 500 }));
    renderApp(api, "/admin");
    const list = await screen.findByRole("alert");
    expect(within(list).getByText(/status 500/)).toBeInTheDocument();
  });
});
