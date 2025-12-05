# Repository Guidelines

## Project Structure & Module Organization
This Next.js 14 app uses the `/app` directory for routing and server actions, with feature folders such as `app/projects` and API handlers under `app/api`. Reusable UI goes in `/components`, typed helpers live in `/lib` and `/utils`, and shared interfaces stay in `/types`. Static assets (logos, fonts, JSON) belong in `/public`. Operational docs live in `/docs`, while helper scripts (e.g., `scripts/generate-policy-id.mjs`, `scripts/hf-cli-runner.ts`) support Cardano workflows—install `ts-node`, `tsconfig-paths`, and `dotenv` locally before running them. Use the provided `env` template as a checklist when configuring local secrets.

## Build, Test, and Development Commands
Run `npm install` to sync dependencies (a `package-lock.json` is tracked). Start the local dev server with `npm run dev`, build production assets via `npm run build`, and serve the optimized build using `npm run start`. Lint the codebase with `npm run lint` before pushing; it applies Next.js/ESLint defaults tailored to TypeScript and React Server Components.

## Coding Style & Naming Conventions
Write TypeScript with two-space indentation and favor named exports for reusability. Co-locate UI state and hooks near the component entry point, and keep data-fetching logic inside `/lib` services. Components follow PascalCase (`DashboardHeader.tsx`), hooks use `useFoo`, and utility modules are camelCase. Apply Tailwind utility classes consistently; extract shared patterns into component wrappers instead of long class strings. Run the Next.js ESLint checks to enforce import order, accessibility, and React best practices.

## Testing Guidelines
API handlers and complex hooks are covered with Jest (see `app/api/cardano/mint/route.test.ts`). Name new test files `<feature>.test.ts` beside the code under test. Use `npx jest path/to/test` (or `npm exec jest`) to run targeted specs, and ensure they pass before submitting a PR. Prefer integration-style tests that exercise Next.js request handlers end-to-end, mocking Mesh SDK or external APIs as needed. Flag slow or flaky tests with `.skip` only when absolutely necessary and document follow-up work.

## Commit & Pull Request Guidelines
Follow the existing short, imperative commit style (`Fix mint quantity validation`, `Add develop deployment notes`). Group related changes and avoid omnibus commits. For pull requests, provide: (1) a concise summary of behavior changes, (2) references to tracked issues or product requirements, (3) screenshots or GIFs when UI changes, and (4) notes on config updates, especially when `.env` entries change. Request review from subject-matter owners (Cardano integrations, front-end, infra) and wait for CI + linting to pass before merging.

## Security & Configuration Tips
Never commit live credentials—use `.env.local` for secrets and rotate any accidental exposure immediately. Before deploying, verify `CARDANO_NETWORK`, Blockfrost, and database URLs match the target environment. When adjusting scripts that touch policy keys or mnemonics, confirm they stay confined to the `scripts/` utilities and document any manual steps in `DEPLOYMENT.md`.
