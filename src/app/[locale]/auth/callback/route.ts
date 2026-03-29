import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { routing } from "@/i18n/routing";

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextRaw = requestUrl.searchParams.get("next");
  const localeMatch = requestUrl.pathname.match(/^\/(en|nb)\//);
  const locale = localeMatch?.[1] ?? routing.defaultLocale;

  let safeNext = `/${locale}`;
  if (nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")) {
    safeNext = nextRaw;
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            /* ignore when not mutable */
          }
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL(`/${locale}/login?error=auth`, requestUrl.origin));
}
