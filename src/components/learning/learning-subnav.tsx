"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const links: { href: string; key: "pdNavCatalog" | "pdNavStudio" | "pdNavResources"; requiresAuthor?: boolean }[] = [
  { href: "/learning", key: "pdNavCatalog" },
  { href: "/learning/studio", key: "pdNavStudio", requiresAuthor: true },
  { href: "/learning/studio/resources", key: "pdNavResources", requiresAuthor: true },
];

function pathWithoutLocale(pathname: string) {
  return pathname.replace(/^\/(en|nb)(?=\/|$)/, "") || "/";
}

export function LearningSubnav({ canAuthor }: { canAuthor: boolean }) {
  const t = useTranslations("lms");
  const pathname = usePathname();
  const p = pathWithoutLocale(pathname);

  return (
    <nav
      className="flex w-[13.5rem] shrink-0 flex-col border-r border-[#e8eaed] bg-[#fafaf9] py-4"
      aria-label={t("pdLearningNav")}
    >
      <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">{t("pdNavSection")}</p>
      <ul className="flex flex-col gap-0.5 px-2">
        {links
          .filter((l) => !l.requiresAuthor || canAuthor)
          .map(({ href, key }) => {
            const active =
              href === "/learning"
                ? p === "/learning"
                : href === "/learning/studio"
                  ? p.startsWith("/learning/studio") && !p.startsWith("/learning/studio/resources")
                  : p.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-white text-[#2d8e52] shadow-sm" : "text-[#3d4248] hover:bg-white/80",
                  ].join(" ")}
                >
                  {active ? <span className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2d8e52]" aria-hidden /> : <span className="mr-2 w-1.5 shrink-0" />}
                  {t(key)}
                </Link>
              </li>
            );
          })}
      </ul>
      <div className="mt-auto border-t border-[#e8eaed] px-4 pt-4">
        <Link href="/settings" className="text-xs font-medium text-[#6b7280] hover:text-[#2d8e52]">
          {t("pdNavSettings")}
        </Link>
      </div>
    </nav>
  );
}
