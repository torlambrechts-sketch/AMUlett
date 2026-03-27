import { Link } from "@/i18n/navigation";

/** Generic product mark (replaces third-party branding in reference designs). */
export function BrandLogo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--header-logo-bg)] px-3 py-2 text-white shadow-sm transition hover:brightness-110"
      aria-label="AMUlett home"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15">
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
