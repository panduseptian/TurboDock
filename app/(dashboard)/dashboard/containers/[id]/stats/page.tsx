"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useContainerStats } from "@/hooks/use-docker";
import { ContainerStatsChart } from "@/components/containers/container-stats-chart";
import { formatBytes, truncateId } from "@/lib/formatters";

type MetricSnapshot = {
  cpuPercent: number;
  memPercent: number;
  memUsage: number;
  memLimit: number;
  networkRx: number;
  networkTx: number;
  blockRead: number;
  blockWrite: number;
};

const HISTORY_LIMIT = 60;

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}

function pushHistory(target: { current: number[] }, value: number) {
  target.current.push(Number.isFinite(value) ? value : 0);
  if (target.current.length > HISTORY_LIMIT) {
    target.current.shift();
  }
}

export default function ContainerStatsPage() {
  const params = useParams();
  const containerId = params.id as string;

  const [endpointId, setEndpointId] = useState<string | null>(null);
  const [endpointResolved, setEndpointResolved] = useState(false);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memHistory, setMemHistory] = useState<number[]>([]);

  const cpuHistoryRef = useRef<number[]>([]);
  const memHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/session").then((r) => r.json()),
      fetch("/api/endpoints").then((r) => r.json()),
    ])
      .then(([, endpointsData]) => {
        const firstId = endpointsData?.[0]?.id;
        if (firstId) {
          setEndpointId(firstId);
        }
      })
      .finally(() => {
        setEndpointResolved(true);
      });
  }, []);

  const { data, error, loading, connected } = useContainerStats(
    endpointId,
    containerId,
  );

  const computeSnapshot = useCallback((): MetricSnapshot | null => {
    if (!data) {
      return null;
    }

    const cpuTotal = data.cpu_stats.cpu_usage.total_usage;
    const preCpuTotal = data.precpu_stats.cpu_usage.total_usage;
    const cpuDelta = cpuTotal - preCpuTotal;

    const systemCurrent = data.cpu_stats.system_cpu_usage ?? 0;
    const systemPrevious = data.precpu_stats.system_cpu_usage ?? 0;
    const systemDelta = systemCurrent - systemPrevious;

    const onlineCPUs = data.cpu_stats.online_cpus || 1;
    const cpuPercent =
      cpuDelta > 0 && systemDelta > 0
        ? (cpuDelta / systemDelta) * onlineCPUs * 100
        : 0;

    const memUsage = data.memory_stats.usage || 0;
    const memLimit = data.memory_stats.limit || 0;
    const memPercent = memLimit > 0 ? (memUsage / memLimit) * 100 : 0;

    const interfaces = Object.values(data.networks ?? {});
    const networkRx = interfaces.reduce(
      (sum, net) => sum + (net.rx_bytes || 0),
      0,
    );
    const networkTx = interfaces.reduce(
      (sum, net) => sum + (net.tx_bytes || 0),
      0,
    );

    const blockEntries = data.blkio_stats.io_service_bytes_recursive ?? [];
    const blockRead = blockEntries
      .filter((entry) => entry.op.toLowerCase() === "read")
      .reduce((sum, entry) => sum + (entry.value || 0), 0);
    const blockWrite = blockEntries
      .filter((entry) => entry.op.toLowerCase() === "write")
      .reduce((sum, entry) => sum + (entry.value || 0), 0);

    return {
      cpuPercent: clampPercent(cpuPercent),
      memPercent: clampPercent(memPercent),
      memUsage,
      memLimit,
      networkRx,
      networkTx,
      blockRead,
      blockWrite,
    };
  }, [data]);

  const snapshot = computeSnapshot() ?? {
    cpuPercent: 0,
    memPercent: 0,
    memUsage: 0,
    memLimit: 0,
    networkRx: 0,
    networkTx: 0,
    blockRead: 0,
    blockWrite: 0,
  };

  useEffect(() => {
    const nextSnapshot = computeSnapshot();
    if (!nextSnapshot) {
      return;
    }

    pushHistory(cpuHistoryRef, nextSnapshot.cpuPercent);
    pushHistory(memHistoryRef, nextSnapshot.memPercent);

    const timer = globalThis.setTimeout(() => {
      setCpuHistory([...cpuHistoryRef.current]);
      setMemHistory([...memHistoryRef.current]);
    }, 0);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [computeSnapshot]);

  const showEndpointLoading = !endpointResolved;
  const showNoEndpoint = endpointResolved && !endpointId;
  const showConnecting = endpointResolved && endpointId && loading;

  if (showEndpointLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <span>Containers</span>
          <span>/</span>
          <span className="font-mono">{truncateId(containerId)}</span>
          <span>/</span>
          <span className="text-on-surface">Stats</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {["cpu", "memory", "network", "block"].map((key) => (
            <div
              key={key}
              className="bg-surface-container rounded-xl shadow-ambient p-4 border-none"
            >
              <div className="animate-pulse space-y-3">
                <div className="h-3 w-24 bg-surface-container-high rounded" />
                <div className="h-8 w-20 bg-surface-container-high rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (showNoEndpoint) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <Link
            href="/dashboard/containers"
            className="hover:text-on-surface transition-colors"
          >
            Containers
          </Link>
          <span>/</span>
          <Link
            href={`/dashboard/containers/${containerId}`}
            className="hover:text-on-surface transition-colors font-mono"
          >
            {truncateId(containerId)}
          </Link>
          <span>/</span>
          <span className="text-on-surface">Stats</span>
        </div>

        <div className="bg-surface-container rounded-xl shadow-ambient p-6 border-none">
          <p className="text-error font-medium">No Endpoint Configured</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Add at least one Docker endpoint before viewing live stats.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <Link
          href="/dashboard/containers"
          className="hover:text-on-surface transition-colors"
        >
          Containers
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/containers/${containerId}`}
          className="hover:text-on-surface transition-colors font-mono"
        >
          {truncateId(containerId)}
        </Link>
        <span>/</span>
        <span className="text-on-surface">Stats</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-2">
        <div className="space-y-1">
          <h1 className="headline-md text-on-surface">Container Stats</h1>
          <p className="text-on-surface-variant text-sm">
            Live stream from Docker Engine
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/containers/${containerId}`}
            className="inline-flex h-10 items-center justify-center rounded-full bg-surface-container-high px-4 label-sm text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            Back to Container
          </Link>

          {connected ? (
            <Badge status="running" dot>
              Connected
            </Badge>
          ) : error ? (
            <Badge status="stopped" dot>
              Disconnected
            </Badge>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-1.5 label-sm text-on-surface">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Connecting</span>
            </div>
          )}
        </div>
      </div>

      {showConnecting && !data && (
        <div className="bg-surface-container rounded-xl shadow-ambient p-6 border-none">
          <p className="text-on-surface">Connecting to stats stream...</p>
        </div>
      )}

      {error && (
        <div className="bg-error-container rounded-xl shadow-ambient p-6 border-none">
          <p className="text-on-error-container font-medium">Stream Error</p>
          <p className="mt-2 text-sm text-on-error-container/80">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-surface-container rounded-xl shadow-ambient p-5 border-none">
          <p className="label-sm text-on-surface-variant mb-2">CPU Usage</p>
          <p className="display-sm text-primary font-mono">
            {snapshot.cpuPercent.toFixed(1)}%
          </p>
        </div>

        <div className="bg-surface-container rounded-xl shadow-ambient p-5 border-none">
          <p className="label-sm text-on-surface-variant mb-2">Memory</p>
          <p className="display-sm text-primary font-mono">
            {formatBytes(snapshot.memUsage)}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant font-mono">
            {snapshot.memPercent.toFixed(1)}% of{" "}
            {formatBytes(snapshot.memLimit)}
          </p>
        </div>

        <div className="bg-surface-container rounded-xl shadow-ambient p-5 border-none">
          <p className="label-sm text-on-surface-variant mb-2">Network I/O</p>
          <p className="text-lg text-primary font-mono">
            RX {formatBytes(snapshot.networkRx)}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant font-mono">
            TX {formatBytes(snapshot.networkTx)}
          </p>
        </div>

        <div className="bg-surface-container rounded-xl shadow-ambient p-5 border-none">
          <p className="label-sm text-on-surface-variant mb-2">Block I/O</p>
          <p className="text-lg text-primary font-mono">
            Read {formatBytes(snapshot.blockRead)}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant font-mono">
            Write {formatBytes(snapshot.blockWrite)}
          </p>
        </div>
      </div>

      <div className="bg-surface-container rounded-xl shadow-ambient p-5 border-none">
        <div className="mb-4">
          <h2 className="title-md text-on-surface">CPU Timeline</h2>
        </div>
        <div className="bg-surface-container-low rounded-lg p-3">
          <ContainerStatsChart
            data={cpuHistory}
            label="CPU Usage"
            value={`${snapshot.cpuPercent.toFixed(1)}%`}
            color="rgb(var(--primary))"
            height={160}
          />
        </div>
      </div>

      <div className="bg-surface-container rounded-xl shadow-ambient p-5 border-none">
        <div className="mb-4">
          <h2 className="title-md text-on-surface">Memory Timeline</h2>
        </div>
        <div className="bg-surface-container-low rounded-lg p-3">
          <ContainerStatsChart
            data={memHistory}
            label="Memory Usage"
            value={`${formatBytes(snapshot.memUsage)} / ${formatBytes(snapshot.memLimit)}`}
            color="rgb(var(--tertiary))"
            height={160}
          />
        </div>
      </div>
    </div>
  );
}
