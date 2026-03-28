import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrgMemberOption = { user_id: string; role_code: string | null };

/** Members of an org with role code (for assignee / roster pickers). */
export async function getOrganizationMembersWithRoles(organizationId: string): Promise<OrgMemberOption[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: rows } = await supabase
    .from("organization_members")
    .select("user_id, roles(code)")
    .eq("organization_id", organizationId);

  if (!rows?.length) return [];

  return rows.map((r) => {
    const roleRaw = r.roles as { code: string } | { code: string }[] | null;
    const code = Array.isArray(roleRaw) ? roleRaw[0]?.code : roleRaw?.code;
    return { user_id: r.user_id as string, role_code: code ?? null };
  });
}
