import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { sessions, users } from "../db/schema.js";
import { getCookie } from "hono/cookie";

export const SESSION_COOKIE = "session";
export const SESSION_TTL_DAYS = 30;

export type AuthUser = {
  id: string;
  username: string;
};

export const requireAuth = createMiddleware<{
  Variables: { user: AuthUser };
}>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  const session = db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get();
  if (!session || new Date(session.expiresAt) < new Date()) {
    return c.json({ error: "Session expired" }, 401);
  }
  const user = db.select().from(users).where(eq(users.id, session.userId)).get();
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }
  c.set("user", { id: user.id, username: user.username });
  await next();
});
