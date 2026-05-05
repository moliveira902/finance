import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getSessionUser } from "@/lib/sessionUser";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "financeapp-local-dev-secret-change-in-prod",
);

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const token = await new SignJWT({ userId: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(SECRET);

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "FinanceAppBot";
  const deepLink    = `https://t.me/${botUsername}?start=connect_${token}`;

  return NextResponse.json({ deepLink });
}
