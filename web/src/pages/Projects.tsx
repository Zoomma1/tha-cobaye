import { useApi } from "../api-context";
import { Async } from "../lib/Async";
import { loadProjects } from "../lib/queries";
import { useLoad } from "../lib/use-load";

// Stored urls are untrusted: only plain web links may become an href (no javascript: or data:).
function isWebUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function Projects() {
  const api = useApi();
  const { state } = useLoad(() => loadProjects(api));
  return (
    <section>
      <h1>Projects</h1>
      <Async state={state}>
        {(projects) => (
          <ul className="cards">
            {projects.map((p) => (
              <li key={p.id}>
                <h3>{p.name}</h3>
                <p>{p.summary}</p>
                {p.url !== null && isWebUrl(p.url) && <a href={p.url}>Visit {p.name}</a>}
              </li>
            ))}
          </ul>
        )}
      </Async>
    </section>
  );
}
