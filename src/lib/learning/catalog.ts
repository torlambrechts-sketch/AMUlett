import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LearningCourseRow } from "@/lib/learning/types";

export async function fetchPublishedCatalog(orgId: string): Promise<{
  system: LearningCourseRow[];
  organization: LearningCourseRow[];
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { system: [], organization: [] };
  }

  const { data: system } = await supabase
    .from("learning_courses")
    .select("id, organization_id, slug, title, description, published, scope, created_at")
    .eq("scope", "system_default")
    .eq("published", true)
    .order("created_at", { ascending: false });

  const { data: orgCourses } = await supabase
    .from("learning_courses")
    .select("id, organization_id, slug, title, description, published, scope, created_at")
    .eq("scope", "organization")
    .eq("organization_id", orgId)
    .eq("published", true)
    .order("created_at", { ascending: false });

  return {
    system: (system ?? []) as LearningCourseRow[],
    organization: (orgCourses ?? []) as LearningCourseRow[],
  };
}
