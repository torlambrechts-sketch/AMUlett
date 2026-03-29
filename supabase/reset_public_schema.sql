-- =============================================================================
-- DANGER: Full reset of the public schema (all app tables, functions, types,
-- policies, and data in public). Use only on a dev/staging DB or when you
-- intentionally wipe application data.
--
-- Does NOT remove auth.users, auth schema, or storage files — only public.
-- Re-run ALL migrations after this (scripts/reset-and-apply-migrations.sh).
-- =============================================================================

DROP SCHEMA IF EXISTS public CASCADE;

CREATE SCHEMA public;

-- Match typical Supabase defaults for the public schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- Required by migrations (same as 20250326180000_extensions.sql)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
