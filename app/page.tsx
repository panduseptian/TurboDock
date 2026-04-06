import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { count } from "drizzle-orm";

export default async function RootPage() {
  const usersCount = await db.select({ count: count() }).from(users);
  
  if (usersCount[0].count === 0) {
    redirect("/setup");
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  redirect("/dashboard");
}
