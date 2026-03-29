import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { isAuthPublicPath, isOnboardingOnlyPath, pathAfterLocale } from "@/lib/auth/paths";

export async function enforceAuthAndOnboarding(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return response;
  }

  const pathname = request.nextUrl.pathname;
  const parsed = pathAfterLocale(pathname);
  if (!parsed) {
    return response;
  }

  const { locale, suffix } = parsed;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isAuthPublicPath(suffix)) {
      return response;
    }
    const login = new URL(`/${locale}/login`, request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const { count, error } = await supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const hasOrg = !error && (count ?? 0) > 0;

  if (!hasOrg) {
    if (suffix.startsWith("/invite")) {
      return response;
    }
    if (isOnboardingOnlyPath(suffix)) {
      return response;
    }
    const onboarding = new URL(`/${locale}/onboarding`, request.url);
    return NextResponse.redirect(onboarding);
  }

  if (isOnboardingOnlyPath(suffix)) {
    const home = new URL(`/${locale}`, request.url);
    return NextResponse.redirect(home);
  }

  return response;
}
