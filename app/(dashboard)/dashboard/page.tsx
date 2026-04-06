"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/formatters";
import { useEndpointContext } from "@/contexts/endpoint-context";
import { Box, Layers, Network, HardDrive } from "lucide-react";

type DockerInfo = {
  ID: string;
  Name: string;
  ServerVersion: string;
  Containers: number;
  ContainersRunning: number;
  ContainersPaused: number;
  ContainersStopped: number;
  Images: number;
  NCPU: number;
  MemTotal: number;
  OperatingSystem: string;
  OSType: string;
  Architecture: string;
  Swarm: {
    LocalNodeState: string;
    Nodes?: number;
    Managers?: number;
  };
};

type DashboardState = {
  loading: boolean;
  error: string | null;
  info: DockerInfo | null;
  containerCount: number;
  imageCount: number;
  networkCount: number;
  volumeCount: number;
};

function StatCard({
  label,
  value,
  href,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  href?: string;
  sub?: string;
  icon: React.ElementType;
}) {
  const inner = (
    <Card
      className={`bg-surface-container shadow-ambient border-none rounded-xl ${href ? "cursor-pointer hover:bg-surface-container-high transition-colors" : ""}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="label-sm text-on-surface-variant mb-2">{label}</p>
            <p className="display-sm text-on-surface">{value}</p>
            {sub && (
              <p className="text-sm text-on-surface-variant mt-1">{sub}</p>
            )}
          </div>
          <div className="text-primary bg-primary/10 p-3 rounded-lg">
            <Icon size={24} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

function SkeletonCard() {
  return (
    <div className="bg-surface-container-high animate-pulse rounded-lg p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          <div className="h-4 w-20 bg-surface-container rounded" />
          <div className="h-10 w-16 bg-surface-container rounded" />
          <div className="h-3 w-28 bg-surface-container rounded mt-2" />
        </div>
        <div className="h-12 w-12 bg-surface-container rounded-lg" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const {
    selectedEndpoint,
    endpoints,
    loading: endpointLoading,
  } = useEndpointContext();
  const selectedEndpointId = selectedEndpoint?.id;

  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: null,
    info: null,
    containerCount: 0,
    imageCount: 0,
    networkCount: 0,
    volumeCount: 0,
  });

  const loadDashboard = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));

    if (!selectedEndpointId) {
      setState((s) => ({ ...s, loading: false, error: null }));
      return;
    }

    try {
      const [infoRes, containersRes, imagesRes, networksRes, volumesRes] =
        await Promise.all([
          fetch(`/api/docker/${selectedEndpointId}/info`)
            .then((r) => r.json())
            .catch(() => null),
          fetch(`/api/docker/${selectedEndpointId}/containers?all=true`)
            .then((r) => r.json())
            .catch(() => []),
          fetch(`/api/docker/${selectedEndpointId}/images`)
            .then((r) => r.json())
            .catch(() => []),
          fetch(`/api/docker/${selectedEndpointId}/networks`)
            .then((r) => r.json())
            .catch(() => []),
          fetch(`/api/docker/${selectedEndpointId}/volumes`)
            .then((r) => r.json())
            .catch(() => ({ Volumes: [] })),
        ]);

      setState({
        loading: false,
        error: null,
        info: infoRes,
        containerCount: Array.isArray(containersRes) ? containersRes.length : 0,
        imageCount: Array.isArray(imagesRes) ? imagesRes.length : 0,
        networkCount: Array.isArray(networksRes) ? networksRes.length : 0,
        volumeCount: Array.isArray(volumesRes?.Volumes)
          ? volumesRes.Volumes.length
          : 0,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error:
          err instanceof Error ? err.message : "Failed to load dashboard data",
      }));
    }
  }, [selectedEndpointId]);

  useEffect(() => {
    void loadDashboard();
  }, [selectedEndpointId, loadDashboard]);

  if (endpointLoading || state.loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="display-sm mb-2 text-on-surface">Dashboard</h1>
          <p className="text-on-surface-variant text-sm">
            Loading system overview...
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="display-sm mb-2 text-on-surface">Dashboard</h1>
        </div>
        <Card className="bg-surface-container shadow-ambient border-none rounded-xl">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-red-400 mb-4 font-semibold">
              Connection Error
            </p>
            <p className="text-on-surface-variant text-sm mb-6">
              {state.error}
            </p>
            <button
              onClick={loadDashboard}
              className="inline-flex items-center justify-center h-10 px-6 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (endpoints.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="display-sm mb-2 text-on-surface">Dashboard</h1>
        </div>
        <Card className="bg-surface-container shadow-ambient border-none rounded-xl">
          <CardContent className="p-12 text-center">
            <p className="text-lg text-on-surface-variant mb-2 font-medium">
              No Endpoints Configured
            </p>
            <p className="text-on-surface-variant text-sm mb-6">
              Add a Docker endpoint to start managing containers.
            </p>
            <Link
              href="/dashboard/endpoints"
              className="inline-flex items-center justify-center h-12 px-6 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Add Endpoint
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { info } = state;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="display-sm mb-2 text-on-surface">Dashboard</h1>
          <p className="text-on-surface-variant text-sm">
            System overview for{" "}
            <span className="text-on-surface font-medium">
              {selectedEndpoint?.name}
            </span>
          </p>
        </div>
        {info && (
          <div className="flex items-center gap-3">
            <Badge status="running" dot>
              Connected
            </Badge>
            <span className="text-sm text-on-surface-variant">
              v{info.ServerVersion}
            </span>
          </div>
        )}
      </div>

      {/* Resource counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Containers"
          value={state.containerCount}
          href="/dashboard/containers"
          icon={Box}
          sub={
            info
              ? `${info.ContainersRunning} running, ${info.ContainersStopped} stopped`
              : undefined
          }
        />
        <StatCard
          label="Images"
          value={state.imageCount}
          href="/dashboard/images"
          icon={Layers}
        />
        <StatCard
          label="Networks"
          value={state.networkCount}
          href="/dashboard/networks"
          icon={Network}
        />
        <StatCard
          label="Volumes"
          value={state.volumeCount}
          href="/dashboard/volumes"
          icon={HardDrive}
        />
      </div>

      {/* System info */}
      {info && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-surface-container-high border-none rounded-xl">
            <CardHeader>
              <h2 className="headline-md text-on-surface">Host Info</h2>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label="Hostname" value={info.Name} />
              <InfoRow label="OS" value={info.OperatingSystem} />
              <InfoRow
                label="Architecture"
                value={`${info.OSType}/${info.Architecture}`}
              />
              <InfoRow label="CPUs" value={String(info.NCPU)} />
              <InfoRow label="Memory" value={formatBytes(info.MemTotal)} />
              <InfoRow label="Docker Version" value={info.ServerVersion} />
            </CardContent>
          </Card>

          <Card className="bg-surface-container-high border-none rounded-xl">
            <CardHeader>
              <h2 className="headline-md text-on-surface">Cluster Status</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-on-surface-variant">
                  Swarm State
                </span>
                <Badge
                  status={
                    info.Swarm.LocalNodeState === "active"
                      ? "running"
                      : "stopped"
                  }
                  dot
                >
                  {info.Swarm.LocalNodeState === "active"
                    ? "Active"
                    : "Inactive"}
                </Badge>
              </div>
              {info.Swarm.LocalNodeState === "active" && (
                <div className="space-y-1">
                  <InfoRow
                    label="Nodes"
                    value={String(info.Swarm.Nodes ?? 0)}
                  />
                  <InfoRow
                    label="Managers"
                    value={String(info.Swarm.Managers ?? 0)}
                  />
                </div>
              )}
              <div className="pt-2">
                <InfoRow label="Endpoints" value={String(endpoints.length)} />
              </div>
              <div className="space-y-2">
                {endpoints.map((ep) => (
                  <div
                    key={ep.id}
                    className="flex items-center justify-between py-2 px-3 bg-surface-container rounded-lg"
                  >
                    <span className="text-sm text-on-surface">{ep.name}</span>
                    <Badge status={ep.type === "swarm" ? "created" : "default"}>
                      {ep.type === "swarm" ? "Swarm" : "Standalone"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface-container last:border-0">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="text-sm text-on-surface font-medium">{value}</span>
    </div>
  );
}
