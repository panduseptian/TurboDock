import { cookies } from "next/headers";

import { logAudit } from "@/lib/audit";
import {
  deleteSession,
  deleteSessionCookie,
  validateSession,
} from "@/lib/auth/session";

export async function POST(request: Request): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  let userId: string | undefined;

  if (token) {
    const auth = await validateSession(token);
    userId = auth?.user.id;
    await deleteSession(token);
  }

  cookieStore.set(deleteSessionCookie());

  await logAudit({
    userId,
    action: "user.logout",
    resource: "users",
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
  });

  return Response.json({ success: true }, { status: 200 });
}
