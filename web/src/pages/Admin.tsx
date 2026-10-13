import { useRef, useState, type SyntheticEvent } from "react";
import { useApi } from "../api-context";
import { Async } from "../lib/Async";
import { createExperience, loadExperiences } from "../lib/queries";
import { describeError, useLoad } from "../lib/use-load";
import { ExperienceList } from "./ExperienceList";

export function Admin() {
  const api = useApi();
  const { state, reload } = useLoad(() => loadExperiences(api));
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // A ref, because two submits in the same tick would both see the stale `sending` state.
  const inFlight = useRef(false);

  async function onSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const field = (name: string) => {
      const value = data.get(name);
      return typeof value === "string" ? value.trim() : "";
    };
    const company = field("company");
    const role = field("role");
    const startDate = field("startDate");
    const endDate = field("endDate");
    const description = field("description");
    if (company === "" || role === "" || startDate === "" || description === "") {
      setError("Company, role, start date and description are required.");
      return;
    }
    inFlight.current = true;
    setSending(true);
    try {
      await createExperience(api, { company, role, startDate, description, ...(endDate === "" ? {} : { endDate }) });
    } catch (e: unknown) {
      setError(describeError(e));
      return;
    } finally {
      inFlight.current = false;
      setSending(false);
    }
    setError(null);
    form.reset();
    reload();
  }

  return (
    <section>
      <h1>Admin</h1>
      <h2>Add an experience</h2>
      <form onSubmit={(e) => void onSubmit(e)} noValidate>
        <label>
          Company
          <input name="company" />
        </label>
        <label>
          Role
          <input name="role" />
        </label>
        <label>
          Start date
          <input name="startDate" type="date" />
        </label>
        <label>
          End date (optional)
          <input name="endDate" type="date" />
        </label>
        <label>
          Description
          <textarea name="description" />
        </label>
        {error !== null && <p role="alert">{error}</p>}
        <button type="submit" disabled={sending}>Add experience</button>
      </form>
      <h2>Existing experiences</h2>
      <Async state={state}>{(experiences) => <ExperienceList experiences={experiences} />}</Async>
    </section>
  );
}
