import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrgMemberOption = { user_id: string; role_code: string | null };

/** Members of an org with role code (for assignee / roster pickers). */
export async function getOrganizationMembersWithRoles(organizationId: string): Promise<OrgMemberOption[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: rows } = await supabase.from("organization_members").select("user_id, role_id").eq("organization_id", organizationId);

  if (!rows?.length) return [];

  const roleIds = [...new Set(rows.map((r) => r.role_id as string))];
  if (roleIds.length === 0) return [];
  const { data: roleRows } = await supabase.from("roles").select("id, code").in("id", roleIds);
  const codeByRole = new Map((roleRows ?? []).map((x) => [x.id as string, x.code as string]));

  return rows.map((r) => ({
    user_id: r.user_id as string,
    role_code: codeByRole.get(r.role_id as string) ?? null,
  }));
}
