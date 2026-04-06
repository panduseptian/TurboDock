"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkmark, Pencil, Plus, Trash2, X, Zap } from "@/components/ui/icons";
import { useEndpointContext } from "@/contexts/endpoint-context";
import { useSession } from "@/hooks/use-session";

type EndpointType = "standalone" | "swarm";

type Endpoint = {
  id: string;
  name: string;
  url: string;
  type: EndpointType;
};

type ConnectionStatus = "idle" | "checking" | "success" | "failure";

export default function EndpointsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const { refresh: refreshContext } = useEndpointContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>(
    {},
  );

  const [editTarget, setEditTarget] = useState<Endpoint | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Endpoint | null>(null);

  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editType, setEditType] = useState<EndpointType>("standalone");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManage = user?.role === "admin";

  const fetchEndpoints = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/endpoints", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to load endpoints");
      }

      const payload = (await response.json()) as Endpoint[];
      setEndpoints(payload);
    } catch (requestError) {
      setError((requestError as Error).message || "Failed to load endpoints");
      setEndpoints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading && canManage) {
      void fetchEndpoints();
    }
  }, [sessionLoading, canManage]);

  const openEditDialog = (endpoint: Endpoint) => {
    setEditTarget(endpoint);
    setEditName(endpoint.name);
    setEditUrl(endpoint.url);
    setEditType(endpoint.type);
  };

  const testConnection = async (endpointId: string) => {
    setStatuses((prev) => ({ ...prev, [endpointId]: "checking" }));

    try {
      const response = await fetch(`/api/docker/${endpointId}/info`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        setStatuses((prev) => ({ ...prev, [endpointId]: "failure" }));
        return;
      }

      setStatuses((prev) => ({ ...prev, [endpointId]: "success" }));
    } catch {
      setStatuses((prev) => ({ ...prev, [endpointId]: "failure" }));
    }
  };

  const saveEdit = async () => {
    if (!editTarget) {
      return;
    }

    setSavingEdit(true);
    setError(null);

    try {
      const response = await fetch(`/api/endpoints/${editTarget.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: editName,
          url: editUrl,
          type: editType,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to update endpoint");
      }

      setEditTarget(null);
      await fetchEndpoints();
      refreshContext();
    } catch (requestError) {
      setError((requestError as Error).message || "Failed to update endpoint");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteEndpoint = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/endpoints/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to delete endpoint");
      }

      setDeleteTarget(null);
      await fetchEndpoints();
      refreshContext();
    } catch (requestError) {
      setError((requestError as Error).message || "Failed to delete endpoint");
    } finally {
      setDeleting(false);
    }
  };

  const endpointCards = useMemo(
    () =>
      endpoints.map((endpoint) => {
        const state = statuses[endpoint.id] ?? "idle";

        let stateLabel = "Unknown";
        let stateColor = "bg-surface-variant";
        let glowClass = "";

        if (state === "checking") {
          stateLabel = "Checking";
          stateColor = "bg-warning";
        }

        if (state === "success") {
          stateLabel = "Connected";
          stateColor = "bg-primary";
          glowClass = "shadow-[0_0_8px_rgba(var(--color-primary),0.6)]";
        }

        if (state === "failure") {
          stateLabel = "Failed";
          stateColor = "bg-error";
        }

        return (
          <Card
            key={endpoint.id}
            className="bg-surface-container rounded-xl shadow-ambient border-none overflow-hidden"
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="title-md text-on-surface">
                    {endpoint.name}
                  </CardTitle>
                  <CardDescription className="body-sm text-on-surface-variant mt-1 break-all">
                    {endpoint.url}
                  </CardDescription>
                </div>
                <Badge
                  status={endpoint.type === "swarm" ? "created" : "default"}
                >
                  {endpoint.type}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${stateColor} ${glowClass}`}
                />
                <span className="uppercase tracking-wide">{stateLabel}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => {
                    void testConnection(endpoint.id);
                  }}
                  disabled={state === "checking"}
                >
                  {state === "checking" ? (
                    <>
                      <Zap className="mr-1.5 animate-pulse" /> Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-1.5" /> Test
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Edit"
                  onClick={() => openEditDialog(endpoint)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="danger"
                  size="icon"
                  title="Delete"
                  onClick={() => setDeleteTarget(endpoint)}
                >
                  <Trash2 />
                </Button>
              </div>
            </CardContent>

            <CardFooter className="text-xs text-on-surface-variant/50">
              Endpoint ID:{" "}
              <span className="ml-1 text-on-surface-variant">
                {endpoint.id}
              </span>
            </CardFooter>
          </Card>
        );
      }),
    [endpoints, statuses],
  );

  if (sessionLoading) {
    return <div className="text-on-surface-variant">Loading session...</div>;
  }

  if (!canManage) {
    return (
      <div className="rounded-xl border border-error/40 bg-error/10 p-4 text-error">
        Permission denied. Only admin users can access endpoint management.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="headline-md text-on-surface">Endpoints</h1>
          <p className="body-md text-on-surface-variant">
            Manage Docker endpoints and verify connectivity.
          </p>
        </div>
        <Button
          className="gradient-primary text-on-primary"
          onClick={() => router.push("/dashboard/endpoints/new")}
        >
          <Plus className="mr-2" /> Add Endpoint
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-error/40 bg-error/10 p-3 text-sm text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 bg-surface-container-high animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : endpoints.length === 0 ? (
        <div className="rounded-xl bg-surface-container p-8 text-center shadow-ambient">
          <p className="title-md text-on-surface">No endpoints configured.</p>
          <p className="mt-1 body-md text-on-surface-variant">
            Add your first Docker endpoint to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {endpointCards}
        </div>
      )}

      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(open: boolean) => !open && setEditTarget(null)}
      >
        <DialogContent className="bg-surface/80 backdrop-blur-xl border-white/10 shadow-ambient">
          <DialogHeader>
            <DialogTitle className="title-md text-on-surface">
              Edit Endpoint
            </DialogTitle>
            <DialogDescription className="body-sm text-on-surface-variant">
              Update endpoint connection details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              label="Name"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Production Docker"
              className="bg-surface-container-lowest border-none text-on-surface"
            />
            <Input
              label="URL"
              value={editUrl}
              onChange={(event) => setEditUrl(event.target.value)}
              placeholder="http://docker-proxy:2375"
              className="bg-surface-container-lowest border-none text-on-surface"
            />
            <div>
              <label className="mb-2 block text-sm text-on-surface-variant">
                Type
              </label>
              <select
                className="h-10 w-full rounded-md bg-surface-container-lowest border-none px-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                value={editType}
                onChange={(event) =>
                  setEditType(event.target.value as EndpointType)
                }
              >
                <option value="standalone">Standalone</option>
                <option value="swarm">Swarm</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditTarget(null)}
              disabled={savingEdit}
            >
              <X className="mr-1.5" /> Cancel
            </Button>
            <Button
              className="gradient-primary text-on-primary"
              onClick={() => void saveEdit()}
              disabled={savingEdit || !editName || !editUrl}
            >
              <Checkmark className="mr-1.5" />
              {savingEdit ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="bg-surface/80 backdrop-blur-xl border-white/10 shadow-ambient">
          <DialogHeader>
            <DialogTitle className="title-md text-on-surface">
              Delete Endpoint
            </DialogTitle>
            <DialogDescription className="body-sm text-on-surface-variant">
              This action will remove the endpoint configuration. Are you sure
              you want to continue?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              <X className="mr-1.5" /> Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void deleteEndpoint()}
              disabled={deleting}
            >
              <Trash2 className="mr-1.5" />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
