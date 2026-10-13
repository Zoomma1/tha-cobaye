# Mutation checks (AC-12)

Each mutation was applied alone to one file in `src/`, the web suite was run, then the file was restored. Every mutation turns at least one test red (test names are prefixed by their `describe`).

| Page | Mutation | Test that fails |
|---|---|---|
| Home | do not render the location | `Home shows the profile name, headline, bio and location` |
| Home | do not render the bio | `Home shows the profile name, headline, bio and location` |
| Home | ignore the HTTP status (404 treated as data) | `Home shows the status when the API answers 404` |
| Experience | `null` endDate shown as empty instead of "Present" | `Experience lists every experience in API order with its dates`, `Experience shows Present only for the open-ended experience` |
| Experience | always show "Present" | same two tests |
| Experience | reverse the API order | `Experience lists every experience in API order with its dates` |
| Experience | drop the description | `Experience lists every experience in API order with its dates` |
| Experience | wrong API path (`projects` instead of `experiences`) | 8 tests, e.g. `Admin lists the existing experiences` |
| Projects | never render the link | `Projects renders a link only for the project with a url` |
| Projects | render the link even when `url` is null | `Projects renders a link only for the project with a url` |
| Projects | drop the summary | `Projects renders name and summary for every project` |
| Projects | wrong API path (`experiences` instead of `projects`) | `Projects renders name and summary for every project`, `Projects renders a link only for the project with a url` |
| All pages | HTTP errors ignored when listing | `Admin shows an error instead of the list when loading fails` and 4 more |
| All pages | no loading state | 17 tests, e.g. `Home shows the profile name, headline, bio and location` |
| All pages | no error state | `Home shows the status when the API answers 404`, `Experience shows a generic error with the status on 500` and 3 more |
| All pages | network failure not reported as "Could not reach the server" | `Experience shows an unreachable-server error when the request rejects` |
| Admin | do not list existing experiences | `Admin lists the existing experiences` and 6 more |
| Admin | do not refresh the list after create | `Admin posts the typed body to /api/experiences then refreshes the list` |
| Admin | do not reset the form after create | `Admin posts the typed body to /api/experiences then refreshes the list` |
| Admin | hide the error when create fails | `Admin shows a generic message with the status on 400 ...` and `... on 500 ...` |
| Admin | show a body-derived message instead of the generic one | same two tests |
| Admin | create ignores the HTTP status | `Admin shows a generic message with the status on 400 ...` and 500 |
| Admin | send an incomplete form | `Admin does not send an incomplete form and says what is missing` |
| Admin | never send `endDate` | `Admin includes endDate in the body when provided` |
| Admin | always send `endDate` (empty string when blank) | `Admin posts the typed body to /api/experiences then refreshes the list` |
| Admin | do not trim fields | `Admin trims surrounding whitespace before sending` |
| Navigation | remove the Admin link | `navigation links to every page and navigates without a reload` |
| Navigation | remove the Projects route | `navigation ...`, `Projects renders ...` |
| api-client | ignore the injected `fetch` | 18 tests (every page falls back to the real network) |
| api-client | prefix every path with `/v2` | `api-client sends same-origin /api requests for the default base` |
| Admin | remove the in-flight guard (double submit) | `Admin sends one POST when submitted twice while the first is in flight, then re-enables the button` |
| Admin | submit button never disabled | same test |
| Admin | button stays disabled after the request | same test, `Admin re-enables the button after a failed create` |
| Admin | in-flight guard never released | same test (second create after success) |
| Admin | `createExperience` reads the response body again | `Admin accepts a 201 with an empty body as a success` |
| Projects | drop the http/https protocol check | `Projects renders no link for the unsafe url javascript:alert(1)`, `... data:text/html,x` |
| Projects | accept any url that parses | the same two tests and `... not a url` |

Two mutations survived the first pass (link rendered with an empty `href` when `url` is null, untrimmed fields); the assertions that catch them were added afterwards and both mutations re-run.

## Manual checks

- Tolerant `postinstall`: on a throwaway copy in `/tmp` (no `node_modules`, `dist`, `generated`), `export const broken: number = "x";` appended to `api/src/app.ts`. `npm ci` exits 0 and `api/dist/types/app.d.ts` is still emitted (tsc emits despite type errors); `npm run typecheck` exits 2 with TS2322. The typecheck stays the gate that fails.
- Preview: `vite build` then `vite preview` with the API running answers `/` and the proxied `/api/profile` and `/api/projects`; both processes were stopped afterwards.
