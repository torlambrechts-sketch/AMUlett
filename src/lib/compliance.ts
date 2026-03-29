import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ComplianceFunctionRow = {
  id: string;
  code: string;
  module: string;
  sort_order: number;
  title: Record<string, string> | null;
  summary: Record<string, string> | null;
};

export async function getComplianceFunctions(): Promise<ComplianceFunctionRow[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("compliance_functions")
    .select("id, code, module, sort_order, title, summary")
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as ComplianceFunctionRow[];
}
