export interface ProfileSeed {
  fullName: string;
  headline: string;
  bio: string;
  email: string;
  location: string;
}

export interface ExperienceSeed {
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  description: string;
}

export interface ProjectSeed {
  name: string;
  summary: string;
  url: string | null;
  position: number;
}

export const SEED_PROFILE: ProfileSeed = {
  fullName: "Alex Marlowe",
  headline: "Full-stack engineer who likes small, well-typed systems",
  bio: "Fictional persona used to exercise the cobaye monorepo. Builds web products end to end.",
  email: "alex.marlowe@example.com",
  location: "Lyon, France",
};

// Deliberately not in startDate order: the list route has to sort.
export const SEED_EXPERIENCES: readonly ExperienceSeed[] = [
  {
    company: "Northwind Labs",
    role: "Senior Engineer",
    startDate: "2021-03-01",
    endDate: null,
    description: "Leads the platform team and owns the public API.",
  },
  {
    company: "Initech Example",
    role: "Junior Developer",
    startDate: "2015-09-14",
    endDate: "2017-06-30",
    description: "Maintained internal tooling and reporting dashboards.",
  },
  {
    company: "Globex Sample",
    role: "Software Engineer",
    startDate: "2017-07-17",
    endDate: "2021-02-26",
    description: "Built the customer portal and its billing integrations.",
  },
  {
    company: "Umbrella Demo",
    role: "Freelance Developer",
    startDate: "2013-05-06",
    endDate: "2015-08-31",
    description: "Delivered small business websites.",
  },
];

// Positions are shuffled on purpose so insertion order differs from display order.
export const SEED_PROJECTS: readonly ProjectSeed[] = [
  { name: "Tidepool", summary: "Self-hosted metrics dashboard.", url: "https://tidepool.example.org", position: 3 },
  { name: "Kestrel", summary: "Static site generator written in TypeScript.", url: "https://kestrel.example.org", position: 1 },
  { name: "Lanternfish", summary: "Offline-first note taking prototype.", url: null, position: 4 },
  { name: "Quill", summary: "Markdown linter with typed rules.", url: "https://quill.example.org", position: 2 },
];
