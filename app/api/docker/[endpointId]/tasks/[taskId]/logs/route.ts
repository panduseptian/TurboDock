import { NextRequest, NextResponse } from "next/server";

import {
  resolveEndpoint,
  toDockerErrorResponse,
} from "@/app/api/docker/_shared";

type RouteParams = {
  params: Promise<{ endpointId: string; taskId: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteParams,
): Promise<NextResponse> {
  const { endpointId, taskId } = await context.params;
  const resolved = await resolveEndpoint(endpointId, request, "tasks.read");
  if ("error" in resolved) return resolved.error;

  const tail = request.nextUrl.searchParams.get("tail");
  const since = request.nextUrl.searchParams.get("since");
  const timestamps = request.nextUrl.searchParams.get("timestamps") === "true";

  try {
    const stream = await resolved.docker.getTaskLogs(taskId, {
      tail: tail ? Number.parseInt(tail, 10) : 10,
      since: since ? Number.parseInt(since, 10) : undefined,
      timestamps,
    });

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return toDockerErrorResponse(error);
  }
}
