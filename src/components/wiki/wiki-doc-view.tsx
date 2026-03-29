import { WikiBlockRenderer } from "@/components/wiki/wiki-block-renderer";
import { WikiMarkdown } from "@/components/wiki/wiki-markdown";
import { parseWikiDocument } from "@/lib/wiki/types";

export function WikiDocView({ editorDocument, spaceSlug }: { editorDocument: unknown; spaceSlug: string }) {
  const doc = parseWikiDocument(editorDocument);
  if (doc.format === "markdown") {
    return <WikiMarkdown source={doc.markdown} spaceSlug={spaceSlug} />;
  }
  return (
    <div className="space-y-6">
      {doc.blocks.map((b) => (
        <WikiBlockRenderer key={b.id} block={b} spaceSlug={spaceSlug} />
      ))}
    </div>
  );
}
