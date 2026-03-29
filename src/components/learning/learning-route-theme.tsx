"use client";

import { useEffect } from "react";

const HTML_CLASS = "learning-ui";

/**
 * Applies PandaDoc-inspired shell tokens (light rail + beige workspace) for /learning routes.
 */
export function LearningRouteTheme() {
  useEffect(() => {
    document.documentElement.classList.add(HTML_CLASS);
    return () => {
      document.documentElement.classList.remove(HTML_CLASS);
    };
  }, []);

  return null;
}
