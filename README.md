# AMUlett

Norwegian labour law compliance workspace: multi-tenant organizations on Supabase, English and Norwegian UI (next-intl), and module routes for tasks, work council (AMU), HSE, documents/wiki, surveys, whistleblowing, e-learning, and settings.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add your Supabase URL and anon key.

### Authentication

- **Sign up (first member):** `/[locale]/register` creates the auth user; if email confirmation is off, the app calls `bootstrap_user_organization` so the user becomes **org admin** of a new organization.
- **Email confirmation:** If enabled, after the user confirms, open `/[locale]/onboarding` to run the same bootstrap (or sign in and complete onboarding).
- **Invites:** Org admins use **Settings** to create an invitation (stores only a **hash** of the token). Share the link `/[locale]/invite?token=…` (copy button). The invitee must **register or sign in with the same email** as the invitation, then accept.
- **Supabase dashboard:** Under Authentication → URL configuration, add redirect URLs such as `http://localhost:3000/*/auth/callback` and your production `https://your-domain.com/*/auth/callback` (or one entry per locale, e.g. `http://localhost:3000/nb/auth/callback`).

Apply the SQL migration `20250326210000_invitation_rpcs.sql` so `get_invitation_preview`, `create_organization_invitation`, `accept_organization_invitation`, and `revoke_organization_invitation` exist.

## Database

SQL migrations live in `supabase/migrations`. Apply them in the Supabase SQL editor or via the Supabase CLI. To run everything in one go, paste **`supabase/ALL_MIGRATIONS.sql`** into **SQL → New query** (anon keys cannot execute DDL).

### “Relation already exists” on an existing project

`ALL_MIGRATIONS.sql` is **not** idempotent: it assumes an empty `public` schema. If the database already has tables from a previous partial run, you get errors like `relation "organizations" already exists`.

**Option A — wipe app schema and re-apply (destructive)**  
This removes **all data** in `public` (organizations, wiki, tasks, etc.). Auth users in `auth.users` are **not** deleted; storage **files** may remain as orphans until you clean the bucket.

1. From the repo, with `POSTGRES_URL_NON_POOLING` set:

   ```bash
   ./scripts/reset-and-apply-migrations.sh
   ```

2. Or run **`supabase/reset_public_schema.sql`** once in the SQL editor, then run **`ALL_MIGRATIONS.sql`** (or `./scripts/apply-migrations.sh`).

**Option B — keep data**  
Apply only migration files you have **not** run yet, in filename order (do **not** paste the full `ALL_MIGRATIONS.sql`).

We do **not** add `DROP TABLE` to each numbered migration file: that would destroy production data on every CI run.

### Automate migrations (no SQL Editor each time)

Anything that can open **Postgres as the `postgres` user** can run your migration files. Vercel does **not** do this by default (your app uses the anon/service keys, not DDL).

**Option A — GitHub Actions (recommended)**  
Workflow: `.github/workflows/supabase-migrations.yml`. It runs `scripts/apply-migrations.sh` when you push changes under `supabase/migrations/` to `main` (or run the workflow manually).

1. In the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**  
   Name: `POSTGRES_URL_NON_POOLING`  
   Value: Supabase **Project Settings → Database → Connection string → URI** (direct connection, port **5432**, user `postgres`, include password).  
2. Merge migration files to `main` (or trigger **Actions → Apply Supabase migrations → Run workflow**).

**Option B — Your machine or CI**  
With `postgresql-client` installed:

```bash
export POSTGRES_URL_NON_POOLING="postgres://postgres.[ref]:YOUR_PASSWORD@db.[ref].supabase.co:5432/postgres?sslmode=require"
./scripts/apply-migrations.sh
```

**Option C — Supabase CLI**  
`supabase link` then `supabase db push` (keeps migration history in Supabase; good for teams already on the CLI).

Never commit the database password or service role key; keep them only in GitHub Actions secrets or Vercel **server** env vars.

**LMS system courses:** migration `20250326220000_learning_lms.sql` adds `learning_courses.scope` (`system_default` vs `organization`) and `platform_admins`. Insert your user id into `platform_admins` (as postgres) to author default courses for all organizations.

If the app reports **Could not find the 'scope' column** (or similar schema cache errors), the migration has not been applied to that Supabase project yet—run `supabase/migrations/20250326220000_learning_lms.sql` (or the full `ALL_MIGRATIONS.sql` on a new project). Course **slugs** are generated in the app from the title; users do not enter them.

They define:

- Organizations, invitations, JSON-localized roles and capabilities, and row level security
- Tables for each product area (tasks, work council with append-only audit log and ballots, HSE, wiki revisions, surveys, whistleblower cases, learning courses/modules)
- Seed rows for roles, capabilities, and high-level Working Environment Act chapter mapping in `compliance_functions` (editable in the database; the dashboard reads it)

New users can call the `bootstrap_user_organization` RPC once to create their first org and admin membership (adjust onboarding if you prefer invite-only).

## UI conventions

Design tokens are CSS variables in `src/app/globals.css`: semantic colors, radii, and focus rings. Prefer these over ad hoc hex values. Keep copy in `messages/*.json` or in the database—not in React components.

**Feature modules:** Shared product logic that spans LMS and documents lives under `src/modules/` (e.g. `@modules/editor` for TipTap, LMS visual content forms, and wiki block editing). Import only from each module’s `index.ts` so features stay decoupled from internal file layout.

The shell uses a **dark navy sidebar**, **blue primary actions**, **white top bar** with a generic **AMUlett** logo mark, and a **card-based dashboard** layout inspired by common document/HR dashboards. Design tokens live in `src/app/globals.css`.

## Deploy

Deploy to Vercel and connect the same Supabase project. Ensure environment variables match `.env.example`.

Edge routing for locales and Supabase session refresh uses `src/proxy.ts` (Next.js 16 proxy convention).

**Vercel:** leave **Root Directory** empty (repository root, where this `package.json` and `vercel.json` live). If it is set to `src` or another folder, Vercel will not see `next` in dependencies and you get “No Next.js version detected”.
