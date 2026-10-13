# Mutation checks (AC-12)

Each mutation was applied alone to `src/app.ts` on a freshly reset database, the suite was run, then the file was restored. Every mutation turns at least one test red.

| Route | Mutation | Test that fails |
|---|---|---|
| GET /api/profile | drop the null guard (200 with an empty object when no profile) | `answers 404 when no profile exists, then the profile is restored` |
| GET /api/profile | blank the `email` field | `returns the seeded profile` |
| GET /api/profile | rename the route to `/api/profil` | `returns the seeded profile` |
| GET /api/experiences | remove the sort | `is sorted by startDate descending` |
| GET /api/experiences | sort ascending | `is sorted by startDate descending` |
| GET /api/experiences | `take: 3` (truncate the list) | `returns every seeded experience` |
| POST /api/experiences | answer 200 instead of 201 | `creates an experience and answers 201 with the stored object` |
| POST /api/experiences | drop the `endDate >= startDate` refinement | `rejects endDate before startDate with 400 and stores nothing` |
| POST /api/experiences | make the check strict (`>`) | `accepts endDate equal to startDate` |
| POST /api/experiences | `startDate` becomes `z.string()` | `rejects non-ISO startDate with 400 and stores nothing` |
| POST /api/experiences | accept an empty `company` | `rejects empty company with 400 and stores nothing` |
| POST /api/experiences | do not persist `endDate` | `creates an experience and answers 201 with the stored object` |
| POST /api/experiences | remove the body validator | `rejects missing company with 400 and stores nothing` (and 7 other rejection cases) |
| GET /api/projects | remove the sort | `is sorted by position ascending` |
| GET /api/projects | sort descending | `is sorted by position ascending` |
| GET /api/projects | force every `url` to null | `returns each project's seeded url` |
| POST /api/experiences | `endDate` `.nullish()` becomes `.optional()` (null refused) | `accepts an explicit null endDate and stores null`, `accepts an open-ended experience read back from GET` |
| build/start | `start` points to `dist/src/server.js` | `npm run build then the start script's own command serves /api/projects` |
| test isolation | `pretest` without `DATABASE_URL=file:./test.db` (wipes `dev.db`, `test.db` never seeded) | `runs against the dedicated test.db`, `database file (AC-5)` tests and most route tests (27 fail); a `dev.db` sentinel is also overwritten (manual check) |
| build | `prebuild: prisma generate` removed, `src/generated` absent | `npm run build` fails with TS errors (manual check, not a vitest test) |

Two mutations survived the first pass (empty `company`, forced null `url`); the tests above that catch them were added afterwards and the mutations re-run.
