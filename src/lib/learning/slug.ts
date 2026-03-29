import { slugifyOrganizationName } from "@/lib/slug";

/** Human-readable slug from course title; falls back if empty. */
export function slugFromCourseTitles(titleNb: string, titleEn: string): string {
  const raw = titleNb.trim() || titleEn.trim();
  const base = slugifyOrganizationName(raw);
  if (base.length >= 2) return base.slice(0, 64);
  return `course-${Date.now().toString(36)}`;
}
