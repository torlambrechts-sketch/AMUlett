"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

const HSE_TABS = ["all", "risk_assessment", "deviation", "halted_work", "inspection"] as const;

export function HseTemplateShell({
  children,
  metricsSlot,
}: {
  children: ReactNode;
  metricsSlot?: ReactNode;
}) {
  const t = useTranslations("hse");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") ?? "all";

  function setTab(next: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (next === "all") p.delete("tab");
    else p.set("tab", next);
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="min-h-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">{t("templateTitle")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">{t("templateSubtitle")}</p>
      </div>

      {metricsSlot}

      <div className="relative mb-6 max-w-xl">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9ca3af]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
        </svg>
        <input
          type="search"
          readOnly
          placeholder={t("templateSearchPlaceholder")}
          className="w-full rounded-lg border border-[#e5e7eb] bg-[#f2f5f7] py-2.5 pl-11 pr-4 text-sm text-[#111827] placeholder:text-[#9ca3af]"
          title={t("templateSearchPlaceholder")}
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-[#e5e7eb] pb-3">
        {HSE_TABS.map((key) => {
          const active = currentTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                "rounded-lg px-4 py-2 text-sm font-medium transition",
                active ? "bg-[#1d4e5b] text-white shadow-sm" : "bg-white text-[#4b5563] hover:bg-[#f3f4f6]",
              ].join(" ")}
            >
              {t(`templateTab.${key}`)}
            </button>
          );
        })}
      </div>

      {children}
    </div>
  );
}
