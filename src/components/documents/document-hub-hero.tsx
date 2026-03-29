import { Link } from "@/i18n/navigation";

export function DocumentHubHero({
  title,
  subtitle,
  addHref,
  showAdd,
  addLabel,
}: {
  title: string;
  subtitle: string;
  addHref: string;
  showAdd: boolean;
  addLabel: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">{subtitle}</p>
      </div>
      {showAdd ? (
        <Link
          href={addHref}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0d9488] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f766e]"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3h-6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          {addLabel}
        </Link>
      ) : null}
    </div>
  );
}
