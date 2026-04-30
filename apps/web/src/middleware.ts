import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

async function isValidSession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("financeapp_session")?.value;
  const authenticated = token ? await isValidSession(token) : false;

  // /login is inside the matcher so we can redirect authenticated users away
  if (pathname === "/login") {
    return authenticated
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next();
  }

  // Every other matched route requires a valid session
  if (!authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

/**
 * matcher — the middleware function above only runs for paths that match.
 * Anything NOT matched is served directly with zero middleware overhead.
 *
 * Excluded (served without running middleware):
 *   _next/static   Next.js static chunks
 *   _next/image    Next.js image optimisation
 *   *.ico *.png    favicons and static images
 *   api/ingest/*   n8n ingest — protected by x-api-key, not JWT
 *   api/auth/*     login / logout endpoints
 *   test-ingest    public API test page
 *
 * Included (middleware runs, JWT required):
 *   /login         so authenticated users get bounced to /dashboard
 *   /dashboard, /transactions, /reports, /settings, /budgets, …
 *   /api/store, /api/config, /api/ingest/pending, …
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.ico|.*\\.png|api/ingest|api/auth|test-ingest).+)",
  ],
};
