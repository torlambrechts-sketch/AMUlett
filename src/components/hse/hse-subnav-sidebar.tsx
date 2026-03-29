"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

function pathWithoutLocale(pathname: string) {
  return pathname.replace(/^\/(en|nb)(?=\/|$)/, "") || "/";
}

const links: { href: string; labelKey: "navOverview" | "navRos" | "navDeviations" | "navInspections" | "navHalt" | "navWhistleblower" }[] = [
  { href: "/hse", labelKey: "navOverview" },
  { href: "/hse/ros", labelKey: "navRos" },
  { href: "/hse/deviations", labelKey: "navDeviations" },
  { href: "/hse/inspections", labelKey: "navInspections" },
  { href: "/hse/halt", labelKey: "navHalt" },
  { href: "/hse/whistleblower", labelKey: "navWhistleblower" },
];

export function HseSubnavSidebar() {
  const t = useTranslations("hse");
  const pathname = usePathname();
  const p = pathWithoutLocale(pathname);

  return (
    <nav
      className="flex w-[13.5rem] shrink-0 flex-col border-r border-[#e8eaed] bg-[#fafaf9] py-4"
      aria-label={t("templateNavLabel")}
    >
      <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">{t("templateNavSection")}</p>
      <ul className="flex flex-col gap-0.5 px-2">
        {links.map(({ href, labelKey }) => {
          const active = href === "/hse" ? p === "/hse" : p.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={[
                  "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-white text-[#1d4e5b] shadow-sm" : "text-[#3d4248] hover:bg-white/80",
                ].join(" ")}
              >
                {active ? <span className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1d4e5b]" aria-hidden /> : <span className="mr-2 w-1.5 shrink-0" />}
                {t(labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto border-t border-[#e8eaed] px-4 pt-4">
        <Link href="/settings" className="text-xs font-medium text-[#6b7280] hover:text-[#1d4e5b]">
          {t("templateNavSettings")}
        </Link>
      </div>
    </nav>
  );
}
