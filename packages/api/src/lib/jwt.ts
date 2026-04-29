import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+";

export interface JwtPayload {
  sub: string;
  email: string;
  name: string | null;
  tenantId: string;
}

export function signToken(
  payload: JwtPayload,
  options: { rememberMe?: boolean } = {}
): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: options.rememberMe ? "30d" : "8h",
    algorithm: "HS256",
  });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
  return decoded as JwtPayload;
}
