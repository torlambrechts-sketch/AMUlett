import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LearningAccess = {
  canAuthorOrg: boolean;
  isPlatformAdmin: boolean;
};

export async function getLearningAccess(organizationId: string | null): Promise<LearningAccess> {
  const supabase = await createSupabaseServerClient();
  if (!supabase || !organizationId) {
    return { canAuthorOrg: false, isPlatformAdmin: false };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { canAuthorOrg: false, isPlatformAdmin: false };
  }

  const { data: pa } = await supabase.rpc("has_platform_admin");
  const isPlatformAdmin = pa === true;

  const { data: cap } = await supabase.rpc("has_capability", {
    p_org: organizationId,
    p_code: "learning.author",
  });
  const { data: adminCap } = await supabase.rpc("has_capability", {
    p_org: organizationId,
    p_code: "org.admin",
  });

  const canAuthorOrg = cap === true || adminCap === true;

  return { canAuthorOrg, isPlatformAdmin };
}
