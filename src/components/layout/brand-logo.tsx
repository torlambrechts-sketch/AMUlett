import { Link } from "@/i18n/navigation";

/** Generic product mark (replaces third-party branding in reference designs). */
export function BrandLogo({ variant = "header" }: { variant?: "header" | "prominent" }) {
  const isProminent = variant === "prominent";
  return (
    <Link
      href="/"
      className={
        isProminent
          ? "flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--sidebar-logo-tint)] px-3 py-2 text-[var(--sidebar-text)] transition hover:bg-white/15"
          : "flex items-center gap-2 rounded-[var(--radius-md)] px-1 py-1.5 text-[var(--color-text)] transition hover:bg-[var(--color-surface-elevated)]"
      }
      aria-label="AMUlett home"
    >
      <span
        className={
          isProminent
            ? "flex h-8 w-8 items-center justify-center rounded-md bg-white/20 text-[var(--sidebar-text)]"
            : "flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-muted)] text-[var(--color-primary)]"
        }
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3L4 9v12h16V9l-8-6z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-sm font-semibold tracking-tight">AMUlett</span>
    </Link>
  );
}
