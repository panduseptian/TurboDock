"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { useEndpointContext } from "@/contexts/endpoint-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RotateCw, Trash2 } from "@/components/ui/icons";
import type { SwarmNode, SwarmTask } from "@/lib/docker/types";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NodeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { selectedEndpoint } = useEndpointContext();
  const endpointId = selectedEndpoint?.id;

  const [node, setNode] = useState<SwarmNode | null>(null);
  const [tasks, setTasks] = useState<SwarmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [removeDialog, setRemoveDialog] = useState(false);
  const [removing, setRemoving] = useState(false);

  const fetchNode = useCallback(async () => {
    if (!endpointId || !params.id) return;
    setLoading(true);
    setError(null);
    try {
      const [nodeRes, tasksRes] = await Promise.all([
        fetch(`/api/docker/${endpointId}/nodes/${params.id}`),
        fetch(`/api/docker/${endpointId}/tasks`),
      ]);
      if (!nodeRes.ok) {
        const err = (await nodeRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(err?.error || "Failed to fetch node");
      }
      const nodeData = (await nodeRes.json()) as SwarmNode;
      setNode(nodeData);
      if (tasksRes.ok) {
        const allTasks = (await tasksRes.json()) as SwarmTask[];
        setTasks(allTasks.filter((task) => task.NodeID === params.id));
      } else {
        setTasks([]);
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to fetch node",
      );
    } finally {
      setLoading(false);
    }
  }, [endpointId, params.id]);

  useEffect(() => {
    void fetchNode();
  }, [fetchNode]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort(
      (a, b) =>
        new Date(b.UpdatedAt).getTime() - new Date(a.UpdatedAt).getTime(),
    );
  }, [tasks]);

  const handleUpdateNode = useCallback(
    async (update: {
      Availability?: "active" | "pause" | "drain";
      Role?: "worker" | "manager";
    }) => {
      if (!endpointId || !node) return;
      setUpdating(true);
      try {
        const res = await fetch(`/api/docker/${endpointId}/nodes/${node.ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version: node.Version.Index,
            spec: { ...node.Spec, ...update },
          }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(err?.error || "Failed to update node");
        }
        await fetchNode();
      } catch (updateError) {
        setError(
          updateError instanceof Error ? updateError.message : "Update failed",
        );
      } finally {
        setUpdating(false);
      }
    },
    [endpointId, fetchNode, node],
  );

  const handleRemoveNode = useCallback(async () => {
    if (!endpointId || !node) return;
    setRemoving(true);
    try {
      const res = await fetch(
        `/api/docker/${endpointId}/nodes/${node.ID}?force=true`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(err?.error || "Failed to remove node");
      }
      router.push("/dashboard/nodes");
    } catch (removeError) {
      setError(
        removeError instanceof Error ? removeError.message : "Remove failed",
      );
      setRemoving(false);
      setRemoveDialog(false);
    }
  }, [endpointId, node, router]);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/nodes"
        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors body-sm"
      >
        ← Back to Nodes
      </Link>

      {loading ? (
        <div className="space-y-6">
          <div className="h-10 w-64 bg-surface-container-high animate-pulse rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((value) => (
              <div
                key={value}
                className="h-40 bg-surface-container-high animate-pulse rounded-xl"
              />
            ))}
          </div>
        </div>
      ) : error && !node ? (
        <div className="bg-error-container/20 text-error rounded-lg p-4 body-sm">
          {error}
        </div>
      ) : node ? (
        <>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="headline-md text-on-surface">
                {node.Description.Hostname}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  node.Spec.Role === "manager"
                    ? "bg-primary/10 text-primary"
                    : "bg-surface-container-highest text-on-surface-variant"
                }`}
              >
                {node.Spec.Role}
              </span>
              {node.ManagerStatus?.Leader && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-tertiary/10 text-tertiary">
                  Leader
                </span>
              )}
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  node.Status.State === "ready"
                    ? "bg-primary/10 text-primary"
                    : "bg-error-container/80 text-error"
                }`}
              >
                {node.Status.State}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void fetchNode()}
              disabled={loading}
            >
              <RotateCw className="w-4 h-4" /> Refresh
            </Button>
          </div>

          {error && (
            <div className="bg-error-container/20 text-error rounded-lg p-3 body-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Hostname" value={node.Description.Hostname} />
                <InfoRow
                  label="Node ID"
                  value={node.ID.substring(0, 12)}
                  mono
                />
                <InfoRow label="Role" value={node.Spec.Role ?? "—"} />
                <InfoRow
                  label="Availability"
                  value={node.Spec.Availability ?? "—"}
                />
                <InfoRow label="Status" value={node.Status.State} />
                {node.Status.Addr && (
                  <InfoRow label="IP Address" value={node.Status.Addr} mono />
                )}
                {node.ManagerStatus?.Addr && (
                  <InfoRow
                    label="Manager Address"
                    value={node.ManagerStatus.Addr}
                    mono
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow
                  label="CPUs"
                  value={`${(node.Description.Resources.NanoCPUs / 1e9).toFixed(1)} cores`}
                />
                <InfoRow
                  label="Memory"
                  value={formatBytes(node.Description.Resources.MemoryBytes)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="OS" value={node.Description.Platform.OS} />
                <InfoRow
                  label="Architecture"
                  value={node.Description.Platform.Architecture}
                />
                <InfoRow
                  label="Engine"
                  value={`v${node.Description.Engine.EngineVersion}`}
                />
                <InfoRow label="Created" value={timeAgo(node.CreatedAt)} />
                <InfoRow label="Updated" value={timeAgo(node.UpdatedAt)} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Labels</CardTitle>
            </CardHeader>
            <CardContent>
              {node.Spec.Labels && Object.keys(node.Spec.Labels).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(node.Spec.Labels).map(([key, value]) => (
                    <div key={key} className="flex gap-3 items-baseline">
                      <span className="label-sm text-on-surface-variant font-mono">
                        {key}
                      </span>
                      <span className="body-sm text-on-surface">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-on-surface-variant body-sm">
                  No labels configured.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="label-sm text-on-surface-variant">Availability</p>
                <div className="flex gap-2">
                  {(["active", "pause", "drain"] as const).map(
                    (availability) => (
                      <Button
                        key={availability}
                        variant={
                          node.Spec.Availability === availability
                            ? "primary"
                            : "tertiary"
                        }
                        size="sm"
                        disabled={
                          updating || node.Spec.Availability === availability
                        }
                        onClick={() =>
                          void handleUpdateNode({ Availability: availability })
                        }
                      >
                        {availability.charAt(0).toUpperCase() +
                          availability.slice(1)}
                      </Button>
                    ),
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="label-sm text-on-surface-variant">Role</p>
                <div className="flex gap-2">
                  <Button
                    variant={
                      node.Spec.Role === "worker" ? "primary" : "tertiary"
                    }
                    size="sm"
                    disabled={updating || node.Spec.Role === "worker"}
                    onClick={() => void handleUpdateNode({ Role: "worker" })}
                  >
                    Worker
                  </Button>
                  <Button
                    variant={
                      node.Spec.Role === "manager" ? "primary" : "tertiary"
                    }
                    size="sm"
                    disabled={updating || node.Spec.Role === "manager"}
                    onClick={() => void handleUpdateNode({ Role: "manager" })}
                  >
                    Manager
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="label-sm text-on-surface-variant">Danger Zone</p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setRemoveDialog(true)}
                >
                  <Trash2 className="w-4 h-4" /> Remove Node
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasks ({sortedTasks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedTasks.length === 0 ? (
                <p className="text-on-surface-variant body-sm">
                  No tasks running on this node.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task ID</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Desired</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTasks.map((task) => (
                        <TableRow key={task.ID}>
                          <TableCell className="font-mono">
                            {task.ID.substring(0, 12)}
                          </TableCell>
                          <TableCell className="text-primary">
                            {task.ServiceID.substring(0, 12)}
                          </TableCell>
                          <TableCell className="text-on-surface-variant">
                            {task.DesiredState}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                task.Status.State === "running"
                                  ? "bg-primary/10 text-primary"
                                  : task.Status.State === "failed"
                                    ? "bg-error-container/80 text-error"
                                    : "bg-surface-container-highest text-on-surface-variant"
                              }`}
                            >
                              {task.Status.State}
                            </span>
                          </TableCell>
                          <TableCell className="text-on-surface-variant label-sm">
                            {timeAgo(task.UpdatedAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={removeDialog} onOpenChange={setRemoveDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remove Node</DialogTitle>
                <DialogDescription>
                  Are you sure you want to remove {node.Description.Hostname}{" "}
                  from the swarm? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setRemoveDialog(false)}
                  disabled={removing}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => void handleRemoveNode()}
                  disabled={removing}
                >
                  {removing ? "Removing..." : "Remove Node"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <div className="text-on-surface-variant body-sm">Node not found.</div>
      )}
    </div>
  );
}

// Helper component for key-value display
function InfoRow({
  label,
  value,
  mono,
}: Readonly<{
  label: string;
  value: string;
  mono?: boolean;
}>) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="label-sm text-on-surface-variant shrink-0">{label}</span>
      <span
        className={`body-sm text-on-surface text-right ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
