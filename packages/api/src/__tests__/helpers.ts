import { signToken } from "../lib/jwt.js";

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000002";
export const DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export function makeAuthHeader() {
  const token = signToken({
    sub: DEMO_USER_ID,
    email: "user@demo.test",
    name: "Test User",
    tenantId: DEMO_TENANT_ID,
  });
  return `Bearer ${token}`;
}
