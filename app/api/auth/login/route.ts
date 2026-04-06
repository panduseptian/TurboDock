import { eq } from "drizzle-orm";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { cookies } from "next/headers";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const matchedUsers = await db
    .select()
    .from(users)
    .where(eq(users.username, parsed.data.username))
    .limit(1);

  const user = matchedUsers[0];
  if (!user) {
    return Response.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const isValid = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!isValid) {
    return Response.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSession(user.id, request);
  const cookieStore = await cookies();
  cookieStore.set(setSessionCookie(token));

  await logAudit({
    userId: user.id,
    action: "user.login",
    resource: "users",
    details: { username: user.username },
  });

  return Response.json(
    {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    },
    { status: 200 },
  );
}
