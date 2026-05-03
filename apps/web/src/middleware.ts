import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

// Routes that must never be intercepted.
// Primary exclusion is in the matcher below; this is a defence-in-depth
// fallback for edge runtimes that silently ignore negative lookaheads.
const PUBLIC_PREFIXES = ["/api/ingest/", "/api/auth/", "/test-ingest"];

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

  // Fallback: pass public routes through even if matcher didn't exclude them
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("financeapp_session")?.value;
  const authenticated = token ? await isValidSession(token) : false;

  // Redirect authenticated users away from login
  if (pathname === "/login") {
    return authenticated
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next();
  }

  // All other routes require a valid session
  if (!authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// Primary exclusion via matcher.
// After consuming the leading "/", the lookahead checks the remainder of the path.
// Excluded (public, zero middleware overhead):
//   api/ingest/  — ingest API, protected by x-api-key only
//   api/auth/    — login / logout
//   test-ingest  — public test page
//   _next/*      — Next.js internals
//   favicon.ico  — static asset
export const config = {
  matcher: [
    "/((?!api/ingest/|api/auth/|test-ingest|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
