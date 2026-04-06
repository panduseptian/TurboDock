"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, RotateCw, Trash2 } from "@/components/ui/icons";
import { SwarmService } from "@/lib/docker/types";

type ServiceListProps = {
  endpointId: string | null;
  onCreateClick: () => void;
};

function parseMode(mode: Record<string, unknown>): string {
  if ("Replicated" in mode) {
    return "replicated";
  }

  if ("Global" in mode) {
    return "global";
  }

  return "custom";
}

function parseImage(taskTemplate: Record<string, unknown>): string {
  const containerSpec =
    (taskTemplate as { ContainerSpec?: { Image?: string } }).ContainerSpec ??
    null;

  return containerSpec?.Image ?? "-";
}

function parseReplicas(mode: Record<string, unknown>): string {
  const replicated =
    (mode as { Replicated?: { Replicas?: number } }).Replicated ?? null;

  if (typeof replicated?.Replicas === "number") {
    return String(replicated.Replicas);
  }

  return "-";
}

function parsePorts(service: SwarmService): string {
  const ports = service.Endpoint?.Ports;
  if (!ports || ports.length === 0) {
    return "-";
  }

  return ports
    .map((port) => {
      const published = port.PublishedPort ? String(port.PublishedPort) : "?";
      const target = port.TargetPort ? String(port.TargetPort) : "?";
      const protocol = (port.Protocol ?? "tcp").toLowerCase();
      return `${published}:${target}/${protocol}`;
    })
    .join(", ");
}

export function ServiceList({
  endpointId,
  onCreateClick,
}: Readonly<ServiceListProps>) {
  const [services, setServices] = useState<SwarmService[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyServiceId, setBusyServiceId] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    if (!endpointId) {
      setServices([]);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/docker/${endpointId}/services`, {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | SwarmService[]
        | { error?: string }
        | null;

      if (!response.ok) {
        const message =
          payload &&
          !Array.isArray(payload) &&
          typeof payload.error === "string"
            ? payload.error
            : "Failed to load services";
        throw new Error(message);
      }

      setServices(Array.isArray(payload) ? payload : []);
    } catch (error) {
      setServices([]);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load services",
      );
    } finally {
      setIsLoading(false);
    }
  }, [endpointId]);

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  const handleRemove = async (serviceId: string) => {
    if (!endpointId) {
      return;
    }

    setBusyServiceId(serviceId);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/docker/${endpointId}/services/${serviceId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const message =
          payload && typeof payload.error === "string"
            ? payload.error
            : "Failed to remove service";
        throw new Error(message);
      }

      await fetchServices();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to remove service",
      );
    } finally {
      setBusyServiceId(null);
    }
  };

  const handleScale = async (service: SwarmService) => {
    if (!endpointId) {
      return;
    }

    const currentMode = service.Spec.Mode;
    const replicated =
      (currentMode as { Replicated?: { Replicas?: number } }).Replicated ??
      null;
    const currentReplicas =
      typeof replicated?.Replicas === "number" ? replicated.Replicas : 0;

    setBusyServiceId(service.ID);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/docker/${endpointId}/services/${service.ID}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: service.Version.Index,
            spec: {
              ...service.Spec,
              Mode: {
                Replicated: {
                  Replicas: currentReplicas + 1,
                },
              },
            },
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const message =
          payload && typeof payload.error === "string"
            ? payload.error
            : "Failed to scale service";
        throw new Error(message);
      }

      await fetchServices();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to scale service",
      );
    } finally {
      setBusyServiceId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl bg-surface-container p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-title-medium text-on-surface">Services</h2>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCreateClick}
            disabled={!endpointId}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Service
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void fetchServices()}
            disabled={!endpointId || isLoading}
            title="Refresh services"
          >
            <RefreshCw
              className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface-container">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-surface-container-highest hover:bg-transparent">
              <TableHead className="text-on-surface-variant">Name</TableHead>
              <TableHead className="text-on-surface-variant">Image</TableHead>
              <TableHead className="text-on-surface-variant">Mode</TableHead>
              <TableHead className="text-on-surface-variant">
                Replicas
              </TableHead>
              <TableHead className="text-on-surface-variant">Ports</TableHead>
              <TableHead className="text-right text-on-surface-variant">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {endpointId ? (
              isLoading ? (
                <>
                  {[...Array(3)].map((_, i) => (
                    <TableRow
                      key={`skeleton-${i}`}
                      className="border-b border-surface-container-highest/50 hover:bg-transparent"
                    >
                      <TableCell colSpan={6} className="py-4">
                        <div className="h-10 w-full animate-pulse rounded bg-surface-container-high" />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ) : errorMessage ? (
                <TableRow className="border-none hover:bg-transparent">
                  <TableCell colSpan={6} className="h-24 text-center">
                    <span className="text-error">{errorMessage}</span>
                  </TableCell>
                </TableRow>
              ) : services.length === 0 ? (
                <TableRow className="border-none hover:bg-transparent">
                  <TableCell colSpan={6} className="h-24 text-center">
                    <span className="text-body-sm text-on-surface-variant">
                      No services found
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow
                    key={service.ID}
                    className="border-b border-surface-container-highest/50 hover:bg-surface-container-high/50"
                  >
                    <TableCell className="font-medium text-on-surface">
                      {service.Spec.Name}
                    </TableCell>
                    <TableCell className="max-w-60 truncate text-body-sm text-on-surface-variant">
                      {parseImage(service.Spec.TaskTemplate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="running">
                        {parseMode(service.Spec.Mode)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-on-surface-variant">
                      {parseReplicas(service.Spec.Mode)}
                    </TableCell>
                    <TableCell className="max-w-65 truncate text-body-sm text-on-surface-variant">
                      {parsePorts(service)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => void handleScale(service)}
                          disabled={busyServiceId === service.ID}
                          title="Scale"
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-error hover:bg-error/10 hover:text-error"
                          onClick={() => void handleRemove(service.ID)}
                          disabled={busyServiceId === service.ID}
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )
            ) : (
              <TableRow className="border-none hover:bg-transparent">
                <TableCell colSpan={6} className="h-24 text-center">
                  <span className="text-body-sm text-on-surface-variant">
                    No endpoint selected
                  </span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
