"use client";

import { useState } from "react";
import type { QuizContent } from "@/lib/learning/types";

export function QuizView({
  content,
  onComplete,
}: {
  content: QuizContent;
  onComplete?: (scorePercent: number) => void;
}) {
  const questions = content.questions ?? [];
  const passPercent = content.passPercent ?? 70;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  if (questions.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">No questions.</p>;
  }

  let correct = 0;
  if (submitted) {
    for (const q of questions) {
      if (answers[q.id] === q.correctChoiceId) correct += 1;
    }
  }
  const scorePercent = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  const passed = scorePercent >= passPercent;

  function submit() {
    setSubmitted(true);
    let c = 0;
    for (const q of questions) {
      if (answers[q.id] === q.correctChoiceId) c += 1;
    }
    const pct = questions.length ? Math.round((c / questions.length) * 100) : 0;
    onComplete?.(pct);
  }

  return (
    <div className="space-y-6">
      {questions.map((q) => (
        <fieldset key={q.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
          <legend className="px-1 text-sm font-semibold text-[var(--color-text)]">{q.question}</legend>
          <div className="mt-3 space-y-2">
            {q.choices.map((ch) => (
              <label key={ch.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={q.id}
                  value={ch.id}
                  checked={answers[q.id] === ch.id}
                  disabled={submitted}
                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: ch.id }))}
                  className="text-[var(--color-primary)]"
                />
                <span>{ch.label}</span>
              </label>
            ))}
          </div>
          {submitted ? (
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              {answers[q.id] === q.correctChoiceId ? "Correct" : "Incorrect"}
            </p>
          ) : null}
        </fieldset>
      ))}
      {!submitted ? (
        <button
          type="button"
          onClick={submit}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)]"
        >
          Submit answers
        </button>
      ) : (
        <div
          className={`rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium ${
            passed ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200" : "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
          }`}
        >
          Score: {scorePercent}% (pass: {passPercent}%) — {passed ? "Passed" : "Try again"}
        </div>
      )}
    </div>
  );
}
