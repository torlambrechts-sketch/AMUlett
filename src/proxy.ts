import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);
  return updateSession(request, response);
}

export const config = {
  matcher: [
    "/",
    "/(nb|en)/:path*",
    "/((?!_next|_vercel|.*\\..*).*)",
  ],
};
