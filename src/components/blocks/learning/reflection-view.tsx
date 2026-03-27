"use client";

import { useState } from "react";
import type { ReflectionContent } from "@/lib/learning/types";

export function ReflectionView({ content }: { content: ReflectionContent }) {
  const [value, setValue] = useState("");
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[var(--color-text)]">{content.prompt ?? "Reflect"}</p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        placeholder="Your notes (saved locally until progress sync is wired)"
      />
    </div>
  );
}
