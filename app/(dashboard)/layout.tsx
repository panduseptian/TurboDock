"use client";

import React, { useEffect, useState } from "react";
import {
  EndpointProvider,
  useEndpointContext,
} from "@/contexts/endpoint-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

type SessionData = {
  user: {
    id: string;
    username: string;
    role: string;
  };
} | null;

function DashboardShell({
  children,
  session,
}: Readonly<{
  children: React.ReactNode;
  session: SessionData;
}>) {
  const { selectedEndpoint } = useEndpointContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Sidebar
        selectedEndpointType={selectedEndpoint?.type ?? null}
        isAdmin={isAdmin}
      />

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button
            type="button"
            aria-label="Close mobile sidebar"
            className="fixed inset-0 glass"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[256px] flex flex-col">
            <Sidebar
              selectedEndpointType={selectedEndpoint?.type ?? null}
              isAdmin={isAdmin}
              isMobile={true}
            />
          </div>
        </div>
      )}

      <div className="md:pl-64 flex flex-col min-h-screen">
        <Topbar
          title="TurboDock"
          username={session?.user?.username}
          role={session?.user?.role}
          onToggleMobile={() => setMobileOpen((v) => !v)}
        />
        <main className="flex-1 pt-14 bg-surface-container transition-colors duration-300">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, setSession] = useState<SessionData>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => {
        if (!r.ok) throw new Error("Not authenticated");
        return r.json();
      })
      .then((data) => {
        if (!data || !data.user) throw new Error("Invalid session");
        setSession(data);
        setLoading(false);
      })
      .catch(() => {
        window.location.href = "/login";
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-16 h-16 rounded-xl bg-surface-container-high animate-pulse" />
      </div>
    );
  }

  return (
    <EndpointProvider>
      <DashboardShell session={session}>{children}</DashboardShell>
    </EndpointProvider>
  );
}
