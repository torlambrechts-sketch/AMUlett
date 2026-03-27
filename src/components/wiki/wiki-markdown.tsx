function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainHeading(raw: string): string {
  return raw
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/@([a-z0-9-]+)/gi, "$1");
}

function headingId(raw: string): string {
  return (
    plainHeading(raw)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 48) || "section"
  );
}

/** Tokenize wiki links, escape text, restore links, then bold/code. */
function richTextToHtml(raw: string, spaceSlug: string): string {
  let s = raw;
  s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, slug: string, label?: string) => {
    return `\u0000LINK:${slug.trim()}:${(label ?? "").trim()}\u0000`;
  });
  s = s.replace(/@([a-z0-9-]+)/gi, (_, slug: string) => `\u0000AT:${slug.trim()}:\u0000`);

  const pieces = s.split("\u0000");
  const out: string[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]!;
    if (p.startsWith("LINK:")) {
      const rest = p.slice(5);
      const colon = rest.indexOf(":");
      const slug = colon >= 0 ? rest.slice(0, colon) : rest;
      const label = colon >= 0 ? rest.slice(colon + 1) : "";
      const href = `/documents/s/${encodeURIComponent(spaceSlug)}/p/${encodeURIComponent(slug)}`;
      const t = escapeHtml(label || slug);
      out.push(`<a href="${href}" class="font-medium text-[var(--color-primary)] hover:underline">${t}</a>`);
    } else if (p.startsWith("AT:")) {
      const rest = p.slice(3);
      const slug = rest.replace(/:$/, "");
      const href = `/documents/s/${encodeURIComponent(spaceSlug)}/p/${encodeURIComponent(slug)}`;
      out.push(`<a href="${href}" class="font-medium text-[var(--color-primary)] hover:underline">${escapeHtml(slug)}</a>`);
    } else {
      let x = escapeHtml(p);
      x = x.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      x = x.replace(/`([^`]+)`/g, "<code class=\"rounded bg-[var(--color-surface-elevated)] px-1 py-0.5 font-mono text-xs\">$1</code>");
      out.push(x);
    }
  }
  return out.join("");
}

function renderProseToHtml(text: string, spaceSlug: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let inUl = false;
  for (const line of lines) {
    const h3 = /^### (.+)$/.exec(line);
    const h2 = /^## (.+)$/.exec(line);
    const h1 = /^# (.+)$/.exec(line);
    const ul = /^- (.+)$/.exec(line);
    if (h1) {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      const inner = richTextToHtml(h1[1]!, spaceSlug);
      out.push(`<h1 id="${headingId(h1[1]!)}" class="mt-6 mb-2 text-xl font-bold">${inner}</h1>`);
      continue;
    }
    if (h2) {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      const inner = richTextToHtml(h2[1]!, spaceSlug);
      out.push(`<h2 id="${headingId(h2[1]!)}" class="mt-5 mb-2 text-lg font-semibold">${inner}</h2>`);
      continue;
    }
    if (h3) {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      const inner = richTextToHtml(h3[1]!, spaceSlug);
      out.push(`<h3 id="${headingId(h3[1]!)}" class="mt-4 mb-1 text-base font-semibold">${inner}</h3>`);
      continue;
    }
    if (ul) {
      if (!inUl) {
        out.push('<ul class="my-2 list-disc pl-5">');
        inUl = true;
      }
      out.push(`<li>${richTextToHtml(ul[1]!, spaceSlug)}</li>`);
      continue;
    }
    if (inUl && line.trim() === "") {
      out.push("</ul>");
      inUl = false;
      continue;
    }
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (line.trim() === "") {
      out.push("<br/>");
    } else {
      out.push(`<p class="my-2">${richTextToHtml(line, spaceSlug)}</p>`);
    }
  }
  if (inUl) out.push("</ul>");
  return out.join("");
}

/** Lightweight Markdown + wiki links [[slug|label]] and @slug. */
export function WikiMarkdown({
  source,
  spaceSlug,
}: {
  source: string;
  spaceSlug: string;
}) {
  const segments = source.split(/(```[\s\S]*?```)/g);
  const blocks = segments.map((seg, i) => {
    if (seg.startsWith("```")) {
      const m = /^```(\w*)\n?([\s\S]*?)```$/.exec(seg);
      const lang = m?.[1] ?? "";
      const code = m?.[2] ?? seg.replace(/^```\w*\n?/, "").replace(/```$/, "");
      return (
        <pre
          key={i}
          className="my-3 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 text-xs"
        >
          <code className={lang ? `language-${lang}` : undefined}>{code.replace(/\n$/, "")}</code>
        </pre>
      );
    }
    if (!seg) return null;
    return (
      <div
        key={i}
        className="wiki-md-inline"
        dangerouslySetInnerHTML={{ __html: renderProseToHtml(seg, spaceSlug) }}
      />
    );
  });
  return <div className="wiki-markdown space-y-1 text-sm leading-relaxed text-[var(--color-text)]">{blocks}</div>;
}
