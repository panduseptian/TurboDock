"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/hooks/use-session";

type AuditLogRow = {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  resource: string | null;
  endpointId: string | null;
  ipAddress: string | null;
  createdAt: string;
};

type AuditResponse = {
  data: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
};

type UserOption = {
  id: string;
  username: string;
};

function actionTone(
  action: string,
): "running" | "created" | "stopped" | "paused" | "default" {
  if (action.includes("create")) {
    return "running";
  }

  if (action.includes("update")) {
    return "created";
  }

  if (action.includes("delete")) {
    return "stopped";
  }

  if (action.includes("login") || action.includes("logout")) {
    return "paused";
  }

  return "default";
}

export default function AuditLogsPage() {
  const { user, loading: sessionLoading } = useSession();
  const canRead = user?.role === "admin";

  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);

  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as UserOption[];
      setUsers(payload);
    } catch {
      setUsers([]);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (actionFilter !== "all") {
        params.set("action", actionFilter);
      }

      if (userFilter !== "all") {
        params.set("userId", userFilter);
      }

      const response = await fetch(`/api/audit-logs?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to load audit logs");
      }

      const payload = (await response.json()) as AuditResponse;
      setLogs(payload.data);
      setTotal(payload.total);
    } catch (requestError) {
      setLogs([]);
      setError((requestError as Error).message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, limit, page, userFilter]);

  useEffect(() => {
    if (!sessionLoading && canRead) {
      void loadUsers();
    }
  }, [sessionLoading, canRead, loadUsers]);

  useEffect(() => {
    if (!sessionLoading && canRead) {
      void loadLogs();
    }
  }, [sessionLoading, canRead, loadLogs]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const uniqueActions = useMemo(() => {
    const actionSet = new Set<string>();
    logs.forEach((entry) => actionSet.add(entry.action));
    return [...actionSet].sort((left, right) => left.localeCompare(right));
  }, [logs]);

  if (sessionLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-6">
        <div className="h-8 w-48 bg-surface-container-high rounded" />
        <div className="h-20 w-full bg-surface-container-high rounded-lg" />
        <div className="h-96 w-full bg-surface-container rounded-xl" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="bg-error-container text-on-error-container rounded-lg p-6">
        <h2 className="title-md mb-2">Permission Denied</h2>
        <p className="body-md">Only admin users can access audit logs.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="headline-md text-on-surface">Audit Logs</h1>
      </div>

      <div className="bg-surface-container-high rounded-lg flex flex-wrap items-end gap-4 p-4">
        <div className="flex flex-col gap-2">
          <label className="label-sm text-on-surface-variant uppercase">
            Action
          </label>
          <select
            value={actionFilter}
            onChange={(event) => {
              setActionFilter(event.target.value);
              setPage(1);
            }}
            className="h-10 px-3 min-w-44 bg-surface text-on-surface border-none rounded-md outline-none focus:ring-2 focus:ring-primary body-sm"
          >
            <option value="all">All actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="label-sm text-on-surface-variant uppercase">
            User
          </label>
          <select
            value={userFilter}
            onChange={(event) => {
              setUserFilter(event.target.value);
              setPage(1);
            }}
            className="h-10 px-3 min-w-44 bg-surface text-on-surface border-none rounded-md outline-none focus:ring-2 focus:ring-primary body-sm"
          >
            <option value="all">All users</option>
            {users.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.username}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-lg body-md">
          {error}
        </div>
      )}

      <div className="bg-surface-container rounded-xl shadow-ambient overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col gap-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-12 w-full bg-surface-container-high rounded"
              />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b-0">
                <TableHead className="text-on-surface-variant">
                  Timestamp
                </TableHead>
                <TableHead className="text-on-surface-variant">User</TableHead>
                <TableHead className="text-on-surface-variant">
                  Action
                </TableHead>
                <TableHead className="text-on-surface-variant">
                  Resource
                </TableHead>
                <TableHead className="text-on-surface-variant">
                  Endpoint
                </TableHead>
                <TableHead className="text-on-surface-variant">
                  IP Address
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((entry) => (
                <TableRow key={entry.id} className="border-b-0">
                  <TableCell className="text-on-surface-variant label-sm font-mono">
                    {new Date(entry.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="body-sm text-on-surface">
                    {entry.username ?? "System"}
                  </TableCell>
                  <TableCell className="body-sm text-on-surface">
                    <Badge status={actionTone(entry.action)}>
                      {entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-on-surface-variant">
                    {entry.resource ?? "-"}
                  </TableCell>
                  <TableCell className="text-on-surface-variant font-mono">
                    {entry.endpointId ?? "-"}
                  </TableCell>
                  <TableCell className="text-on-surface-variant font-mono">
                    {entry.ipAddress ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-on-surface-variant body-sm">
          Page {page} of {totalPages} • {total} total entries
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="bg-surface-container-high hover:bg-surface-container-highest active:bg-surface-container-highest active:text-primary text-on-surface border-none"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((value) => value - 1)}
          >
            <ChevronLeft className="mr-1" />
            Prev
          </Button>
          <Button
            variant="secondary"
            className="bg-surface-container-high hover:bg-surface-container-highest active:bg-surface-container-highest active:text-primary text-on-surface border-none"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
            <ChevronRight className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
