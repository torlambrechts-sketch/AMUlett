"use client";

import { useState } from "react";
import type { FlashCardsContent } from "@/lib/learning/types";

export function FlashCardsView({ content }: { content: FlashCardsContent }) {
  const cards = content.cards?.length ? content.cards : [{ front: "", back: "" }];
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[Math.min(i, cards.length - 1)];

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setFlipped(!flipped)}
        className="flex min-h-[160px] w-full flex-col justify-center rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 text-center shadow-sm transition hover:border-[var(--color-primary)]"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          {flipped ? "Back" : "Front"}
        </span>
        <p className="mt-2 text-base text-[var(--color-text)]">{flipped ? card.back : card.front}</p>
        <span className="mt-4 text-xs text-[var(--color-primary)]">Tap to flip</span>
      </button>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={i === 0}
          onClick={() => {
            setI((v) => Math.max(0, v - 1));
            setFlipped(false);
          }}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-xs text-[var(--color-text-muted)]">
          {i + 1} / {cards.length}
        </span>
        <button
          type="button"
          disabled={i >= cards.length - 1}
          onClick={() => {
            setI((v) => Math.min(cards.length - 1, v + 1));
            setFlipped(false);
          }}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
