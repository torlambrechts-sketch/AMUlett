"use client";

import { useEffect, useState } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] lg:hidden"
        aria-expanded={open}
        aria-controls="mobile-drawer"
        aria-label="Menu"
        onClick={() => setOpen(true)}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" id="mobile-drawer">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[min(100%,288px)] flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--sidebar-border)] px-4 py-3">
              <span className="text-base font-semibold tracking-tight text-[var(--sidebar-text)]">AMUlett</span>
              <button
                type="button"
                className="rounded-[var(--radius-sm)] p-2 text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-hover)]"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-[var(--sidebar-border)] p-4">
              <SignOutButton variant="sidebar" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
