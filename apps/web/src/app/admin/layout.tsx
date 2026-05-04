import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { AppShell } from "@/components/layout/AppShell";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get("financeapp_session")?.value;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
      if (payload.isAdmin === true) return <AppShell>{children}</AppShell>;
    } catch {
      // invalid token
    }
  }

  redirect("/dashboard");
}
