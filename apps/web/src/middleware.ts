import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

// Paths that bypass JWT auth entirely.
// The middleware still runs (matcher below is intentionally broad) but
// these routes return next() immediately — no token check, no redirect.
const PUBLIC_PREFIXES = [
  "/api/ingest/",   // n8n ingest — protected by x-api-key header
  "/api/auth/",     // login / logout
  "/test-ingest",   // public API test page
];

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

  // Pass public routes straight through — no auth required
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("financeapp_session")?.value;
  const authenticated = token ? await isValidSession(token) : false;

  // Redirect authenticated users away from the login page
  if (pathname === "/login") {
    return authenticated
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next();
  }

  // Every other route requires a valid session
  if (!authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// Intentionally broad — excludes only Next.js internals and static assets.
// All path-based public/private logic lives in the function above.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
