import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/auth/rbac";
import { getAuthUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { endpoints } from "@/lib/db/schema";
import { createDockerClient, DockerApiError } from "@/lib/docker/client";

const createVolumeSchema = z.object({
  Name: z.string().min(1),
  Driver: z.string().min(1).optional(),
});

async function resolveEndpoint(endpointId: string) {
  const rows = await db
    .select({ id: endpoints.id, url: endpoints.url })
    .from(endpoints)
    .where(eq(endpoints.id, endpointId))
    .limit(1);

  return rows[0] ?? null;
}

function getClientIpAddress(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }

  return request.headers.get("x-real-ip") ?? undefined;
}

function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof DockerApiError) {
    return NextResponse.json(
      { error: error.dockerMessage },
      { status: error.statusCode },
    );
  }

  console.error("Docker volume request failed", { error });
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ endpointId: string }> },
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "volumes.read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { endpointId } = await context.params;
  const endpoint = await resolveEndpoint(endpointId);
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  try {
    const docker = createDockerClient(endpoint.url);
    const volumes = await docker.listVolumes();
    return NextResponse.json(volumes, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ endpointId: string }> },
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "volumes.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createVolumeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { endpointId } = await context.params;
  const endpoint = await resolveEndpoint(endpointId);
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  try {
    const docker = createDockerClient(endpoint.url);
    const volume = await docker.createVolume(parsed.data);

    await logAudit({
      userId: authUser.id,
      action: "volume.create",
      resource: `volume:${volume.Name}`,
      endpointId,
      details: parsed.data,
      ipAddress: getClientIpAddress(request),
    });

    return NextResponse.json(volume, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
