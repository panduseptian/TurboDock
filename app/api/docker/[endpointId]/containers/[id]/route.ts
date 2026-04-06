import { NextRequest, NextResponse } from "next/server";

import {
  getClientIpAddress,
  parseBooleanParam,
  resolveEndpoint,
  toDockerErrorResponse,
} from "@/app/api/docker/_shared";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: Request,
  context: { params: Promise<{ endpointId: string; id: string }> },
): Promise<NextResponse> {
  const { endpointId, id } = await context.params;
  const resolved = await resolveEndpoint(
    endpointId,
    request,
    "containers.read",
  );
  if ("error" in resolved) {
    return resolved.error;
  }

  try {
    const container = await resolved.docker.inspectContainer(id);
    return NextResponse.json(container, { status: 200 });
  } catch (error) {
    return toDockerErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ endpointId: string; id: string }> },
): Promise<NextResponse> {
  const { endpointId, id } = await context.params;
  const resolved = await resolveEndpoint(
    endpointId,
    request,
    "containers.manage",
  );
  if ("error" in resolved) {
    return resolved.error;
  }

  const force = parseBooleanParam(
    request.nextUrl.searchParams.get("force"),
    false,
  );

  try {
    await resolved.docker.removeContainer(id, force);
    await logAudit({
      userId: resolved.auth.id,
      action: "container.remove",
      resource: `container:${id}`,
      endpointId,
      details: {
        force,
      },
      ipAddress: getClientIpAddress(request),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return toDockerErrorResponse(error);
  }
}
