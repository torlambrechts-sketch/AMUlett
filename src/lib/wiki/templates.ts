import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { emptyWikiDocument, parseWikiDocument, type WikiEditorDocument } from "@/lib/wiki/types";

export type WikiTemplateMeta = {
  key: string;
  label: Record<string, string>;
  document: WikiEditorDocument;
};

export function loadWikiTemplates(): WikiTemplateMeta[] {
  const dir = join(process.cwd(), "template", "wiki");
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const out: WikiTemplateMeta[] = [];
  for (const f of files) {
    try {
      const raw = JSON.parse(readFileSync(join(dir, f), "utf8")) as {
        key?: string;
        label?: Record<string, string>;
        document?: unknown;
      };
      if (!raw.key) continue;
      out.push({
        key: raw.key,
        label: raw.label ?? { en: raw.key },
        document: parseWikiDocument(raw.document ?? emptyWikiDocument()),
      });
    } catch {
      /* skip */
    }
  }
  return out;
}

export function getTemplateByKey(key: string): WikiTemplateMeta | null {
  return loadWikiTemplates().find((t) => t.key === key) ?? null;
}
