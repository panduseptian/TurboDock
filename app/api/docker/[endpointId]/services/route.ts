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
  context: { params: Promise<{ endpointId: string }> },
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "services.read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { endpointId } = await context.params;
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
    const services = await docker.listServices();
    return NextResponse.json(services, { status: 200 });
  } catch (error) {
    if (error instanceof DockerApiError) {
      return NextResponse.json(
        { error: error.dockerMessage },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Failed to list services" },
      { status: 500 },
    );
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

  if (!hasPermission(authUser.role, "services.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const serviceName =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).Name
      : undefined;
  const isValidBody =
    typeof body === "object" &&
    body !== null &&
    typeof serviceName === "string" &&
    serviceName.trim().length > 0;

  if (!isValidBody) {
    return NextResponse.json(
      { error: "Invalid request body: service Name is required" },
      { status: 400 },
    );
  }

  const { endpointId } = await context.params;
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
    const created = await docker.createService(body as Record<string, unknown>);

    await logAudit({
      userId: authUser.id,
      action: "service.create",
      resource: `service:${created.ID}`,
      endpointId,
      details: {
        serviceId: created.ID,
        name: serviceName,
      },
      ipAddress: getClientIpAddress(request),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof DockerApiError) {
      return NextResponse.json(
        { error: error.dockerMessage },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 },
    );
  }
}
