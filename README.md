# PainSignal AI

Turn messy GitHub issues into clear, actionable insights.

## Project goal

Help maintainers discover potentially related GitHub issues
and inspect the original reports.

Similar reports do not necessarily share the same root cause.

## Status

Early development: project setup.
## Dependency audit

Checked on November 14, 2026:

- `npm audit` reported seven moderate findings tracing to
  minimatch in the development linting dependency chain.
- `npm audit --omit=dev` reported zero vulnerabilities.
- The latest checked TypeScript ESLint release still required
  minimatch 10.x. No dependency override was applied.
- Recheck this advisory when updating dependencies:
  https://github.com/advisories/GHSA-g3hv-75wg-m249

Audit results do not guarantee that the application is secure.

### Follow-up — November 15, 2026

- After shadcn setup and Zod installation, npm audit reported
  12 findings: 2 low and 10 moderate.
- The report included deepmerge and minimatch in tooling dependencies.
- shadcn was moved to devDependencies without changing its version.
  This classification change does not fix the advisories.
- No forced downgrade or dependency override was applied.
- Lint and the production build passed after the change.