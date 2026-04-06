"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Role } from "@/lib/auth/rbac";

export type SessionUser = {
  id: string;
  username: string;
  role: Role;
};

type SessionResponse = {
  user?: SessionUser;
};

export function useSession() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      setLoading(true);

      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (active) {
            setUser(null);
          }
          return;
        }

        const payload = (await response.json()) as SessionResponse;
        if (active) {
          setUser(payload.user ?? null);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSession();

    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  return { user, loading, logout };
}
