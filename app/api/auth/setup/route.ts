import { nanoid } from "nanoid";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { cookies } from "next/headers";

const setupSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
});

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = setupSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const existingUsers = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .limit(1);

  if ((existingUsers[0]?.count ?? 0) > 0) {
    return Response.json({ error: "Setup already completed" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const userId = nanoid();

  await db.insert(users).values({
    id: userId,
    username: parsed.data.username,
    passwordHash,
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await logAudit({
    userId,
    action: "system.setup",
    resource: "users",
    details: { username: parsed.data.username, role: "admin" },
  });

  const token = await createSession(userId, request);
  const cookieStore = await cookies();
  cookieStore.set(setSessionCookie(token));

  return Response.json(
    {
      user: {
        id: userId,
        username: parsed.data.username,
        role: "admin",
      },
    },
    { status: 201 },
  );
}
