"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ArrowDown, Clock, RefreshCw } from "@/components/ui/icons";
import { useEndpointContext } from "@/contexts/endpoint-context";
import { truncateId } from "@/lib/formatters";

type TailOption = "10" | "50" | "100" | "500" | "1000" | "all";

const TAIL_OPTIONS: TailOption[] = ["10", "50", "100", "500", "1000", "all"];

function escapeRegex(value: string) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getContainerIdParam(idParam: string | string[] | undefined) {
  if (Array.isArray(idParam)) return idParam[0] ?? "";
  return idParam ?? "";
}

export default function ContainerLogsPage() {
  const params = useParams();
  const containerId = getContainerIdParam(
    params.id as string | string[] | undefined,
  );
  const { selectedEndpoint } = useEndpointContext();

  const [tail, setTail] = useState<TailOption>("10");
  const [timestamps, setTimestamps] = useState(true);
  const [follow, setFollow] = useState(true);
  const [search, setSearch] = useState("");

  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preRef = useRef<HTMLPreElement>(null);

  const fetchLogs = useCallback(
    async ({ background }: { background: boolean }) => {
      if (!selectedEndpoint?.id || !containerId) return;

      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);
      setLogs("");

      try {
        const res = await fetch(
          `/api/docker/${selectedEndpoint.id}/containers/${containerId}/logs?tail=${tail}&timestamps=${String(timestamps)}`,
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        if (!res.body) {
          const fullText = await res.text();
          setLogs(fullText);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let output = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          output += decoder.decode(value, { stream: true });
          setLogs(output);
        }

        output += decoder.decode();
        setLogs(output);
      } catch (fetchError) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to fetch logs";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedEndpoint?.id, containerId, tail, timestamps],
  );

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((sessionData) => {
        if (sessionData?.user) {
          // Session is resolved here to keep behavior aligned with dashboard pages.
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedEndpoint?.id) {
      setLoading(false);
      setError("No endpoints configured");
      return;
    }

    fetchLogs({ background: false });
  }, [selectedEndpoint?.id, tail, timestamps, fetchLogs]);

  useEffect(() => {
    if (!follow || !selectedEndpoint?.id) return;

    const interval = setInterval(() => {
      fetchLogs({ background: true });
    }, 3000);

    return () => clearInterval(interval);
  }, [follow, selectedEndpoint?.id, fetchLogs]);

  useEffect(() => {
    if (!follow) return;

    requestAnimationFrame(() => {
      if (preRef.current) {
        preRef.current.scrollTop = preRef.current.scrollHeight;
      }
    });
  }, [logs, follow]);

  const normalizedSearch = search.trim().toLowerCase();
  const lines = logs ? logs.split(/\r?\n/) : [];

  const filteredLines = normalizedSearch
    ? lines.filter((line) => line.toLowerCase().includes(normalizedSearch))
    : lines;

  const highlightedHtml = (() => {
    const visibleLogs = filteredLines.join("\n");
    if (!normalizedSearch) {
      return escapeHtml(visibleLogs);
    }

    const regex = new RegExp(`(${escapeRegex(search.trim())})`, "ig");
    return visibleLogs
      .split(regex)
      .map((part) => {
        if (part.toLowerCase() === normalizedSearch) {
          return `<mark class="bg-yellow-400/30 text-yellow-200">${escapeHtml(part)}</mark>`;
        }
        return escapeHtml(part);
      })
      .join("");
  })();

  const emptyState =
    !loading && !error && filteredLines.every((line) => !line.trim());

  return (
    <div className="space-y-6 flex flex-col min-h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <Link
          href="/dashboard/containers"
          className="hover:text-on-surface transition-colors"
        >
          Containers
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/containers/${containerId}`}
          className="hover:text-on-surface transition-colors font-mono"
        >
          {truncateId(containerId)}
        </Link>
        <span>/</span>
        <span className="text-on-surface">Logs</span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <h1 className="headline-md text-on-surface">Container Logs</h1>
        <Link
          href={`/dashboard/containers/${containerId}`}
          className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium bg-surface-container-high text-on-surface rounded-lg hover:bg-surface-container-highest transition-colors"
        >
          Back to container
        </Link>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <div className="bg-surface-container rounded-xl p-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-surface-container-high rounded-lg p-1">
            {TAIL_OPTIONS.map((option) => {
              const active = tail === option;
              return (
                <button
                  key={option}
                  onClick={() => setTail(option)}
                  className={`h-8 px-3 text-sm font-medium rounded-md transition-colors ${
                    active
                      ? "bg-surface-container-highest text-on-surface"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50"
                  }`}
                >
                  {option === "all" ? "All" : option}
                </button>
              );
            })}
          </div>

          <div className="flex items-center bg-surface-container-high rounded-lg p-1">
            <button
              onClick={() => setTimestamps((current) => !current)}
              className={`h-8 px-3 text-sm font-medium rounded-md flex items-center transition-colors ${
                timestamps
                  ? "bg-surface-container-highest text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50"
              }`}
            >
              <Clock className="mr-1.5 h-4 w-4" />
              Timestamps
            </button>
          </div>

          <div className="flex-1 min-w-[200px] max-w-sm">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search logs..."
              className="h-10 bg-surface-container-lowest border-none focus-visible:ring-1 focus-visible:ring-primary text-on-surface placeholder:text-on-surface-variant"
            />
          </div>

          <div className="flex items-center bg-surface-container-high rounded-lg p-1 gap-1">
            <button
              onClick={() => setFollow((current) => !current)}
              className={`h-8 px-3 text-sm font-medium rounded-md flex items-center transition-colors ${
                follow
                  ? "bg-surface-container-highest text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50"
              }`}
            >
              <ArrowDown className="mr-1.5 h-4 w-4" />
              Follow
            </button>
            <button
              onClick={() => fetchLogs({ background: true })}
              className="h-8 px-3 text-sm font-medium rounded-md flex items-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50 transition-colors"
            >
              <RefreshCw
                className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-4 flex-1 overflow-hidden flex flex-col min-h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-on-surface-variant animate-pulse font-medium">
              Loading logs...
            </div>
          ) : emptyState ? (
            <div className="flex items-center justify-center h-full text-on-surface-variant font-medium">
              No logs available
            </div>
          ) : (
            <pre
              ref={preRef}
              className="font-mono text-sm text-on-surface overflow-auto whitespace-pre-wrap break-all leading-relaxed flex-1"
            >
              {error ? (
                <span className="text-error font-medium">{error}</span>
              ) : (
                <span dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
              )}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
