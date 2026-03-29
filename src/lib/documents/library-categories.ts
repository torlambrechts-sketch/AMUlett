/** Matches DB check on wiki_pages.library_category and document_library_items.category */
export const LIBRARY_CATEGORIES = [
  "general",
  "policies",
  "procedures",
  "legal",
  "hse",
  "training",
  "contracts",
  "other",
] as const;

export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number];

export function isLibraryCategory(s: string): s is LibraryCategory {
  return (LIBRARY_CATEGORIES as readonly string[]).includes(s);
}
