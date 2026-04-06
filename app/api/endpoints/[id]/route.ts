import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/auth/rbac";
import { getAuthUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { endpoints } from "@/lib/db/schema";

const patchEndpointSchema = z
  .object({
    name: z.string().min(1).optional(),
    url: z.url().optional(),
    type: z.enum(["standalone", "swarm"]).optional(),
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

  const { id } = await context.params;
  const rows = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.id, id))
    .limit(1);
  const endpoint = rows[0];
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  return NextResponse.json(endpoint, { status: 200 });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "endpoints.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchEndpointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const existingRows = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.id, id))
    .limit(1);
  if (!existingRows[0]) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  await db
    .update(endpoints)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(endpoints.id, id));

  const updatedRows = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.id, id))
    .limit(1);

  const updated = updatedRows[0];
  if (!updated) {
    return NextResponse.json(
      { error: "Failed to update endpoint" },
      { status: 500 },
    );
  }

  await logAudit({
    userId: authUser.id,
    action: "endpoint.update",
    resource: `endpoint:${id}`,
    endpointId: id,
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

  if (!hasPermission(authUser.role, "endpoints.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existingRows = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.id, id))
    .limit(1);
  if (!existingRows[0]) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  await db.delete(endpoints).where(eq(endpoints.id, id));

  await logAudit({
    userId: authUser.id,
    action: "endpoint.delete",
    resource: `endpoint:${id}`,
    endpointId: id,
    ipAddress: getClientIpAddress(request),
  });

  return new NextResponse(null, { status: 204 });
}
