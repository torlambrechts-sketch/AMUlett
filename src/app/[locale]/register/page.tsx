import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { RegisterForm } from "@/components/auth/register-form";

type Props = { searchParams: Promise<{ invite?: string; next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const t = await getTranslations("auth");
  const q = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4 py-12">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{t("registerTitle")}</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t("registerSubtitle")}</p>
        <div className="mt-6">
          <RegisterForm inviteToken={q.invite} nextPath={q.next} />
        </div>
        <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-[var(--color-primary)] hover:underline">
            {t("loginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
