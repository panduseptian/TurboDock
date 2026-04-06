import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/auth/rbac";
import { getAuthUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { endpoints } from "@/lib/db/schema";
import { createDockerClient, DockerApiError } from "@/lib/docker/client";

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

function parseForce(request: NextRequest): boolean {
  const force = request.nextUrl.searchParams.get("force");
  return force === "1" || force === "true";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ endpointId: string; name: string }> },
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "volumes.read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { endpointId, name } = await context.params;
  const endpoint = await resolveEndpoint(endpointId);
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  try {
    const docker = createDockerClient(endpoint.url);
    const volume = await docker.inspectVolume(name);
    return NextResponse.json(volume, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ endpointId: string; name: string }> },
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "volumes.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { endpointId, name } = await context.params;
  const endpoint = await resolveEndpoint(endpointId);
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  const force = parseForce(request);

  try {
    const docker = createDockerClient(endpoint.url);
    await docker.removeVolume(name, force);

    await logAudit({
      userId: authUser.id,
      action: "volume.remove",
      resource: `volume:${name}`,
      endpointId,
      details: { force },
      ipAddress: getClientIpAddress(request),
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
