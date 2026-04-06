"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  Container,
  ContainerStats,
  DockerInfo,
  Image,
  Network,
  SwarmNode,
  SwarmService,
  SwarmTask,
  VolumeListResponse,
} from "@/lib/docker/types";

type HookOptions = {
  refreshInterval?: number;
};

type DockerFetchState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
};

type ApiError = {
  error?: string;
  message?: string;
};

function buildDockerPath(endpointId: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/api/docker/${endpointId}${normalized}`;
}

export function useDockerData<T>(
  endpointId: string | null,
  path: string,
  options?: HookOptions,
): DockerFetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(endpointId));
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTick((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!endpointId) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let active = true;

    const loadData = async () => {
      setLoading(true);

      try {
        const response = await fetch(buildDockerPath(endpointId, path), {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = (await response
            .json()
            .catch(() => null)) as ApiError | null;
          const message =
            payload?.error ??
            payload?.message ??
            `Request failed with status ${response.status}`;

          if (active) {
            setError(message);
            setData(null);
          }
          return;
        }

        const payload = (await response.json()) as T;
        if (active) {
          setData(payload);
          setError(null);
        }
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }

        if (active) {
          setError((fetchError as Error).message || "Failed to fetch data");
          setData(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
      controller.abort();
    };
  }, [endpointId, path, refreshTick]);

  useEffect(() => {
    if (!options?.refreshInterval || options.refreshInterval <= 0) {
      return;
    }

    const timer = globalThis.setInterval(() => {
      setRefreshTick((value) => value + 1);
    }, options.refreshInterval);

    return () => {
      globalThis.clearInterval(timer);
    };
  }, [options?.refreshInterval]);

  return { data, error, loading, refresh };
}

export function useContainers(endpointId: string | null) {
  return useDockerData<Container[]>(endpointId, "/containers");
}

export function useImages(endpointId: string | null) {
  return useDockerData<Image[]>(endpointId, "/images");
}

export function useNetworks(endpointId: string | null) {
  return useDockerData<Network[]>(endpointId, "/networks");
}

export function useVolumes(endpointId: string | null) {
  return useDockerData<VolumeListResponse>(endpointId, "/volumes");
}

export function useServices(endpointId: string | null) {
  return useDockerData<SwarmService[]>(endpointId, "/services");
}

export function useNodes(endpointId: string | null) {
  return useDockerData<SwarmNode[]>(endpointId, "/nodes");
}

export function useTasks(endpointId: string | null, serviceId?: string) {
  const query = useMemo(() => {
    if (!serviceId) {
      return "/tasks";
    }

    const params = new URLSearchParams({ service: serviceId });
    return `/tasks?${params.toString()}`;
  }, [serviceId]);

  return useDockerData<SwarmTask[]>(endpointId, query);
}

export function useDockerInfo(endpointId: string | null) {
  return useDockerData<DockerInfo>(endpointId, "/info", {
    refreshInterval: 20000,
  });
}

export function useContainerStats(
  endpointId: string | null,
  containerId: string,
): {
  data: ContainerStats | null;
  error: string | null;
  loading: boolean;
  connected: boolean;
} {
  const [data, setData] = useState<ContainerStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const canConnect = Boolean(endpointId && containerId);

  useEffect(() => {
    if (!canConnect) {
      return;
    }

    const resolvedEndpointId = endpointId;
    if (!resolvedEndpointId) {
      return;
    }

    const source = new EventSource(
      `/api/docker/${resolvedEndpointId}/containers/${containerId}/stats`,
    );

    source.onopen = () => {
      setConnected(true);
      setError(null);
    };

    source.onmessage = (event) => {
      try {
        setData(JSON.parse(event.data) as ContainerStats);
        setError(null);
      } catch {
        setError("Failed to parse container stats payload");
      }
    };

    source.onerror = () => {
      setConnected(false);
      setError("Container stats stream disconnected");
      source.close();
    };

    return () => {
      source.close();
    };
  }, [canConnect, containerId, endpointId]);

  if (!canConnect) {
    return {
      data: null,
      error: null,
      loading: false,
      connected: false,
    };
  }

  const loading = !connected && error === null;
  return { data, error, loading, connected };
}
