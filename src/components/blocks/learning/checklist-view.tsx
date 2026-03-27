"use client";

import { useState } from "react";
import type { ChecklistContent } from "@/lib/learning/types";

export function ChecklistView({ content }: { content: ChecklistContent }) {
  const items = content.items?.length ? content.items : [];
  const [done, setDone] = useState<Record<string, boolean>>({});

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={!!done[item.id]}
            onChange={(e) => setDone((d) => ({ ...d, [item.id]: e.target.checked }))}
            className="mt-1"
          />
          <span className="text-sm text-[var(--color-text)]">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
