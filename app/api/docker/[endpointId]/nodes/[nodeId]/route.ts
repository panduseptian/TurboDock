import { NextRequest, NextResponse } from "next/server";

import {
  resolveEndpoint,
  toDockerErrorResponse,
  getClientIpAddress,
} from "@/app/api/docker/_shared";
import { logAudit } from "@/lib/audit";

type RouteParams = { params: Promise<{ endpointId: string; nodeId: string }> };

export async function GET(
  request: NextRequest,
  context: RouteParams,
): Promise<NextResponse> {
  const { endpointId, nodeId } = await context.params;
  const resolved = await resolveEndpoint(endpointId, request, "nodes.read");
  if ("error" in resolved) return resolved.error;

  try {
    const node = await resolved.docker.inspectNode(nodeId);
    return NextResponse.json(node);
  } catch (error) {
    return toDockerErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  context: RouteParams,
): Promise<NextResponse> {
  const { endpointId, nodeId } = await context.params;
  const resolved = await resolveEndpoint(endpointId, request, "nodes.manage");
  if ("error" in resolved) return resolved.error;

  try {
    const body = (await request.json()) as {
      version: number;
      spec: {
        Name?: string;
        Labels?: Record<string, string>;
        Role?: string;
        Availability?: string;
      };
    };

    if (typeof body.version !== "number") {
      return NextResponse.json(
        { error: "version is required" },
        { status: 400 },
      );
    }

    await resolved.docker.updateNode(
      nodeId,
      body.version,
      body.spec as import("@/lib/docker/types").NodeUpdateSpec,
    );

    await logAudit({
      userId: resolved.auth.id,
      action: "node.update",
      resource: `node:${nodeId}`,
      endpointId,
      ipAddress: getClientIpAddress(request),
      details: body.spec,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toDockerErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteParams,
): Promise<NextResponse> {
  const { endpointId, nodeId } = await context.params;
  const resolved = await resolveEndpoint(endpointId, request, "nodes.manage");
  if ("error" in resolved) return resolved.error;

  try {
    const force = request.nextUrl.searchParams.get("force") === "true";
    await resolved.docker.deleteNode(nodeId, force);

    await logAudit({
      userId: resolved.auth.id,
      action: "node.remove",
      resource: `node:${nodeId}`,
      endpointId,
      ipAddress: getClientIpAddress(request),
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toDockerErrorResponse(error);
  }
}
