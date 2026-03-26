import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "@/components/auth/login-form";

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const t = await getTranslations("auth");
  const q = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4 py-12">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{t("loginTitle")}</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t("loginSubtitle")}</p>
        {q.error === "auth" ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {t("authError")}
          </p>
        ) : null}
        <div className="mt-6">
          <LoginForm nextPath={q.next} />
        </div>
        <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium text-[var(--color-primary)] hover:underline">
            {t("registerLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
