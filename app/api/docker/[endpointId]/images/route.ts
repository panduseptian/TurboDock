import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { endpoints } from "@/lib/db/schema";
import { createDockerClient, DockerApiError } from "@/lib/docker/client";

async function resolveEndpoint(endpointId: string) {
  const rows = await db
    .select({ id: endpoints.id, url: endpoints.url })
    .from(endpoints)
    .where(eq(endpoints.id, endpointId))
    .limit(1);

  return rows[0] ?? null;
}

function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof DockerApiError) {
    return NextResponse.json(
      { error: error.dockerMessage },
      { status: error.statusCode },
    );
  }

  console.error("Failed to list images", { error });
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ endpointId: string }> },
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "images.read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { endpointId } = await context.params;
  const endpoint = await resolveEndpoint(endpointId);
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  try {
    const docker = createDockerClient(endpoint.url);
    const images = await docker.listImages();
    return NextResponse.json(images, { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
