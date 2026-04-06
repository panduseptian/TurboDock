"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useDockerData, useTasks } from "@/hooks/use-docker";
import { type SwarmService } from "@/lib/docker/types";
import { useEndpoint } from "@/hooks/use-endpoint";

function modeLabel(mode: Record<string, unknown> | undefined): string {
  if (!mode) return "unknown";
  if ("Replicated" in mode) return "replicated";
  if ("Global" in mode) return "global";
  return "custom";
}

function replicaLabel(mode: Record<string, unknown> | undefined): string {
  if (!mode || !("Replicated" in mode)) return "-";
  const replicated = mode.Replicated as { Replicas?: number } | undefined;
  const replicas = replicated?.Replicas;
  return typeof replicas === "number" ? String(replicas) : "-";
}

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = useMemo(() => String(params.id ?? ""), [params.id]);
  const { selectedEndpoint } = useEndpoint();

  const endpointId = selectedEndpoint?.id ?? null;
  const {
    data: service,
    error: serviceError,
    loading: serviceLoading,
  } = useDockerData<SwarmService>(
    endpointId,
    serviceId ? `/services/${serviceId}` : "/services",
  );

  const {
    data: tasks,
    loading: tasksLoading,
    error: tasksError,
  } = useTasks(endpointId, serviceId || undefined);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <Link
            href="/dashboard/services"
            className="text-primary hover:text-primary/80 inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to services
          </Link>
        </div>

        {serviceLoading ? (
          <div className="h-10 w-1/3 animate-pulse rounded-md bg-surface-container-high" />
        ) : serviceError ? (
          <h1 className="headline-md text-error">Error loading service</h1>
        ) : service ? (
          <h1 className="headline-md text-on-surface">
            {service.Spec?.Name || service.ID || "SERVICE_DETAIL"}
          </h1>
        ) : (
          <h1 className="headline-md text-on-surface">SERVICE_DETAIL</h1>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="bg-surface-container shadow-ambient flex flex-col rounded-xl lg:col-span-1">
          <div className="p-6">
            <h2 className="title-md text-on-surface mb-4">Service Details</h2>
            {!endpointId ? (
              <p className="body-sm text-on-surface-variant">
                Select an endpoint first.
              </p>
            ) : serviceLoading ? (
              <div className="space-y-4">
                <div className="h-16 w-full animate-pulse rounded-lg bg-surface-container-high" />
                <div className="h-16 w-full animate-pulse rounded-lg bg-surface-container-high" />
                <div className="h-16 w-full animate-pulse rounded-lg bg-surface-container-high" />
              </div>
            ) : serviceError ? (
              <p className="body-sm text-error">{serviceError}</p>
            ) : !service ? (
              <p className="body-sm text-on-surface-variant">
                Service not found.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="bg-surface-container-high rounded-lg p-4">
                  <p className="label-sm text-on-surface-variant mb-1">ID</p>
                  <p className="body-sm text-on-surface break-all">
                    {service.ID}
                  </p>
                </div>
                <div className="bg-surface-container-high rounded-lg p-4">
                  <p className="label-sm text-on-surface-variant mb-1">Name</p>
                  <p className="body-sm text-on-surface">
                    {service.Spec?.Name}
                  </p>
                </div>
                <div className="bg-surface-container-high rounded-lg p-4">
                  <p className="label-sm text-on-surface-variant mb-1">Mode</p>
                  <p className="body-sm text-on-surface capitalize">
                    {modeLabel(service.Spec?.Mode)}
                  </p>
                </div>
                <div className="bg-surface-container-high rounded-lg p-4">
                  <p className="label-sm text-on-surface-variant mb-1">
                    Replicas
                  </p>
                  <p className="body-sm text-on-surface">
                    {replicaLabel(service.Spec?.Mode)}
                  </p>
                </div>
                <div className="bg-surface-container-high rounded-lg p-4">
                  <p className="label-sm text-on-surface-variant mb-1">Image</p>
                  <p className="text-on-surface-variant font-mono text-sm break-all">
                    {service.Spec?.TaskTemplate?.ContainerSpec?.Image || "N/A"}
                  </p>
                </div>
                <div className="bg-surface-container-high rounded-lg p-4">
                  <p className="label-sm text-on-surface-variant mb-1">
                    Updated
                  </p>
                  <p className="body-sm text-on-surface">
                    {new Date(service.UpdatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface-container shadow-ambient flex flex-col rounded-xl overflow-hidden lg:col-span-2">
          <div className="flex flex-col gap-4 p-6 border-b border-outline-variant/20">
            <h2 className="title-md text-on-surface">Tasks</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="label-sm text-on-surface-variant p-4 font-medium">
                    Task ID
                  </th>
                  <th className="label-sm text-on-surface-variant p-4 font-medium">
                    Node
                  </th>
                  <th className="label-sm text-on-surface-variant p-4 font-medium">
                    Desired State
                  </th>
                  <th className="label-sm text-on-surface-variant p-4 font-medium">
                    Current State
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {!endpointId ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-on-surface-variant body-sm"
                    >
                      Select an endpoint first.
                    </td>
                  </tr>
                ) : tasksLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr
                      key={i}
                      className={
                        i % 2 === 0
                          ? "bg-surface-container"
                          : "bg-surface-container-low"
                      }
                    >
                      <td className="p-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-surface-container-high" />
                      </td>
                      <td className="p-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-surface-container-high" />
                      </td>
                      <td className="p-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-surface-container-high" />
                      </td>
                      <td className="p-4">
                        <div className="h-6 w-20 animate-pulse rounded-full bg-surface-container-high" />
                      </td>
                    </tr>
                  ))
                ) : tasksError ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-error body-sm"
                    >
                      {tasksError}
                    </td>
                  </tr>
                ) : !tasks || tasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-on-surface-variant body-sm"
                    >
                      No tasks found for this service.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task, idx) => {
                    const isRunning = task.Status.State === "running";
                    const isFailed =
                      task.Status.State === "failed" ||
                      task.Status.State === "rejected" ||
                      task.Status.State === "orphaned" ||
                      (task.Status.State === "shutdown" && task.Status?.Err);

                    return (
                      <tr
                        key={task.ID}
                        className={`transition-colors hover:bg-surface-container-high/50 ${
                          idx % 2 === 0
                            ? "bg-surface-container"
                            : "bg-surface-container-low"
                        }`}
                      >
                        <td className="p-4">
                          <span className="font-mono text-sm text-on-surface">
                            {task.ID.substring(0, 12)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-sm text-on-surface-variant">
                            {task.NodeID?.substring(0, 12) || "-"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="body-sm text-on-surface capitalize">
                            {task.DesiredState}
                          </span>
                        </td>
                        <td className="p-4">
                          <Badge
                            status={
                              isRunning
                                ? "success"
                                : isFailed
                                  ? "error"
                                  : "default"
                            }
                            className={
                              isRunning
                                ? "bg-primary/10 text-primary border-transparent"
                                : isFailed
                                  ? "bg-error-container/80 text-error border-transparent"
                                  : "bg-surface-container-high text-on-surface-variant border-transparent"
                            }
                          >
                            {task.Status.State}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
