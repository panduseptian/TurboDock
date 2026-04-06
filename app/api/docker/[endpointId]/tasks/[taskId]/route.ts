import { NextRequest, NextResponse } from "next/server";

import {
  resolveEndpoint,
  toDockerErrorResponse,
} from "@/app/api/docker/_shared";

type RouteParams = { params: Promise<{ endpointId: string; taskId: string }> };

export async function GET(
  request: NextRequest,
  context: RouteParams,
): Promise<NextResponse> {
  const { endpointId, taskId } = await context.params;
  const resolved = await resolveEndpoint(endpointId, request, "tasks.read");
  if ("error" in resolved) return resolved.error;

  try {
    const task = await resolved.docker.inspectTask(taskId);
    return NextResponse.json(task);
  } catch (error) {
    return toDockerErrorResponse(error);
  }
}
