import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";
import { enforceAuthAndOnboarding } from "@/lib/supabase/proxy-auth";

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);
  const withSession = await updateSession(request, response);
  return enforceAuthAndOnboarding(request, withSession);
}

export const config = {
  matcher: [
    "/",
    "/(nb|en)/:path*",
    "/((?!_next|_vercel|.*\\..*).*)",
  ],
};
