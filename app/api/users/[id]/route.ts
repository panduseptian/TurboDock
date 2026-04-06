import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import { hasPermission } from "@/lib/auth/rbac";
import { getAuthUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const patchUserSchema = z
  .object({
    username: z.string().min(3).max(50).optional(),
    password: z.string().min(8).optional(),
    role: z.enum(["admin", "devops", "support"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

function getClientIpAddress(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }

  return request.headers.get("x-real-ip") ?? undefined;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "users.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user, { status: 200 });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "users.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const targetRows = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  const targetUser = targetRows[0];
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (
    id === authUser.id &&
    parsed.data.role &&
    parsed.data.role !== authUser.role
  ) {
    return NextResponse.json(
      { error: "You cannot change your own role" },
      { status: 400 },
    );
  }

  if (parsed.data.username && parsed.data.username !== targetUser.username) {
    const matchedRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, parsed.data.username))
      .limit(1);

    if (matchedRows[0]) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 },
      );
    }
  }

  const passwordHash = parsed.data.password
    ? await hashPassword(parsed.data.password)
    : undefined;

  await db
    .update(users)
    .set({
      username: parsed.data.username,
      role: parsed.data.role,
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));

  const updatedRows = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  const updated = updatedRows[0];
  if (!updated) {
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }

  await logAudit({
    userId: authUser.id,
    action: "user.update",
    resource: `user:${id}`,
    details: {
      updatedFields: Object.keys(parsed.data),
    },
    ipAddress: getClientIpAddress(request),
  });

  return NextResponse.json(updated, { status: 200 });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "users.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (id === authUser.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 },
    );
  }

  const targetRows = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  const targetUser = targetRows[0];
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (targetUser.role === "admin") {
    const adminCountRows = await db
      .select({ total: count() })
      .from(users)
      .where(eq(users.role, "admin"));

    const adminCount = adminCountRows[0]?.total ?? 0;
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last admin user" },
        { status: 400 },
      );
    }
  }

  await db.delete(users).where(eq(users.id, id));

  await logAudit({
    userId: authUser.id,
    action: "user.delete",
    resource: `user:${id}`,
    ipAddress: getClientIpAddress(request),
  });

  return new NextResponse(null, { status: 204 });
}
