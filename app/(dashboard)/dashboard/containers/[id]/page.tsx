"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toast } from "@/components/ui/toast";
import { Play, RotateCw, Square, Trash2, X } from "@/components/ui/icons";
import { useEndpointContext } from "@/contexts/endpoint-context";
import { timeAgo, truncateId } from "@/lib/formatters";

type ContainerDetail = {
  Id: string;
  Name: string;
  Created: string;
  Image: string;
  Config: {
    Hostname: string;
    User: string;
    Image: string;
    Env: string[];
    Cmd: string[] | null;
    Entrypoint: string[] | null;
    WorkingDir: string;
    Labels: Record<string, string>;
    Tty: boolean;
    OpenStdin: boolean;
  };
  HostConfig: {
    NetworkMode: string;
    RestartPolicy: { Name: string; MaximumRetryCount: number };
    Privileged?: boolean;
    ReadonlyRootfs?: boolean;
  };
  NetworkSettings: {
    IPAddress: string;
    Gateway: string;
    Networks: Record<
      string,
      {
        IPAddress?: string;
        Gateway?: string;
        MacAddress?: string;
      }
    >;
  };
  State: {
    Status: string;
    Running: boolean;
    Paused: boolean;
    ExitCode: number;
    StartedAt: string;
    FinishedAt: string;
    Health?: {
      Status: string;
      FailingStreak: number;
    };
  };
  Mounts: Array<{
    Type: string;
    Source: string;
    Destination: string;
    Mode: string;
    RW: boolean;
  }>;
};

type ToastState = {
  message: string;
  type: "success" | "error" | "info";
} | null;

type ToastVariant = NonNullable<ToastState>["type"];

const TABS = ["overview", "env", "mounts", "network", "logs"] as const;
type Tab = (typeof TABS)[number];

function statusBadge(
  state: string,
): "running" | "stopped" | "paused" | "created" | "default" {
  switch (state) {
    case "running":
      return "running";
    case "exited":
    case "dead":
      return "stopped";
    case "paused":
      return "paused";
    case "created":
      return "created";
    default:
      return "default";
  }
}

export default function ContainerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const containerId = params.id as string;
  const { selectedEndpoint } = useEndpointContext();

  const [container, setContainer] = useState<ContainerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("support");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<string>("");
  const [logsLoading, setLogsLoading] = useState(false);
  const logsRef = useRef<HTMLPreElement>(null);

  const fetchContainer = useCallback(
    (eid: string) => {
      setLoading(true);
      setError(null);
      fetch(`/api/docker/${eid}/containers/${containerId}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => setContainer(data))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    },
    [containerId],
  );

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((sessionData) => {
        if (sessionData?.user) setUserRole(sessionData.user.role);
      });
  }, []);

  useEffect(() => {
    if (selectedEndpoint?.id) {
      fetchContainer(selectedEndpoint.id);
      return;
    }

    setContainer(null);
    setLoading(false);
    setError("No endpoints configured");
  }, [selectedEndpoint?.id, fetchContainer]);

  const fetchLogs = useCallback(async () => {
    if (!selectedEndpoint?.id) return;
    setLogsLoading(true);
    try {
      const res = await fetch(
        `/api/docker/${selectedEndpoint.id}/containers/${containerId}/logs?tail=500&timestamps=true`,
      );
      if (!res.ok) throw new Error("Failed to fetch logs");
      const text = await res.text();
      setLogs(text);
      requestAnimationFrame(() => {
        if (logsRef.current) {
          logsRef.current.scrollTop = logsRef.current.scrollHeight;
        }
      });
    } catch {
      setLogs("Failed to load logs.");
    } finally {
      setLogsLoading(false);
    }
  }, [selectedEndpoint?.id, containerId]);

  useEffect(() => {
    if (activeTab === "logs" && !logs && selectedEndpoint?.id) {
      fetchLogs();
    }
  }, [activeTab, logs, selectedEndpoint?.id, fetchLogs]);

  const showToast = (message: string, type: ToastVariant = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const containerAction = async (action: "start" | "stop" | "restart") => {
    if (!selectedEndpoint?.id) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/docker/${selectedEndpoint.id}/containers/${containerId}/${action}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        showToast(err.error || `Failed to ${action}`, "error");
      } else {
        showToast(`Container ${action}ed`, "success");
        fetchContainer(selectedEndpoint.id);
      }
    } catch {
      showToast(`Failed to ${action} container`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEndpoint?.id) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/docker/${selectedEndpoint.id}/containers/${containerId}?force=true`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        showToast(err.error || "Failed to remove container", "error");
      } else {
        showToast("Container removed", "success");
        router.push("/dashboard/containers");
      }
    } catch {
      showToast("Failed to remove container", "error");
    } finally {
      setActionLoading(false);
      setDeleteDialog(false);
    }
  };

  const canManage = userRole === "admin" || userRole === "devops";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 label-sm text-on-surface-variant">
          <Link
            href="/dashboard/containers"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            Containers
          </Link>
          <span>/</span>
          <span className="text-on-surface-variant font-mono">
            {truncateId(containerId)}
          </span>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container rounded-xl shadow-ambient p-6"
            >
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-32 bg-surface-container-high rounded" />
                <div className="h-3 w-48 bg-surface-container-highest rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !container) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 label-sm text-on-surface-variant">
          <Link
            href="/dashboard/containers"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            Containers
          </Link>
          <span>/</span>
          <span className="text-on-surface-variant font-mono">
            {truncateId(containerId)}
          </span>
        </div>
        <div className="bg-surface-container rounded-xl shadow-ambient p-12 text-center">
          <p className="font-mono text-sm text-error mb-4">
            CONTAINER_NOT_FOUND
          </p>
          <p className="text-on-surface-variant body-sm mb-6">
            {error || "Container does not exist or has been removed."}
          </p>
          <Link
            href="/dashboard/containers"
            className="inline-flex items-center justify-center h-10 px-6 text-sm text-on-surface bg-surface-container-high rounded hover:bg-surface-container-highest transition-colors"
          >
            Back to List
          </Link>
        </div>
      </div>
    );
  }

  const name = container.Name.replace(/^\//, "");
  const isRunning = container.State.Running;
  const isStopped =
    container.State.Status === "exited" || container.State.Status === "dead";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 label-sm text-on-surface-variant">
        <Link
          href="/dashboard/containers"
          className="text-primary hover:text-primary/80 transition-colors"
        >
          Containers
        </Link>
        <span>/</span>
        <span className="text-on-surface-variant font-mono">{name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="headline-md text-on-surface">{name}</h1>
          <Badge status={statusBadge(container.State.Status)} dot>
            {container.State.Status.charAt(0).toUpperCase() +
              container.State.Status.slice(1)}
          </Badge>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            {isStopped && (
              <Button
                variant="secondary"
                size="sm"
                disabled={actionLoading}
                onClick={() => containerAction("start")}
              >
                <Play className="mr-1.5" />
                Start
              </Button>
            )}
            {isRunning && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => containerAction("stop")}
                >
                  <Square className="mr-1.5" />
                  Stop
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => containerAction("restart")}
                >
                  <RotateCw className="mr-1.5" />
                  Restart
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={actionLoading}
              onClick={() => setDeleteDialog(true)}
              className="text-error hover:text-error/80 hover:bg-error/10"
            >
              <Trash2 className="mr-1.5" />
              Remove
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-surface-container rounded-lg w-max">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded-md transition-colors capitalize ${
              activeTab === tab
                ? "bg-surface-container-highest text-primary font-medium shadow-sm"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-surface-container rounded-xl shadow-ambient p-6">
            <h2 className="text-lg font-medium text-on-surface mb-4">
              Container Info
            </h2>
            <div className="space-y-3">
              <InfoRow label="ID" value={truncateId(container.Id)} mono />
              <InfoRow label="Image" value={container.Config.Image} mono />
              <InfoRow label="Created" value={timeAgo(container.Created)} />
              <InfoRow
                label="Command"
                value={container.Config.Cmd?.join(" ") || "—"}
                mono
              />
              <InfoRow
                label="Entrypoint"
                value={container.Config.Entrypoint?.join(" ") || "—"}
                mono
              />
              <InfoRow
                label="Working Dir"
                value={container.Config.WorkingDir || "/"}
                mono
              />
              <InfoRow label="User" value={container.Config.User || "root"} />
              <InfoRow
                label="Hostname"
                value={container.Config.Hostname}
                mono
              />
              <InfoRow
                label="TTY"
                value={container.Config.Tty ? "Yes" : "No"}
              />
            </div>
          </div>

          <div className="bg-surface-container rounded-xl shadow-ambient p-6">
            <h2 className="text-lg font-medium text-on-surface mb-4">State</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-1 gap-4">
                <span className="label-sm text-on-surface-variant">Status</span>
                <Badge status={statusBadge(container.State.Status)} dot>
                  {container.State.Status.charAt(0).toUpperCase() +
                    container.State.Status.slice(1)}
                </Badge>
              </div>
              <InfoRow
                label="Started"
                value={
                  container.State.StartedAt
                    ? timeAgo(container.State.StartedAt)
                    : "—"
                }
              />
              <InfoRow
                label="Finished"
                value={
                  container.State.FinishedAt &&
                  container.State.FinishedAt !== "0001-01-01T00:00:00Z"
                    ? timeAgo(container.State.FinishedAt)
                    : "—"
                }
              />
              <InfoRow
                label="Exit Code"
                value={String(container.State.ExitCode)}
              />
              <InfoRow
                label="Restart Policy"
                value={`${container.HostConfig.RestartPolicy.Name} (max: ${container.HostConfig.RestartPolicy.MaximumRetryCount})`}
              />
              <InfoRow
                label="Network Mode"
                value={container.HostConfig.NetworkMode}
              />
              <InfoRow
                label="Privileged"
                value={container.HostConfig.Privileged ? "Yes" : "No"}
              />
              {container.State.Health && (
                <>
                  <InfoRow
                    label="Health"
                    value={container.State.Health.Status}
                  />
                  <InfoRow
                    label="Failing Streak"
                    value={String(container.State.Health.FailingStreak)}
                  />
                </>
              )}
            </div>
          </div>

          {/* Labels */}
          {container.Config.Labels &&
            Object.keys(container.Config.Labels).length > 0 && (
              <div className="bg-surface-container rounded-xl shadow-ambient p-6 lg:col-span-2">
                <h2 className="text-lg font-medium text-on-surface mb-4">
                  Labels
                </h2>
                <div className="space-y-1 max-h-64 overflow-y-auto bg-surface-container-high rounded-lg p-4">
                  {Object.entries(container.Config.Labels).map(([k, v]) => (
                    <div key={k} className="flex gap-4 py-1.5">
                      <span className="label-sm text-on-surface-variant shrink-0 min-w-[200px] break-all">
                        {k}
                      </span>
                      <span className="body-sm text-on-surface font-mono break-all">
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {activeTab === "env" && (
        <div className="bg-surface-container rounded-xl shadow-ambient p-6">
          <h2 className="text-lg font-medium text-on-surface mb-4">
            Environment Variables
          </h2>
          <div>
            {container.Config.Env && container.Config.Env.length > 0 ? (
              <div className="space-y-1 max-h-[500px] overflow-y-auto bg-surface-container-high rounded-lg p-4">
                {container.Config.Env.map((env, i) => {
                  const eqIdx = env.indexOf("=");
                  const key = eqIdx > -1 ? env.slice(0, eqIdx) : env;
                  const val = eqIdx > -1 ? env.slice(eqIdx + 1) : "";
                  return (
                    <div key={i} className="flex gap-4 py-2">
                      <span className="label-sm text-on-surface-variant font-mono shrink-0 min-w-[180px]">
                        {key}
                      </span>
                      <span className="body-sm text-on-surface font-mono break-all">
                        {val}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-on-surface-variant body-sm text-center py-8">
                No environment variables
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === "mounts" && (
        <div className="bg-surface-container rounded-xl shadow-ambient p-6">
          <h2 className="text-lg font-medium text-on-surface mb-4">Mounts</h2>
          <div>
            {container.Mounts && container.Mounts.length > 0 ? (
              <div className="space-y-3">
                {container.Mounts.map((m, i) => (
                  <div
                    key={i}
                    className="p-4 bg-surface-container-high rounded-lg space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge status="default">{m.Type}</Badge>
                      <Badge status={m.RW ? "running" : "paused"}>
                        {m.RW ? "RW" : "RO"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="label-sm text-on-surface-variant">
                          Source:{" "}
                        </span>
                        <span className="body-sm text-on-surface font-mono break-all">
                          {m.Source}
                        </span>
                      </div>
                      <div>
                        <span className="label-sm text-on-surface-variant">
                          Destination:{" "}
                        </span>
                        <span className="body-sm text-on-surface font-mono break-all">
                          {m.Destination}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-on-surface-variant body-sm text-center py-8">
                No mounts
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === "network" && (
        <div className="bg-surface-container rounded-xl shadow-ambient p-6">
          <h2 className="text-lg font-medium text-on-surface mb-4">
            Network Settings
          </h2>
          <div className="space-y-4">
            <InfoRow
              label="IP Address"
              value={container.NetworkSettings.IPAddress || "—"}
              mono
            />
            <InfoRow
              label="Gateway"
              value={container.NetworkSettings.Gateway || "—"}
              mono
            />
            {container.NetworkSettings.Networks &&
              Object.entries(container.NetworkSettings.Networks).map(
                ([netName, net]) => (
                  <div
                    key={netName}
                    className="p-4 bg-surface-container-high rounded-lg space-y-2"
                  >
                    <p className="body-sm text-on-surface font-mono">
                      {netName}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="label-sm text-on-surface-variant mr-1">
                          IP:{" "}
                        </span>
                        <span className="body-sm text-on-surface font-mono">
                          {net.IPAddress || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="label-sm text-on-surface-variant mr-1">
                          Gateway:{" "}
                        </span>
                        <span className="body-sm text-on-surface font-mono">
                          {net.Gateway || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="label-sm text-on-surface-variant mr-1">
                          MAC:{" "}
                        </span>
                        <span className="body-sm text-on-surface font-mono">
                          {net.MacAddress || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                ),
              )}
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="bg-surface-container rounded-xl shadow-ambient p-6">
          <div className="flex flex-row items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-on-surface">
              Container Logs
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchLogs}
              disabled={logsLoading}
            >
              {logsLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>
          <div className="p-0">
            <pre
              ref={logsRef}
              className="p-4 text-sm font-mono text-on-surface bg-surface-container-lowest rounded-lg overflow-auto max-h-[600px] whitespace-pre-wrap break-all leading-relaxed"
            >
              {logsLoading ? "Loading logs..." : logs || "No logs available."}
            </pre>
          </div>
        </div>
      )}

      {/* Delete dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="bg-surface-container border-surface-container-high">
          <DialogHeader>
            <DialogTitle className="text-error">Remove Container</DialogTitle>
            <DialogDescription className="text-on-surface-variant">
              Are you sure you want to forcibly remove{" "}
              <span className="font-mono text-on-surface">{name}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialog(false)}
              className="text-on-surface hover:bg-surface-container-high"
            >
              <X className="mr-1.5" />
              Cancel
            </Button>
            <Button
              variant="danger"
              className="bg-error/10 text-error hover:bg-error/20"
              onClick={handleDelete}
            >
              <Trash2 className="mr-1.5" />
              Confirm Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-1 gap-4">
      <span className="label-sm text-on-surface-variant shrink-0">{label}</span>
      <span
        className={`body-sm text-on-surface text-right break-all ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
