"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toast } from "@/components/ui/toast";
import { Play, Plus, RotateCw, Square, Trash2, X } from "@/components/ui/icons";
import { useEndpointContext } from "@/contexts/endpoint-context";
import { timeAgo } from "@/lib/formatters";

type ContainerItem = {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Created: number;
  Ports: Array<{
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }>;
};

type ToastState = {
  message: string;
  type: "success" | "error" | "info";
} | null;

type ToastVariant = NonNullable<ToastState>["type"];

const STATUS_FILTERS = [
  "all",
  "running",
  "exited",
  "paused",
  "created",
] as const;

function containerName(names: string[]): string {
  if (!names || names.length === 0) return "unnamed";
  return names[0].replace(/^\//, "");
}

function statusToBadge(
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

function formatPorts(
  ports: Array<{ PrivatePort: number; PublicPort?: number; Type: string }>,
): string {
  if (!ports || ports.length === 0) return "—";
  const mapped = ports
    .filter((p) => p.PublicPort)
    .map((p) => `${p.PublicPort}:${p.PrivatePort}/${p.Type}`);
  if (mapped.length === 0) return "—";
  return (
    mapped.slice(0, 3).join(", ") +
    (mapped.length > 3 ? ` +${mapped.length - 3}` : "")
  );
}

export default function ContainersPage() {
  const router = useRouter();
  const { selectedEndpoint } = useEndpointContext();
  const [containers, setContainers] = useState<ContainerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [userRole, setUserRole] = useState<string>("support");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    container: ContainerItem | null;
  }>({ open: false, container: null });

  const showToast = useCallback(
    (message: string, type: ToastVariant = "info") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
    },
    [],
  );

  const fetchContainers = useCallback(
    (endpoint: string) => {
      setLoading(true);
      fetch(`/api/docker/${endpoint}/containers?all=true`)
        .then((res) => res.json())
        .then((data) => {
          setContainers(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          showToast("Failed to load containers", "error");
        })
        .finally(() => setLoading(false));
    },
    [showToast],
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
      fetchContainers(selectedEndpoint.id);
      return;
    }

    setContainers([]);
    setLoading(false);
  }, [selectedEndpoint?.id, fetchContainers]);

  const containerAction = async (
    containerId: string,
    action: "start" | "stop" | "restart",
  ) => {
    if (!selectedEndpoint?.id) return;
    setActionLoading(containerId);
    try {
      const res = await fetch(
        `/api/docker/${selectedEndpoint.id}/containers/${containerId}/${action}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        showToast(err.error || `Failed to ${action} container`, "error");
      } else {
        showToast(`Container ${action}ed successfully`, "success");
        fetchContainers(selectedEndpoint.id);
      }
    } catch {
      showToast(`Failed to ${action} container`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.container || !selectedEndpoint?.id) return;
    const cid = deleteDialog.container.Id;
    setActionLoading(cid);
    try {
      const res = await fetch(
        `/api/docker/${selectedEndpoint.id}/containers/${cid}?force=true`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        showToast(err.error || "Failed to remove container", "error");
      } else {
        showToast("Container removed", "success");
        fetchContainers(selectedEndpoint.id);
      }
    } catch {
      showToast("Failed to remove container", "error");
    } finally {
      setActionLoading(null);
      setDeleteDialog({ open: false, container: null });
    }
  };

  const filteredContainers = useMemo(() => {
    let result = containers;
    if (statusFilter !== "all") {
      result = result.filter((c) => c.State === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          containerName(c.Names).toLowerCase().includes(q) ||
          c.Image.toLowerCase().includes(q) ||
          c.Id.toLowerCase().includes(q),
      );
    }
    return result;
  }, [containers, statusFilter, search]);

  const canManage = userRole === "admin" || userRole === "devops";

  const runningCount = containers.filter((c) => c.State === "running").length;
  const stoppedCount = containers.filter(
    (c) => c.State === "exited" || c.State === "dead",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="headline-md text-on-surface mb-2">Containers</h1>
          <p className="text-on-surface-variant">
            View and manage Docker containers on this endpoint
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-4 text-sm bg-surface-container-high text-on-surface-variant rounded-xl px-4 py-2">
            <div>
              Total:{" "}
              <span className="text-on-surface font-medium">
                {containers.length}
              </span>
            </div>
            <div>
              Running:{" "}
              <span className="text-primary font-medium">{runningCount}</span>
            </div>
            <div>
              Stopped:{" "}
              <span className="text-error font-medium">{stoppedCount}</span>
            </div>
          </div>
          <Button
            className="gradient-primary"
            onClick={() => router.push("/dashboard/containers/new")}
          >
            <Plus className="mr-1.5" />
            New Container
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`h-9 px-4 text-sm rounded-lg transition-colors capitalize ${
                statusFilter === f
                  ? "bg-surface-container-highest text-primary font-medium"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search name, image, or ID..."
          className="w-full sm:max-w-xs bg-surface-container-lowest !border-0 text-on-surface"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Container List */}
      <div className="bg-surface-container rounded-xl shadow-ambient overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="hidden lg:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Ports</TableHead>
              <TableHead className="hidden xl:table-cell">Created</TableHead>
              {canManage && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={canManage ? 7 : 6} className="h-32">
                  <div className="flex flex-col gap-4 p-4">
                    <div className="flex gap-4">
                      <div className="h-6 w-1/4 animate-pulse bg-surface-container-high rounded-md"></div>
                      <div className="h-6 w-1/4 animate-pulse bg-surface-container-high rounded-md"></div>
                      <div className="h-6 w-1/4 animate-pulse bg-surface-container-high rounded-md"></div>
                    </div>
                    <div className="flex gap-4">
                      <div className="h-6 w-1/4 animate-pulse bg-surface-container-high rounded-md"></div>
                      <div className="h-6 w-1/4 animate-pulse bg-surface-container-high rounded-md"></div>
                      <div className="h-6 w-1/4 animate-pulse bg-surface-container-high rounded-md"></div>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredContainers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 7 : 6}
                  className="text-center text-on-surface-variant h-32"
                >
                  {search || statusFilter !== "all"
                    ? "No matching containers"
                    : "No containers found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredContainers.map((c) => {
                const name = containerName(c.Names);
                const isRunning = c.State === "running";
                const isStopped = c.State === "exited" || c.State === "dead";
                const busy = actionLoading === c.Id;

                return (
                  <TableRow key={c.Id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/containers/${c.Id}`}
                        className="font-medium text-on-surface hover:text-primary transition-colors"
                      >
                        {name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-on-surface-variant max-w-[200px] truncate">
                      {c.Image}
                    </TableCell>
                    <TableCell>
                      <Badge status={statusToBadge(c.State)} dot>
                        {c.State}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-on-surface-variant text-sm">
                      {c.Status}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-on-surface-variant">
                      {formatPorts(c.Ports)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-on-surface-variant text-sm">
                      {timeAgo(c.Created)}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isStopped && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() => containerAction(c.Id, "start")}
                              className="text-primary hover:bg-primary/10"
                            >
                              <Play className="mr-1.5" />
                              Start
                            </Button>
                          )}
                          {isRunning && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={() => containerAction(c.Id, "stop")}
                                className="text-on-surface-variant hover:text-on-surface bg-surface-container-high hover:bg-surface-container-highest"
                              >
                                <Square className="mr-1.5" />
                                Stop
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={() => containerAction(c.Id, "restart")}
                                className="text-on-surface-variant hover:text-on-surface bg-surface-container-high hover:bg-surface-container-highest"
                              >
                                <RotateCw className="mr-1.5" />
                                Restart
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy}
                            onClick={() =>
                              setDeleteDialog({ open: true, container: c })
                            }
                            className="text-error hover:bg-error/10"
                            title="Remove"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open: boolean) =>
          !open && setDeleteDialog({ open: false, container: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Container</DialogTitle>
            <DialogDescription>
              Are you sure you want to forcibly remove{" "}
              <span className="font-medium text-on-surface">
                {deleteDialog.container
                  ? containerName(deleteDialog.container.Names)
                  : ""}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialog({ open: false, container: null })}
            >
              Cancel
            </Button>
            <Button
              className="bg-error text-on-error hover:bg-error/90"
              onClick={handleDelete}
            >
              <Trash2 className="mr-1.5" />
              Remove
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
