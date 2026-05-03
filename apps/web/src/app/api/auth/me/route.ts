import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

export async function GET() {
  const token = cookies().get("financeapp_session")?.value;
  if (!token) return NextResponse.json({ user: null });

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
    return NextResponse.json({
      user: {
        id:      payload.sub,
        email:   payload.email,
        name:    payload.name,
        isAdmin: payload.isAdmin ?? false,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
