export function normalizeInvitationRole(
  roles: unknown
): { code: string; label: Record<string, string> } | null {
  if (!roles) return null;
  if (Array.isArray(roles)) {
    const first = roles[0];
    if (first && typeof first === "object" && "code" in first) {
      return first as { code: string; label: Record<string, string> };
    }
    return null;
  }
  if (typeof roles === "object" && "code" in roles) {
    return roles as { code: string; label: Record<string, string> };
  }
  return null;
}
