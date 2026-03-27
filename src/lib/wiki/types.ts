export type WikiCalloutVariant = "info" | "warning" | "tip";

export type WikiBlock =
  | { id: string; type: "text"; content: string }
  | { id: string; type: "callout"; variant: WikiCalloutVariant; title?: string; body: string }
  | { id: string; type: "code"; language: string; code: string }
  | { id: string; type: "embed"; url: string; title?: string };

export type WikiEditorDocument = {
  format: "blocks" | "markdown";
  blocks: WikiBlock[];
  markdown: string;
};

export function emptyWikiDocument(): WikiEditorDocument {
  return { format: "blocks", blocks: [{ id: "b0", type: "text", content: "" }], markdown: "" };
}

export function parseWikiDocument(raw: unknown): WikiEditorDocument {
  if (!raw || typeof raw !== "object") return emptyWikiDocument();
  const o = raw as Record<string, unknown>;
  const format = o.format === "markdown" ? "markdown" : "blocks";
  const markdown = typeof o.markdown === "string" ? o.markdown : "";
  const blocks: WikiBlock[] = Array.isArray(o.blocks)
    ? (o.blocks as WikiBlock[]).filter((b) => b && typeof b === "object" && typeof (b as WikiBlock).id === "string")
    : [];
  if (format === "markdown") {
    return { format: "markdown", blocks: [], markdown };
  }
  if (blocks.length === 0) {
    return { format: "blocks", blocks: [{ id: "b0", type: "text", content: "" }], markdown: "" };
  }
  return { format: "blocks", blocks, markdown: "" };
}
