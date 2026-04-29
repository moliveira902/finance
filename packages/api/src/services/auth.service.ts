import { prisma } from "../lib/prisma.js";
import { signToken, JwtPayload } from "../lib/jwt.js";
import { AppError } from "../middleware/errorHandler.js";

const DEMO_USER = {
  username: "user",
  password: "pass",
  id: "00000000-0000-0000-0000-000000000002",
  tenantId: "00000000-0000-0000-0000-000000000001",
  auth0Id: "demo|user",
  email: "user@demo.financeapp.com.br",
  name: "Demo User",
};

export class AuthService {
  async login(body: { username: string; password: string; rememberMe: boolean }) {
    let userRecord: { id: string; tenantId: string; auth0Id: string; email: string; name: string | null } | null = null;

    // Demo credentials — replace with real validation (Auth0 / DB password hash) in production
    if (body.username === DEMO_USER.username && body.password === DEMO_USER.password) {
      try {
        userRecord = await prisma.user.findUnique({ where: { auth0Id: DEMO_USER.auth0Id } });
      } catch {
        // DB not available in demo mode — fall back to hardcoded payload
      }

      if (!userRecord) {
        userRecord = {
          id: DEMO_USER.id,
          tenantId: DEMO_USER.tenantId,
          auth0Id: DEMO_USER.auth0Id,
          email: DEMO_USER.email,
          name: DEMO_USER.name,
        };
      }
    }

    if (!userRecord) {
      throw new AppError(401, "UNAUTHORIZED", "Usuário ou senha incorretos");
    }

    const payload: JwtPayload = {
      sub: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      tenantId: userRecord.tenantId,
    };

    const token = signToken(payload, { rememberMe: body.rememberMe });
    const expiresAt = new Date(
      Date.now() + (body.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000)
    ).toISOString();

    return {
      token,
      expiresAt,
      user: { id: userRecord.id, email: userRecord.email, name: userRecord.name },
    };
  }

  async refresh(currentPayload: JwtPayload) {
    const token = signToken(currentPayload, { rememberMe: false });
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    return { token, expiresAt };
  }
}
