import { and, count, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/auth/rbac";
import { getAuthUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";

function parsePositiveInteger(
  value: string | null,
  defaultValue: number,
): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultValue;
  }

  return parsed;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "audit.read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const page = parsePositiveInteger(
    request.nextUrl.searchParams.get("page"),
    1,
  );
  const rawLimit = parsePositiveInteger(
    request.nextUrl.searchParams.get("limit"),
    50,
  );
  const limit = Math.min(rawLimit, 100);
  const offset = (page - 1) * limit;

  const action = request.nextUrl.searchParams.get("action") ?? undefined;
  const userId = request.nextUrl.searchParams.get("userId") ?? undefined;

  const whereClause = and(
    action ? eq(auditLogs.action, action) : undefined,
    userId ? eq(auditLogs.userId, userId) : undefined,
  );

  const rows = await db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      username: users.username,
      action: auditLogs.action,
      resource: auditLogs.resource,
      endpointId: auditLogs.endpointId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const totalRows = await db
    .select({ total: count() })
    .from(auditLogs)
    .where(whereClause);

  return NextResponse.json(
    {
      data: rows,
      total: totalRows[0]?.total ?? 0,
      page,
      limit,
    },
    { status: 200 },
  );
}
