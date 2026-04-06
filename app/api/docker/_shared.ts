import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { hasPermission, type Permission } from "@/lib/auth/rbac";
import { getAuthUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { endpoints } from "@/lib/db/schema";
import { createDockerClient, DockerApiError } from "@/lib/docker/client";

type AuthUser = NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;

export type ResolvedEndpoint = {
  auth: AuthUser;
  endpoint: typeof endpoints.$inferSelect;
  docker: ReturnType<typeof createDockerClient>;
};

export function getClientIpAddress(request: Request): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }

  return request.headers.get("x-real-ip") ?? undefined;
}

export async function resolveEndpoint(
  endpointId: string,
  request: Request,
  permission?: Permission,
): Promise<{ error: NextResponse } | ResolvedEndpoint> {
  const auth = await getAuthUser(request);
  if (!auth) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (permission && !hasPermission(auth.role, permission)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const rows = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.id, endpointId))
    .limit(1);
  const endpoint = rows[0];

  if (!endpoint) {
    return {
      error: NextResponse.json(
        { error: "Endpoint not found" },
        { status: 404 },
      ),
    };
  }

  return {
    auth,
    endpoint,
    docker: createDockerClient(endpoint.url),
  };
}

export function toDockerErrorResponse(error: unknown): NextResponse {
  if (error instanceof DockerApiError) {
    return NextResponse.json(
      {
        error: error.dockerMessage || error.message,
      },
      { status: error.statusCode },
    );
  }

  console.error("Unhandled Docker route error", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function parseBooleanParam(
  value: string | null,
  defaultValue: boolean,
): boolean {
  if (value === null) {
    return defaultValue;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return defaultValue;
}

export function parseIntegerParam(
  value: string | null,
  defaultValue: number,
): number {
  if (value === null) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return defaultValue;
  }

  return parsed;
}
