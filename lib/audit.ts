import { nanoid } from "nanoid";

import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

type LogAuditParams = {
  userId?: string;
  action: string;
  resource?: string;
  endpointId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
};

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: nanoid(),
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      endpointId: params.endpointId,
      details: params.details ? JSON.stringify(params.details) : undefined,
      ipAddress: params.ipAddress,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to write audit log", {
      action: params.action,
      userId: params.userId,
      error,
    });
  }
}
