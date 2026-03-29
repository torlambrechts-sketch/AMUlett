import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrgContext = {
  organizationId: string;
  slug: string;
  name: Record<string, string> | null;
};

export async function getUserOrgContext(): Promise<OrgContext | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pref } = await supabase
    .from("user_preferences")
    .select("active_organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let orgId = pref?.active_organization_id as string | null | undefined;

  if (!orgId) {
    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    orgId = member?.organization_id ?? null;
  }

  if (!orgId) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .eq("id", orgId)
    .maybeSingle();

  if (!org) return null;

  return {
    organizationId: org.id,
    slug: org.slug,
    name: (org.name as Record<string, string> | null) ?? null,
  };
}

export async function userHasAnyOrganization(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { count, error } = await supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) return false;
  return (count ?? 0) > 0;
}
