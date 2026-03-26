import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";

const navKeys = [
  { href: "/", key: "home" as const },
  { href: "/tasks", key: "tasks" as const },
  { href: "/work-council", key: "workCouncil" as const },
  { href: "/hse", key: "hse" as const },
  { href: "/documents", key: "documents" as const },
  { href: "/surveys", key: "surveys" as const },
  { href: "/reports", key: "reports" as const },
  { href: "/learning", key: "learning" as const },
  { href: "/settings", key: "settings" as const },
];

export async function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("nav");

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-[var(--color-primary)]">
            AMUlett
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {navKeys.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[var(--radius-sm)] px-2 py-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
          <LocaleSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">{title}</h1>
        {children}
      </main>
    </div>
  );
}
