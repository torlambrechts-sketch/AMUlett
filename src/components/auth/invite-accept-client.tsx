"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function InviteAcceptClient({ token }: { token: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function accept() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: rpcError } = await supabase.rpc("accept_organization_invitation", {
        p_token: token,
      });
      if (rpcError) {
        setError(rpcError.message);
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError(t("unexpectedError"));
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      {error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={accept}
        disabled={loading}
        className="w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {loading ? t("joining") : t("acceptInvite")}
      </button>
    </div>
  );
}
