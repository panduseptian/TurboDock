import { NextRequest } from "next/server";

import {
  parseBooleanParam,
  parseIntegerParam,
  resolveEndpoint,
  toDockerErrorResponse,
} from "@/app/api/docker/_shared";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ endpointId: string; id: string }> },
): Promise<Response> {
  const { endpointId, id } = await context.params;
  const resolved = await resolveEndpoint(
    endpointId,
    request,
    "containers.read",
  );
  if ("error" in resolved) {
    return resolved.error;
  }

  const tail = parseIntegerParam(request.nextUrl.searchParams.get("tail"), 10);
  const sinceRaw = request.nextUrl.searchParams.get("since");
  const since = sinceRaw ? Number.parseInt(sinceRaw, 10) : undefined;
  const timestamps = parseBooleanParam(
    request.nextUrl.searchParams.get("timestamps"),
    false,
  );

  try {
    const stream = await resolved.docker.getContainerLogs(id, {
      tail,
      since: Number.isNaN(since ?? Number.NaN) ? undefined : since,
      timestamps,
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    return toDockerErrorResponse(error);
  }
}
