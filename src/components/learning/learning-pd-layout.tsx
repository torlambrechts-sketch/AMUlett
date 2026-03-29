import type { ReactNode } from "react";
import { getUserOrgContext } from "@/lib/org/server";
import { getLearningAccess } from "@/lib/learning/server-access";
import { LearningSubnavWrapper } from "@/components/learning/learning-subnav-wrapper";

/** Server wrapper: secondary sidebar + PandaDoc-style content column for all /learning pages. */
export async function LearningPdLayout({ children }: { children: ReactNode }) {
  const org = await getUserOrgContext();
  const access = org ? await getLearningAccess(org.organizationId) : null;
  const canAuthor = Boolean(access?.canAuthorOrg || access?.isPlatformAdmin);

  return <LearningSubnavWrapper canAuthor={canAuthor}>{children}</LearningSubnavWrapper>;
}
