export type DiffLine = { type: "same" | "add" | "remove"; text: string };

/** Simple line-based diff for side-by-side / unified display. */
export function lineDiff(a: string, b: string): DiffLine[] {
  const la = a.split("\n");
  const lb = b.split("\n");
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < la.length || j < lb.length) {
    if (i < la.length && j < lb.length && la[i] === lb[j]) {
      out.push({ type: "same", text: la[i]! });
      i++;
      j++;
    } else if (j < lb.length && (i >= la.length || !la.slice(i).includes(lb[j]!))) {
      out.push({ type: "add", text: lb[j]! });
      j++;
    } else if (i < la.length) {
      out.push({ type: "remove", text: la[i]! });
      i++;
    } else {
      break;
    }
  }
  return out;
}
