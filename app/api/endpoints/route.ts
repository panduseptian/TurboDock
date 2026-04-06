import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { getAuthUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { endpoints } from "@/lib/db/schema";

const createEndpointSchema = z.object({
  name: z.string().min(1),
  url: z.url(),
  type: z.enum(["standalone", "swarm"]).default("standalone"),
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

  const rows = await db.select().from(endpoints).orderBy(endpoints.name);
  return NextResponse.json(rows, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "endpoints.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createEndpointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const endpointId = nanoid();
  const now = new Date();

  await db.insert(endpoints).values({
    id: endpointId,
    name: parsed.data.name,
    url: parsed.data.url,
    type: parsed.data.type,
    createdAt: now,
    updatedAt: now,
  });

  const createdRows = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.id, endpointId))
    .limit(1);

  const created = createdRows[0];
  if (!created) {
    return NextResponse.json(
      { error: "Failed to create endpoint" },
      { status: 500 },
    );
  }

  await logAudit({
    userId: authUser.id,
    action: "endpoint.create",
    resource: `endpoint:${endpointId}`,
    endpointId,
    details: {
      name: created.name,
      url: created.url,
      type: created.type,
    },
    ipAddress: getClientIpAddress(request),
  });

  return NextResponse.json(created, { status: 201 });
}
