import { Hono, type Context } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { sessions, users } from "../db/schema.js";
import { newId, newSessionToken, isoInDays } from "../lib/ids.js";
import { requireAuth, SESSION_COOKIE, SESSION_TTL_DAYS } from "../middleware/auth.js";

const credentialsSchema = z.object({
  username: z.string().min(2).max(32),
  password: z.string().min(6).max(128),
});

export const authRoutes = new Hono();

authRoutes.post("/register", async (c) => {
  const parsed = credentialsSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid credentials", details: parsed.error.flatten() }, 400);
  }
  const { username, password } = parsed.data;
  const existing = db.select().from(users).where(eq(users.username, username)).get();
  if (existing) {
    return c.json({ error: "Username already taken" }, 409);
  }
  const id = newId();
  db.insert(users)
    .values({ id, username, passwordHash: bcrypt.hashSync(password, 10) })
    .run();
  return login(c, id, username);
});

authRoutes.post("/login", async (c) => {
  const parsed = credentialsSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid credentials" }, 400);
  }
  const { username, password } = parsed.data;
  const user = db.select().from(users).where(eq(users.username, username)).get();
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return c.json({ error: "Invalid username or password" }, 401);
  }
  return login(c, user.id, user.username);
});

authRoutes.get("/me", requireAuth, (c) => {
  return c.json({ user: c.get("user") });
});

authRoutes.post("/logout", (c) => {
  const token = c.req.header("cookie")?.match(/session=([^;]+)/)?.[1];
  if (token) {
    db.delete(sessions).where(eq(sessions.token, token)).run();
  }
  deleteCookie(c, SESSION_COOKIE);
  return c.json({ ok: true });
});

function login(c: Context, userId: string, username: string) {
  const token = newSessionToken();
  db.insert(sessions)
    .values({
      token,
      userId,
      expiresAt: isoInDays(SESSION_TTL_DAYS),
    })
    .run();
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
  return c.json({ user: { id: userId, username } });
}
