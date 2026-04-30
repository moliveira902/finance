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

  // Unauthenticated → redirect to login
  if (!authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Already logged in and hitting /login → go to dashboard
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

/**
 * The matcher controls WHICH paths the middleware function above runs on.
 * Paths not matched here are served directly — no middleware, no auth check.
 *
 * Excluded from middleware (publicly accessible):
 *   - /_next/*          Next.js internals (static, image optimisation)
 *   - /favicon.ico, *.ico, *.png
 *   - /login            login page itself (handled via redirect logic above
 *                       when already authenticated, otherwise served freely)
 *   - /api/auth/*       login / logout API routes
 *   - /api/ingest/*     n8n ingest endpoint — authenticated by x-api-key header
 *   - /test-ingest      public API test page
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.ico|.*\\.png|login|api/auth|api/ingest|test-ingest).+)",
  ],
};
