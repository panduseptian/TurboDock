import { cookies } from "next/headers";

import { validateSession } from "@/lib/auth/session";

export async function GET(): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const auth = await validateSession(token);
  if (!auth) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  return Response.json(
    {
      user: {
        id: auth.user.id,
        username: auth.user.username,
        role: auth.user.role,
      },
    },
    { status: 200 },
  );
}
