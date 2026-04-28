import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (username === "user" && password === "pass") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("financeapp_session", "authenticated", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  return NextResponse.json(
    { error: "Usuário ou senha incorretos" },
    { status: 401 }
  );
}
