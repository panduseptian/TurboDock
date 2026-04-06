import { NextResponse } from "next/server";

import {
  resolveEndpoint,
  toDockerErrorResponse,
} from "@/app/api/docker/_shared";

export async function GET(
  request: Request,
  context: { params: Promise<{ endpointId: string }> },
): Promise<NextResponse> {
  const { endpointId } = await context.params;
  const resolved = await resolveEndpoint(endpointId, request);
  if ("error" in resolved) {
    return resolved.error;
  }

  try {
    const version = await resolved.docker.getVersion();
    return NextResponse.json(version, { status: 200 });
  } catch (error) {
    return toDockerErrorResponse(error);
  }
}
