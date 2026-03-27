# Supabase SQL

Migration files in `migrations/` are applied in filename order.

## Apply everything at once (SQL Editor)

If you do not use the Supabase CLI with a database password, open the Supabase dashboard → **SQL** → **New query**, paste the contents of **`ALL_MIGRATIONS.sql`**, and run it once on an empty project (or only after you understand idempotency: re-running may fail on existing objects).

The **anon key cannot run migrations**; only the dashboard SQL editor or a role with DDL rights can.

## Security

Never commit service role keys or database passwords. Rotate keys if they are exposed.

**Platform admins (LMS):** after `20250326220000_learning_lms.sql`, insert rows into `public.platform_admins (user_id)` using the Supabase SQL editor (as a privileged role) so those users can create **system_default** courses visible to every organization.

If PostgREST returns **schema cache** errors for new columns, confirm the migration ran successfully; the API usually picks up DDL within about a minute. Re-run a trivial `notify pgrst, 'reload schema';` only if your project documents it (most projects auto-reload).
