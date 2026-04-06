import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { endpoints } from "@/lib/db/schema";
import { createDockerClient, DockerApiError } from "@/lib/docker/client";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ endpointId: string }> },
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(authUser.role, "tasks.read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { endpointId } = await context.params;
  const endpointRows = await db
    .select({ url: endpoints.url })
    .from(endpoints)
    .where(eq(endpoints.id, endpointId))
    .limit(1);

  const endpoint = endpointRows[0];
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  const serviceId = request.nextUrl.searchParams.get("service")?.trim();
  const filters = serviceId ? { service: [serviceId] } : undefined;

  const docker = createDockerClient(endpoint.url);

  try {
    const tasks = await docker.listTasks(filters);
    return NextResponse.json(tasks, { status: 200 });
  } catch (error) {
    if (error instanceof DockerApiError) {
      return NextResponse.json(
        { error: error.dockerMessage },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Failed to list tasks" },
      { status: 500 },
    );
  }
}
