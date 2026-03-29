"use client";

import { useEffect } from "react";

const SIDEBAR_BG = "#004cfe";
const SIDEBAR_PREV = "#001a3d";

/**
 * While mounted, aligns the shell sidebar with the ActiveCampaign-style learning palette.
 */
export function LearningRouteTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.getPropertyValue("--sidebar-bg");
    root.style.setProperty("--sidebar-bg", SIDEBAR_BG);
    return () => {
      root.style.setProperty("--sidebar-bg", before || SIDEBAR_PREV);
    };
  }, []);

  return null;
}
