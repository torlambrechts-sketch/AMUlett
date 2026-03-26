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
