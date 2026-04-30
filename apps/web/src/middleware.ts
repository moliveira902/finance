import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/ingest", "/test-ingest"];

async function isValidSession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("financeapp_session")?.value;
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const authenticated = token ? await isValidSession(token) : false;

  if (!authenticated && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (authenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.ico|.*\\.png).*)"],
};
