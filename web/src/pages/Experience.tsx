import { useApi } from "../api-context";
import { Async } from "../lib/Async";
import { loadExperiences } from "../lib/queries";
import { useLoad } from "../lib/use-load";
import { ExperienceList } from "./ExperienceList";

export function Experience() {
  const api = useApi();
  const { state } = useLoad(() => loadExperiences(api));
  return (
    <section>
      <h1>Experience</h1>
      <Async state={state}>{(experiences) => <ExperienceList experiences={experiences} />}</Async>
    </section>
  );
}
