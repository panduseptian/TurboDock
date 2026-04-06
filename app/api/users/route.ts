import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import { hasPermission } from "@/lib/auth/rbac";
import { getAuthUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  role: z.enum(["admin", "devops", "support"]),
});

function getClientIpAddress(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }

  return request.headers.get("x-real-ip") ?? undefined;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "users.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(users.username);

  return NextResponse.json(rows, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "users.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const existingRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, parsed.data.username))
    .limit(1);

  if (existingRows[0]) {
    return NextResponse.json(
      { error: "Username already exists" },
      { status: 409 },
    );
  }

  const userId = nanoid();
  const now = new Date();
  const passwordHash = await hashPassword(parsed.data.password);

  await db.insert(users).values({
    id: userId,
    username: parsed.data.username,
    passwordHash,
    role: parsed.data.role,
    createdAt: now,
    updatedAt: now,
  });

  const createdRows = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const created = createdRows[0];
  if (!created) {
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }

  await logAudit({
    userId: authUser.id,
    action: "user.create",
    resource: `user:${userId}`,
    details: {
      username: created.username,
      role: created.role,
    },
    ipAddress: getClientIpAddress(request),
  });

  return NextResponse.json(created, { status: 201 });
}
