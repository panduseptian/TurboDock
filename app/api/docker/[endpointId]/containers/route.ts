import { NextRequest, NextResponse } from "next/server";

import {
  getClientIpAddress,
  parseBooleanParam,
  resolveEndpoint,
  toDockerErrorResponse,
} from "@/app/api/docker/_shared";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ endpointId: string }> },
): Promise<NextResponse> {
  const { endpointId } = await context.params;
  const resolved = await resolveEndpoint(
    endpointId,
    request,
    "containers.read",
  );
  if ("error" in resolved) {
    return resolved.error;
  }

  const all = parseBooleanParam(request.nextUrl.searchParams.get("all"), true);

  try {
    const containers = await resolved.docker.listContainers(all);
    return NextResponse.json(containers, { status: 200 });
  } catch (error) {
    return toDockerErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ endpointId: string }> },
): Promise<NextResponse> {
  const { endpointId } = await context.params;
  const resolved = await resolveEndpoint(
    endpointId,
    request,
    "containers.manage",
  );
  if ("error" in resolved) {
    return resolved.error;
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const image = (body as Record<string, unknown>).Image;
  if (typeof image !== "string" || image.trim().length === 0) {
    return NextResponse.json({ error: "Image is required" }, { status: 400 });
  }

  try {
    const created = await resolved.docker.createContainer(body);

    await logAudit({
      userId: resolved.auth.id,
      action: "container.create",
      resource: `container:${created.Id}`,
      endpointId,
      details: {
        containerId: created.Id,
        image,
        name: (body as Record<string, unknown>).name,
      },
      ipAddress: getClientIpAddress(request),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return toDockerErrorResponse(error);
  }
}
