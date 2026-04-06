import { NextRequest, NextResponse } from "next/server";

import {
  resolveEndpoint,
  toDockerErrorResponse,
  getClientIpAddress,
} from "@/app/api/docker/_shared";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { nanoid } from "nanoid";

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

    await resolved.docker.updateNode(nodeId, body.version, body.spec);

    await db.insert(auditLogs).values({
      id: nanoid(),
      userId: resolved.auth.id,
      action: "node.update",
      resourceType: "node",
      resourceId: nodeId,
      endpointId,
      ipAddress: getClientIpAddress(request),
      details: JSON.stringify(body.spec),
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

    await db.insert(auditLogs).values({
      id: nanoid(),
      userId: resolved.auth.id,
      action: "node.remove",
      resourceType: "node",
      resourceId: nodeId,
      endpointId,
      ipAddress: getClientIpAddress(request),
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toDockerErrorResponse(error);
  }
}
