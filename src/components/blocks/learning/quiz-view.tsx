"use client";

import { useMemo, useState } from "react";
import type { QuizContent, QuizQuestion } from "@/lib/learning/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function isChoiceCorrect(q: QuizQuestion, answer: string | string[] | Record<string, string>): boolean {
  const t = q.type ?? "multiple_choice";
  if (t === "multiple_choice") {
    return typeof answer === "string" && answer === q.correctChoiceId;
  }
  if (t === "multi_select") {
    const need = new Set(q.correctChoiceIds ?? []);
    const got = new Set(Array.isArray(answer) ? answer : []);
    if (need.size !== got.size) return false;
    for (const id of need) if (!got.has(id)) return false;
    return true;
  }
  if (t === "open_ended") {
    return typeof answer === "string" && answer.trim().length > 0;
  }
  if (t === "matching" && q.correctPairs && typeof answer === "object" && !Array.isArray(answer)) {
    const pairs = answer as Record<string, string>;
    return q.correctPairs.every((p) => pairs[p.leftId] === p.rightId);
  }
  return false;
}

export function QuizView({
  content,
  onComplete,
}: {
  content: QuizContent;
  onComplete?: (scorePercent: number) => void;
}) {
  const bank = content.questionBank?.length ? content.questionBank : null;
  const randomCount = content.randomCount ?? 0;

  const activeQuestions = useMemo(() => {
    if (bank && randomCount > 0) {
      const pick = Math.min(randomCount, bank.length);
      return shuffle(bank).slice(0, pick);
    }
    return content.questions ?? [];
  }, [bank, randomCount, content.questions]);

  const passPercent = content.passPercent ?? 70;
  const [answers, setAnswers] = useState<Record<string, string | string[] | Record<string, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  if (activeQuestions.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">No questions.</p>;
  }

  let correct = 0;
  if (submitted) {
    for (const q of activeQuestions) {
      if (isChoiceCorrect(q, answers[q.id] ?? "")) correct += 1;
    }
  }
  const scorePercentCalc = activeQuestions.length ? Math.round((correct / activeQuestions.length) * 100) : 0;
  const passed = scorePercentCalc >= passPercent;

  function submit() {
    setSubmitted(true);
    let c = 0;
    for (const q of activeQuestions) {
      if (isChoiceCorrect(q, answers[q.id] ?? "")) c += 1;
    }
    const pct = activeQuestions.length ? Math.round((c / activeQuestions.length) * 100) : 0;
    onComplete?.(pct);
  }

  return (
    <div className="space-y-6">
      {bank && randomCount > 0 ? (
        <p className="text-xs text-[var(--color-text-muted)]">Randomized from question bank ({activeQuestions.length} questions).</p>
      ) : null}

      {activeQuestions.map((q) => {
        const t = q.type ?? "multiple_choice";
        return (
          <fieldset key={q.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
            <legend className="px-1 text-sm font-semibold text-[var(--color-text)]">{q.question}</legend>

            {t === "multiple_choice" && q.choices ? (
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
            ) : null}

            {t === "multi_select" && q.choices ? (
              <div className="mt-3 space-y-2">
                {q.choices.map((ch) => {
                  const selected = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
                  return (
                    <label key={ch.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(ch.id)}
                        disabled={submitted}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selected, ch.id]
                            : selected.filter((x) => x !== ch.id);
                          setAnswers((a) => ({ ...a, [q.id]: next }));
                        }}
                        className="text-[var(--color-primary)]"
                      />
                      <span>{ch.label}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}

            {t === "open_ended" ? (
              <textarea
                className="mt-3 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
                rows={4}
                disabled={submitted}
                value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                placeholder="Your answer"
              />
            ) : null}

            {t === "matching" && q.leftColumn?.length && q.rightColumn?.length ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">Match each item</p>
                  <ul className="space-y-2">
                    {q.leftColumn!.map((left) => (
                      <li key={left.id} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center">
                        <span className="min-w-0 flex-1">{left.label}</span>
                        <select
                          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-2 py-1 text-xs"
                          disabled={submitted}
                          value={
                            typeof answers[q.id] === "object" && !Array.isArray(answers[q.id])
                              ? (answers[q.id] as Record<string, string>)[left.id] ?? ""
                              : ""
                          }
                          onChange={(e) => {
                            setAnswers((a) => {
                              const cur =
                                typeof a[q.id] === "object" && !Array.isArray(a[q.id])
                                  ? { ...(a[q.id] as Record<string, string>) }
                                  : {};
                              cur[left.id] = e.target.value;
                              return { ...a, [q.id]: cur };
                            });
                          }}
                        >
                          <option value="">—</option>
                          {q.rightColumn!.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {submitted ? (
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                {isChoiceCorrect(q, answers[q.id] ?? "") ? "Correct" : "Incorrect"}
                {t === "open_ended" && q.sampleAnswer ? (
                  <span className="mt-1 block text-[var(--color-text)]">Sample: {q.sampleAnswer}</span>
                ) : null}
              </p>
            ) : null}
          </fieldset>
        );
      })}

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
            passed
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200"
              : "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
          }`}
        >
          Score: {scorePercentCalc}% (pass: {passPercent}%) — {passed ? "Passed" : "Try again"}
        </div>
      )}
    </div>
  );
}
