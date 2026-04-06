"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

import { useEndpointContext } from "@/contexts/endpoint-context";
import { useNodes } from "@/hooks/use-docker";
import { Button } from "@/components/ui/button";
import { RotateCw } from "@/components/ui/icons";

type Availability = "active" | "pause" | "drain";
type NodeRole = "worker" | "manager";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function NodesPage() {
  const { selectedEndpoint } = useEndpointContext();
  const endpointId = selectedEndpoint?.id ?? null;
  const { data: nodes, loading, error, refresh } = useNodes(endpointId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingNodeId, setUpdatingNodeId] = useState<string | null>(null);

  const updateNode = useCallback(
    async (
      nodeId: string,
      version: number,
      spec: {
        Name?: string;
        Labels?: Record<string, string>;
        Role?: string;
        Availability?: string;
      },
    ) => {
      if (!endpointId) {
        return;
      }

      setActionError(null);
      setUpdatingNodeId(nodeId);

      try {
        const response = await fetch(
          `/api/docker/${endpointId}/nodes/${nodeId}`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ version, spec }),
          },
        );

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
            message?: string;
          } | null;
          const message =
            payload?.error ??
            payload?.message ??
            `Failed to update node (${response.status})`;
          throw new Error(message);
        }

        refresh();
      } catch (updateError) {
        setActionError(
          updateError instanceof Error
            ? updateError.message
            : "Failed to update node",
        );
      } finally {
        setUpdatingNodeId(null);
      }
    },
    [endpointId, refresh],
  );

  const setAvailability = useCallback(
    async (
      nodeId: string,
      version: number,
      spec: {
        Name?: string;
        Labels?: Record<string, string>;
        Role?: string;
        Availability?: string;
      },
      availability: Availability,
    ) => {
      await updateNode(nodeId, version, {
        ...spec,
        Availability: availability,
      });
    },
    [updateNode],
  );

  const setRole = useCallback(
    async (
      nodeId: string,
      version: number,
      spec: {
        Name?: string;
        Labels?: Record<string, string>;
        Role?: string;
        Availability?: string;
      },
      role: NodeRole,
    ) => {
      await updateNode(nodeId, version, { ...spec, Role: role });
    },
    [updateNode],
  );

  const totalNodes = nodes?.length ?? 0;
  const managerCount =
    nodes?.filter((node) => node.Spec.Role === "manager").length ?? 0;
  const workerCount = totalNodes - managerCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="headline-md text-on-surface">Swarm Nodes</h1>
          <p className="body-sm text-on-surface-variant">
            Cluster membership and node health.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={refresh}
          disabled={!endpointId || loading}
          className="w-fit"
        >
          <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="bg-surface-container rounded-xl shadow-ambient p-6 space-y-4">
        <div className="bg-surface-container-high rounded-lg p-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <p className="label-sm text-on-surface-variant">Total nodes</p>
            <p className="headline-md text-on-surface">{totalNodes}</p>
          </div>
          <div>
            <p className="label-sm text-on-surface-variant">Managers</p>
            <p className="headline-md text-on-surface">{managerCount}</p>
          </div>
          <div>
            <p className="label-sm text-on-surface-variant">Workers</p>
            <p className="headline-md text-on-surface">{workerCount}</p>
          </div>
        </div>

        {actionError ? (
          <p className="body-sm text-error">{actionError}</p>
        ) : null}

        {endpointId ? (
          loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="bg-surface-container-high rounded-lg p-4 animate-pulse"
                >
                  <div className="h-5 w-1/2 bg-surface-container-highest rounded" />
                  <div className="mt-3 h-4 w-2/3 bg-surface-container-highest rounded" />
                  <div className="mt-3 h-16 bg-surface-container-highest rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-surface-container-high rounded-lg p-4">
              <p className="body-sm text-error">{error}</p>
            </div>
          ) : !nodes || nodes.length === 0 ? (
            <div className="bg-surface-container-high rounded-lg p-4">
              <p className="body-sm text-on-surface-variant">
                No swarm nodes found.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {nodes.map((node) => {
                const role =
                  node.Spec.Role === "manager" ? "manager" : "worker";
                const isManager = role === "manager";
                const isLeader = Boolean(node.ManagerStatus?.Leader);
                const isReady = node.Status.State === "ready";
                const statusLabel = isReady ? "ready" : "down";
                const availability =
                  node.Spec.Availability === "drain" ||
                  node.Spec.Availability === "pause"
                    ? node.Spec.Availability
                    : "active";
                const cpuCores = node.Description.Resources.NanoCPUs / 1e9;
                const memory = formatBytes(
                  node.Description.Resources.MemoryBytes,
                );
                const isUpdatingThisNode = updatingNodeId === node.ID;

                return (
                  <div
                    key={node.ID}
                    className="bg-surface-container-high rounded-lg p-4 space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/nodes/${node.ID}`}
                          className="headline-md text-on-surface hover:text-primary transition-colors"
                        >
                          {node.Description.Hostname}
                        </Link>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            isManager
                              ? "bg-primary/10 text-primary"
                              : "bg-surface-container-highest text-on-surface-variant"
                          }`}
                        >
                          {role}
                        </span>
                        {isLeader ? (
                          <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-tertiary/10 text-tertiary">
                            Leader
                          </span>
                        ) : null}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            isReady
                              ? "bg-primary/10 text-primary"
                              : "bg-error-container/80 text-error"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <p className="label-sm text-on-surface-variant">
                        Availability{" "}
                        <span
                          className={
                            availability === "active"
                              ? "text-primary"
                              : availability === "drain"
                                ? "text-tertiary"
                                : "text-on-surface-variant"
                          }
                        >
                          {availability}
                        </span>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="label-sm text-on-surface-variant">
                        Resources
                      </p>
                      <p className="body-sm text-on-surface">
                        CPU {cpuCores.toFixed(1)} cores
                      </p>
                      <p className="body-sm text-on-surface">Memory {memory}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="label-sm text-on-surface-variant">
                        Network
                      </p>
                      <p className="body-sm text-on-surface">
                        IP {node.Status.Addr || "-"}
                      </p>
                      {isManager ? (
                        <p className="body-sm text-on-surface">
                          Manager address {node.ManagerStatus?.Addr || "-"}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <p className="label-sm text-on-surface-variant">Engine</p>
                      <p className="body-sm text-on-surface">
                        {node.Description.Engine.EngineVersion} •{" "}
                        {node.Description.Platform.OS}/
                        {node.Description.Platform.Architecture}
                      </p>
                      <p className="label-sm text-on-surface-variant">
                        Node ID {node.ID.slice(0, 12)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="label-sm text-on-surface-variant">
                        Change availability
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(["active", "pause", "drain"] as const).map(
                          (value) => (
                            <Button
                              key={value}
                              size="sm"
                              variant={
                                availability === value ? "tertiary" : "ghost"
                              }
                              disabled={isUpdatingThisNode}
                              onClick={() =>
                                setAvailability(
                                  node.ID,
                                  node.Version.Index,
                                  node.Spec,
                                  value,
                                )
                              }
                            >
                              {value.charAt(0).toUpperCase() + value.slice(1)}
                            </Button>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="label-sm text-on-surface-variant">
                        Role management
                      </p>
                      {isManager ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isUpdatingThisNode}
                          onClick={() =>
                            setRole(
                              node.ID,
                              node.Version.Index,
                              node.Spec,
                              "worker",
                            )
                          }
                        >
                          Demote to Worker
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isUpdatingThisNode}
                          onClick={() =>
                            setRole(
                              node.ID,
                              node.Version.Index,
                              node.Spec,
                              "manager",
                            )
                          }
                        >
                          Promote to Manager
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="bg-surface-container-high rounded-lg p-4">
            <p className="body-sm text-on-surface-variant">
              No endpoint selected. Choose an endpoint from the sidebar
              switcher.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
