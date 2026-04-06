import crypto from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import type { Role } from "@/lib/auth/rbac";

const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

type SessionUser = {
  id: string;
  username: string;
  role: Role;
};

export type SessionCookie = {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  expires?: Date;
};

function getClientIpAddress(request: Request): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }

  return request.headers.get("x-real-ip") ?? undefined;
}

export function getCookieValue(
  request: Request,
  cookieName: string,
): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [name, ...rawValue] = cookie.trim().split("=");
    if (name === cookieName) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}

export async function createSession(
  userId: string,
  request: Request,
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await db.insert(sessions).values({
    id: token,
    userId,
    expiresAt,
    createdAt: new Date(),
    ipAddress: getClientIpAddress(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return token;
}

export async function validateSession(token: string): Promise<{
  session: typeof sessions.$inferSelect;
  user: typeof users.$inferSelect;
} | null> {
  const rows = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, token)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  if (row.session.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, token));
    return null;
  }

  return row;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, token));
}

export function setSessionCookie(token: string): SessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function deleteSessionCookie(): SessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };
}

export async function getAuthUser(
  request: Request,
): Promise<SessionUser | null> {
  const token = getCookieValue(request, SESSION_COOKIE_NAME);
  if (!token) {
    return null;
  }

  const auth = await validateSession(token);
  if (!auth) {
    return null;
  }

  return {
    id: auth.user.id,
    username: auth.user.username,
    role: auth.user.role,
  };
}
