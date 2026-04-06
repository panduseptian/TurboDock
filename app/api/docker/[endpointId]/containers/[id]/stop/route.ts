import { NextResponse } from "next/server";

import {
  getClientIpAddress,
  resolveEndpoint,
  toDockerErrorResponse,
} from "@/app/api/docker/_shared";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
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

  try {
    await resolved.docker.stopContainer(id);
    await logAudit({
      userId: resolved.auth.id,
      action: "container.stop",
      resource: `container:${id}`,
      endpointId,
      ipAddress: getClientIpAddress(request),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return toDockerErrorResponse(error);
  }
}
