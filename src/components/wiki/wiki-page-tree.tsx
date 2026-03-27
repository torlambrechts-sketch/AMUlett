import { Link } from "@/i18n/navigation";
import { resolveLocalized } from "@/lib/learning/localize";

export type WikiTreeNode = {
  id: string;
  slug: string;
  title: Record<string, string> | null;
  parent_id: string | null;
  publish_status: string;
};

function buildTree(pages: WikiTreeNode[]): WikiTreeNode[] {
  const byParent = new Map<string | null, WikiTreeNode[]>();
  for (const p of pages) {
    const k = p.parent_id;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(p);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.slug.localeCompare(b.slug));
  }
  return byParent.get(null) ?? [];
}

function TreeBranch({
  nodes,
  byParent,
  spaceSlug,
  locale,
  depth,
}: {
  nodes: WikiTreeNode[];
  byParent: Map<string | null, WikiTreeNode[]>;
  spaceSlug: string;
  locale: string;
  depth: number;
}) {
  return (
    <ul className={depth === 0 ? "space-y-0.5" : "ml-3 mt-0.5 space-y-0.5 border-l border-[var(--color-border)] pl-2"}>
      {nodes.map((n) => {
        const children = byParent.get(n.id) ?? [];
        const title = resolveLocalized(n.title ?? {}, locale).text || n.slug;
        const draft = n.publish_status !== "published";
        return (
          <li key={n.id}>
            <Link
              href={`/documents/s/${encodeURIComponent(spaceSlug)}/p/${encodeURIComponent(n.slug)}`}
              className="block truncate rounded px-1 py-0.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-primary)]"
            >
              {title}
              {draft ? <span className="ml-1 text-xs text-amber-600">· draft</span> : null}
            </Link>
            {children.length > 0 ? (
              <TreeBranch nodes={children} byParent={byParent} spaceSlug={spaceSlug} locale={locale} depth={depth + 1} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function WikiPageTree({ pages, spaceSlug, locale }: { pages: WikiTreeNode[]; spaceSlug: string; locale: string }) {
  const byParent = new Map<string | null, WikiTreeNode[]>();
  for (const p of pages) {
    const k = p.parent_id;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(p);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.slug.localeCompare(b.slug));
  }
  const roots = buildTree(pages);
  if (roots.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">No pages yet.</p>;
  }
  return <TreeBranch nodes={roots} byParent={byParent} spaceSlug={spaceSlug} locale={locale} depth={0} />;
}
