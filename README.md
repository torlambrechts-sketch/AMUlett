# AMUlett

Norwegian labour law compliance workspace: multi-tenant organizations on Supabase, English and Norwegian UI (next-intl), and module routes for tasks, work council (AMU), HSE, documents/wiki, surveys, whistleblowing, e-learning, and settings.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add your Supabase URL and anon key.

## Database

SQL migrations live in `supabase/migrations`. Apply them in the Supabase SQL editor or via the Supabase CLI. They define:

- Organizations, invitations, JSON-localized roles and capabilities, and row level security
- Tables for each product area (tasks, work council with append-only audit log and ballots, HSE, wiki revisions, surveys, whistleblower cases, learning courses/modules)
- Seed rows for roles, capabilities, and high-level Working Environment Act chapter mapping in `compliance_functions` (editable in the database; the dashboard reads it)

New users can call the `bootstrap_user_organization` RPC once to create their first org and admin membership (adjust onboarding if you prefer invite-only).

## UI conventions

Design tokens are CSS variables in `src/app/globals.css`: semantic colors, radii, and focus rings. Prefer these over ad hoc hex values. Keep copy in `messages/*.json` or in the database—not in React components.

The shell layout (sidebar, top bar, teal accent, Inter) is aligned with the public **TeamHub – HR Management Dashboard** Figma reference; swap token values if your file uses different variables.

## Deploy

Deploy to Vercel and connect the same Supabase project. Ensure environment variables match `.env.example`.

Edge routing for locales and Supabase session refresh uses `src/proxy.ts` (Next.js 16 proxy convention).

**Vercel:** leave **Root Directory** empty (repository root, where this `package.json` and `vercel.json` live). If it is set to `src` or another folder, Vercel will not see `next` in dependencies and you get “No Next.js version detected”.
