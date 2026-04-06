"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

type EndpointContextValue = {
  endpoints: Endpoint[];
  selectedEndpoint: Endpoint | null;
  setEndpoint: (id: string) => void;
  loading: boolean;
  refresh: () => void;
};

const STORAGE_KEY = "selected-endpoint-id";

const EndpointContext = createContext<EndpointContextValue | undefined>(
  undefined,
);

function resolveSelectedEndpointId(endpoints: Endpoint[]): string | null {
  const storedId = globalThis.localStorage.getItem(STORAGE_KEY);
  const preferredId = storedId || endpoints[0]?.id || null;
  const exists = endpoints.some((endpoint) => endpoint.id === preferredId);
  return exists ? preferredId : endpoints[0]?.id || null;
}

export function EndpointProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const setEndpoint = useCallback((id: string) => {
    setSelectedEndpointId(id);
    globalThis.localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const loadEndpoints = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/endpoints", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        setEndpoints([]);
        setSelectedEndpointId(null);
        globalThis.localStorage.removeItem(STORAGE_KEY);
        return;
      }

      const payload = (await response.json()) as Endpoint[];
      setEndpoints(payload);

      const nextSelectedId = resolveSelectedEndpointId(payload);
      setSelectedEndpointId(nextSelectedId);

      if (nextSelectedId) {
        globalThis.localStorage.setItem(STORAGE_KEY, nextSelectedId);
      } else {
        globalThis.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      setEndpoints([]);
      setSelectedEndpointId(null);
      globalThis.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEndpoints();
  }, [loadEndpoints]);

  const selectedEndpoint = useMemo(
    () =>
      endpoints.find((endpoint) => endpoint.id === selectedEndpointId) ?? null,
    [endpoints, selectedEndpointId],
  );

  const value = useMemo<EndpointContextValue>(
    () => ({
      endpoints,
      selectedEndpoint,
      setEndpoint,
      loading,
      refresh: () => {
        void loadEndpoints();
      },
    }),
    [endpoints, selectedEndpoint, setEndpoint, loading, loadEndpoints],
  );

  return (
    <EndpointContext.Provider value={value}>
      {children}
    </EndpointContext.Provider>
  );
}

export function useEndpointContext(): EndpointContextValue {
  const context = useContext(EndpointContext);
  if (!context) {
    throw new Error(
      "useEndpointContext must be used within an EndpointProvider",
    );
  }

  return context;
}
