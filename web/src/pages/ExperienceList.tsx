import type { InferResponseType } from "hono/client";
import type { Api } from "../lib/api-client";

type Experience = InferResponseType<Api["api"]["experiences"]["$get"]>[number];

export function ExperienceItem({ experience }: { experience: Experience }) {
  return (
    <li>
      <h3>
        {experience.role} at {experience.company}
      </h3>
      <p className="dates">
        {experience.startDate} - {experience.endDate ?? "Present"}
      </p>
      <p>{experience.description}</p>
    </li>
  );
}

export function ExperienceList({ experiences }: { experiences: Experience[] }) {
  return (
    <ul className="cards">
      {experiences.map((e) => (
        <ExperienceItem key={e.id} experience={e} />
      ))}
    </ul>
  );
}
