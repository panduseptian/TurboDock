"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type EndpointType = "standalone" | "swarm";

export type Endpoint = {
  id: string;
  name: string;
  url: string;
  type: EndpointType;
  tlsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "selected-endpoint-id";

export function useEndpoint() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const setEndpoint = useCallback((endpointId: string) => {
    setSelectedEndpointId(endpointId);
    globalThis.localStorage.setItem(STORAGE_KEY, endpointId);
  }, []);

  useEffect(() => {
    let active = true;

    const loadEndpoints = async () => {
      setLoading(true);

      try {
        const response = await fetch("/api/endpoints", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (active) {
            setEndpoints([]);
          }
          return;
        }

        const payload = (await response.json()) as Endpoint[];
        if (!active) {
          return;
        }

        setEndpoints(payload);

        const stored = globalThis.localStorage.getItem(STORAGE_KEY);
        const preferredId = stored || payload[0]?.id || null;
        const exists = payload.some((endpoint) => endpoint.id === preferredId);
        const fallbackId = exists ? preferredId : payload[0]?.id || null;

        setSelectedEndpointId(fallbackId);
        if (fallbackId) {
          globalThis.localStorage.setItem(STORAGE_KEY, fallbackId);
        } else {
          globalThis.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        if (active) {
          setEndpoints([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadEndpoints();

    return () => {
      active = false;
    };
  }, []);

  const selectedEndpoint = useMemo(
    () =>
      endpoints.find((endpoint) => endpoint.id === selectedEndpointId) ?? null,
    [endpoints, selectedEndpointId],
  );

  return {
    endpoints,
    selectedEndpoint,
    setEndpoint,
    loading,
  };
}
