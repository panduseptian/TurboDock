import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { getAuthUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { endpoints } from "@/lib/db/schema";
import { createDockerClient, DockerApiError } from "@/lib/docker/client";

function getClientIpAddress(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }

  return request.headers.get("x-real-ip") ?? undefined;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ endpointId: string; id: string }> },
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "services.read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { endpointId, id } = await context.params;
  const endpointRows = await db
    .select({ url: endpoints.url })
    .from(endpoints)
    .where(eq(endpoints.id, endpointId))
    .limit(1);

  const endpoint = endpointRows[0];
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  const docker = createDockerClient(endpoint.url);

  try {
    const service = await docker.inspectService(id);
    return NextResponse.json(service, { status: 200 });
  } catch (error) {
    if (error instanceof DockerApiError) {
      return NextResponse.json(
        { error: error.dockerMessage },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Failed to inspect service" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ endpointId: string; id: string }> },
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "services.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const version = (body as { version?: unknown } | null)?.version;
  const spec = (body as { spec?: unknown } | null)?.spec;

  const hasValidVersion =
    typeof version === "number" && Number.isFinite(version) && version >= 0;
  const hasValidSpec =
    typeof spec === "object" && spec !== null && !Array.isArray(spec);

  if (!hasValidVersion || !hasValidSpec) {
    return NextResponse.json(
      { error: "Invalid request body: version and spec are required" },
      { status: 400 },
    );
  }

  const { endpointId, id } = await context.params;
  const endpointRows = await db
    .select({ url: endpoints.url })
    .from(endpoints)
    .where(eq(endpoints.id, endpointId))
    .limit(1);

  const endpoint = endpointRows[0];
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  const docker = createDockerClient(endpoint.url);

  try {
    await docker.updateService(id, version, spec as Record<string, unknown>);

    await logAudit({
      userId: authUser.id,
      action: "service.update",
      resource: `service:${id}`,
      endpointId,
      details: {
        serviceId: id,
        version,
      },
      ipAddress: getClientIpAddress(request),
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof DockerApiError) {
      return NextResponse.json(
        { error: error.dockerMessage },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ endpointId: string; id: string }> },
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "services.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { endpointId, id } = await context.params;
  const endpointRows = await db
    .select({ url: endpoints.url })
    .from(endpoints)
    .where(eq(endpoints.id, endpointId))
    .limit(1);

  const endpoint = endpointRows[0];
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  const docker = createDockerClient(endpoint.url);

  try {
    await docker.removeService(id);

    await logAudit({
      userId: authUser.id,
      action: "service.remove",
      resource: `service:${id}`,
      endpointId,
      details: {
        serviceId: id,
      },
      ipAddress: getClientIpAddress(request),
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof DockerApiError) {
      return NextResponse.json(
        { error: error.dockerMessage },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Failed to remove service" },
      { status: 500 },
    );
  }
}
