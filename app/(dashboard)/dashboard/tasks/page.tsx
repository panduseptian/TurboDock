"use client";

import { useState, useMemo } from "react";
import { useEndpointContext } from "@/contexts/endpoint-context";
import { useNodes, useTasks, useServices } from "@/hooks/use-docker";
import type { SwarmTask } from "@/lib/docker/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RotateCw } from "@/components/ui/icons";
import { timeAgo } from "@/lib/formatters";

const TASKS_PER_PAGE = 50;

function TableSkeleton() {
  return (
    <div className="p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task ID</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Node</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Desired State</TableHead>
            <TableHead>Current State</TableHead>
            <TableHead>Error</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {["one", "two", "three", "four", "five"].map((rowId) => (
            <TableRow key={`skeleton-${rowId}`}>
              <TableCell>
                <div className="h-4 w-28 rounded bg-surface-container-highest animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-36 rounded bg-surface-container-highest animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-32 rounded bg-surface-container-highest animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-44 rounded bg-surface-container-highest animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-24 rounded bg-surface-container-highest animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-5 w-24 rounded-full bg-surface-container-highest animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-28 rounded bg-surface-container-highest animate-pulse" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-20 rounded bg-surface-container-highest animate-pulse" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function getStatusBadgeClasses(state: string) {
  const normalized = state.toLowerCase();

  switch (normalized) {
    case "running":
      return "bg-primary/10 text-primary";
    case "complete":
      return "bg-surface-container-highest text-on-surface-variant";
    case "failed":
    case "rejected":
      return "bg-error-container/80 text-error";
    default:
      return "bg-surface-container-highest text-on-surface-variant";
  }
}

function getTaskImage(task: SwarmTask): string {
  const spec = task.Spec as {
    ContainerSpec?: {
      Image?: string;
    };
  };

  return spec.ContainerSpec?.Image ?? "—";
}

export default function TasksPage() {
  const { selectedEndpoint } = useEndpointContext();
  const endpointId = selectedEndpoint?.id ?? null;
  const { data: tasks, loading, error, refresh } = useTasks(endpointId);
  const {
    data: services,
    loading: servicesLoading,
    error: servicesError,
    refresh: refreshServices,
  } = useServices(endpointId);
  const {
    data: nodes,
    loading: nodesLoading,
    error: nodesError,
    refresh: refreshNodes,
  } = useNodes(endpointId);

  const [selectedService, setSelectedService] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const serviceMap = useMemo(() => {
    const next = new Map<string, string>();
    if (!services) {
      return next;
    }

    services.forEach((service) => {
      next.set(service.ID, service.Spec.Name || service.ID);
    });

    return next;
  }, [services]);

  const nodeMap = useMemo(() => {
    const next = new Map<string, string>();
    if (!nodes) {
      return next;
    }

    nodes.forEach((node) => {
      next.set(node.ID, node.Description.Hostname || node.ID);
    });

    return next;
  }, [nodes]);

  const filteredTasks = useMemo(() => {
    const list = tasks ?? [];
    const query = search.trim().toLowerCase();

    return list.filter((task) => {
      if (selectedService !== "all" && task.ServiceID !== selectedService) {
        return false;
      }

      const currentState = task.Status.State.toLowerCase();
      if (selectedState !== "all" && currentState !== selectedState) {
        return false;
      }

      if (!query) {
        return true;
      }

      const taskId = task.ID.toLowerCase();
      const serviceName = (
        serviceMap.get(task.ServiceID) || task.ServiceID
      ).toLowerCase();
      const nodeName = (
        task.NodeID ? nodeMap.get(task.NodeID) || task.NodeID : "unassigned"
      ).toLowerCase();

      return (
        taskId.includes(query) ||
        serviceName.includes(query) ||
        nodeName.includes(query)
      );
    });
  }, [tasks, search, selectedService, selectedState, serviceMap, nodeMap]);

  const summary = useMemo(() => {
    return (tasks ?? []).reduce(
      (accumulator, task) => {
        accumulator.total += 1;

        const state = task.Status.State.toLowerCase();
        if (state === "running") {
          accumulator.running += 1;
        }
        if (state === "failed" || state === "rejected") {
          accumulator.failed += 1;
        }

        return accumulator;
      },
      { total: 0, running: 0, failed: 0 },
    );
  }, [tasks]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTasks.length / TASKS_PER_PAGE),
  );
  const safePage = Math.min(page, totalPages);

  const paginatedTasks = useMemo(() => {
    const start = (safePage - 1) * TASKS_PER_PAGE;
    return filteredTasks.slice(start, start + TASKS_PER_PAGE);
  }, [filteredTasks, safePage]);

  const hasAnyError = error || servicesError || nodesError;
  const isLoading = loading || servicesLoading || nodesLoading;

  const handleRefresh = () => {
    refresh();
    refreshServices();
    refreshNodes();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="headline-md text-on-surface">Swarm Tasks</h1>
          <p className="text-on-surface-variant mt-1">
            Real-time task state across services and nodes.
          </p>
        </div>
        <Button
          type="button"
          variant="tertiary"
          onClick={handleRefresh}
          disabled={!endpointId || isLoading}
        >
          <RotateCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="bg-surface-container-high rounded-lg p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            value={selectedService}
            onChange={(event) => {
              setSelectedService(event.target.value);
              setPage(1);
            }}
            className="bg-surface-container-lowest text-on-surface rounded-md h-9 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            disabled={!endpointId || !services || services.length === 0}
          >
            <option value="all">All Services</option>
            {(services ?? []).map((service) => (
              <option key={service.ID} value={service.ID}>
                {service.Spec.Name || service.ID}
              </option>
            ))}
          </select>

          <select
            value={selectedState}
            onChange={(event) => {
              setSelectedState(event.target.value);
              setPage(1);
            }}
            className="bg-surface-container-lowest text-on-surface rounded-md h-9 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            disabled={!endpointId}
          >
            <option value="all">All States</option>
            <option value="running">running</option>
            <option value="complete">complete</option>
            <option value="failed">failed</option>
            <option value="shutdown">shutdown</option>
            <option value="rejected">rejected</option>
            <option value="pending">pending</option>
          </select>

          <div className="md:col-span-2">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by task ID, service, or node"
              className="h-9"
              disabled={!endpointId}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
        <span>
          Total: <strong className="text-on-surface">{summary.total}</strong>
        </span>
        <span>
          Running: <strong className="text-primary">{summary.running}</strong>
        </span>
        <span>
          Failed: <strong className="text-error">{summary.failed}</strong>
        </span>
        {tasks ? (
          <span>
            Showing {filteredTasks.length} of {tasks.length} tasks
          </span>
        ) : null}
      </div>

      <div className="bg-surface-container rounded-xl shadow-ambient overflow-hidden">
        {endpointId ? (
          isLoading ? (
            <TableSkeleton />
          ) : hasAnyError ? (
            <div className="p-6 text-error">{hasAnyError}</div>
          ) : !tasks || tasks.length === 0 ? (
            <div className="p-6 text-on-surface-variant">No tasks found.</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-6 text-on-surface-variant">
              No tasks match your current filters.
            </div>
          ) : (
            <div className="space-y-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task ID</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Node</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Desired State</TableHead>
                    <TableHead>Current State</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTasks.map((task) => {
                    const serviceName =
                      serviceMap.get(task.ServiceID) || task.ServiceID;
                    const nodeName = task.NodeID
                      ? nodeMap.get(task.NodeID) || task.NodeID
                      : "unassigned";

                    return (
                      <TableRow key={task.ID}>
                        <TableCell>
                          <span className="font-mono text-primary hover:underline cursor-pointer">
                            {task.ID.substring(0, 12)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-primary">{serviceName}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-on-surface">{nodeName}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-on-surface-variant label-sm">
                            {getTaskImage(task)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-on-surface-variant">
                            {task.DesiredState}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClasses(task.Status.State)}`}
                          >
                            {task.Status.State}
                          </span>
                        </TableCell>
                        <TableCell>
                          {task.Status.Err ? (
                            <span className="text-error text-xs">
                              {task.Status.Err}
                            </span>
                          ) : (
                            <span className="text-on-surface-variant">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-on-surface-variant">
                            {timeAgo(task.UpdatedAt)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between px-4 pb-4 text-sm text-on-surface-variant">
                <span>
                  Page {safePage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={safePage <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={safePage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="p-6 text-on-surface-variant">
            Select an endpoint first.
          </div>
        )}
      </div>
    </div>
  );
}
