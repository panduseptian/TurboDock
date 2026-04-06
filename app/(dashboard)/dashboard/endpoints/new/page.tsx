"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkmark, X, Zap } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { useEndpointContext } from "@/contexts/endpoint-context";
import { useSession } from "@/hooks/use-session";

type EndpointType = "standalone" | "swarm";

type CreatedEndpoint = {
  id: string;
};

function isValidUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function NewEndpointPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const { refresh: refreshContext } = useEndpointContext();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<EndpointType>("standalone");

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const canManage = user?.role === "admin";

  const validationError = useMemo(() => {
    if (!name.trim()) {
      return "Name is required.";
    }

    if (!url.trim()) {
      return "URL is required.";
    }

    if (!isValidUrl(url.trim())) {
      return "URL format is invalid. Use http:// or https://.";
    }

    return null;
  }, [name, url]);

  const testConnection = async () => {
    setError(null);
    setTestStatus(null);

    if (validationError) {
      setError(validationError);
      return;
    }

    setTesting(true);

    let temporaryEndpointId: string | null = null;

    try {
      const createResponse = await fetch("/api/endpoints", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: `${name.trim()} (connection-test-${Date.now()})`,
          url: url.trim(),
          type,
        }),
      });

      if (!createResponse.ok) {
        const payload = (await createResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to prepare connection test");
      }

      const created = (await createResponse.json()) as CreatedEndpoint;
      temporaryEndpointId = created.id;

      const infoResponse = await fetch(`/api/docker/${created.id}/info`, {
        method: "GET",
        credentials: "include",
      });

      if (!infoResponse.ok) {
        const payload = (await infoResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Connection test failed");
      }

      setTestStatus("Connection successful.");
    } catch (requestError) {
      setError((requestError as Error).message || "Connection test failed");
    } finally {
      if (temporaryEndpointId) {
        await fetch(`/api/endpoints/${temporaryEndpointId}`, {
          method: "DELETE",
          credentials: "include",
        }).catch(() => null);
      }
      setTesting(false);
    }
  };

  const saveEndpoint = async () => {
    setError(null);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/endpoints", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          type,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to create endpoint");
      }

      refreshContext();
      router.replace("/dashboard/endpoints");
    } catch (requestError) {
      setError((requestError as Error).message || "Failed to create endpoint");
    } finally {
      setSaving(false);
    }
  };

  if (sessionLoading) {
    return <div className="text-on-surface-variant">Loading session...</div>;
  }

  if (!canManage) {
    return (
      <div className="text-error bg-error-container/20 rounded-lg p-4">
        Permission denied. Only admin users can add endpoints.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="headline-md text-on-surface">Add Endpoint</h1>
        <p className="text-on-surface-variant mt-1">
          Create a Docker endpoint configuration.
        </p>
      </div>

      <Card className="bg-surface-container rounded-xl shadow-ambient border-none">
        <CardHeader>
          <CardTitle className="text-on-surface">Endpoint Details</CardTitle>
          <CardDescription className="text-on-surface-variant">
            Define where TurboDock connects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Production Cluster"
            required
            className="bg-surface-container-lowest"
          />

          <Input
            label="URL"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="http://docker-proxy:2375"
            required
            className="bg-surface-container-lowest"
          />

          <div className="space-y-2">
            <p className="label-sm text-on-surface-variant">Type</p>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 label-sm text-on-surface cursor-pointer">
                <input
                  type="radio"
                  name="endpoint-type"
                  value="standalone"
                  checked={type === "standalone"}
                  onChange={() => setType("standalone")}
                  className="accent-primary"
                />
                Standalone
              </label>
              <label className="inline-flex items-center gap-2 label-sm text-on-surface cursor-pointer">
                <input
                  type="radio"
                  name="endpoint-type"
                  value="swarm"
                  checked={type === "swarm"}
                  onChange={() => setType("swarm")}
                  className="accent-primary"
                />
                Swarm
              </label>
            </div>
          </div>

          {error && (
            <div className="text-error bg-error-container/20 rounded-lg p-3">
              {error}
            </div>
          )}

          {testStatus && (
            <div className="text-success bg-success/20 rounded-lg p-3">
              {testStatus}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => void testConnection()}
              disabled={testing || saving}
              className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
            >
              {testing ? (
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
              onClick={() => void saveEndpoint()}
              disabled={saving || testing || Boolean(validationError)}
              className="gradient-primary text-on-primary font-semibold border-none"
            >
              <Checkmark className="mr-1.5" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard/endpoints")}
              disabled={saving || testing}
              className="text-primary hover:text-primary/80 hover:bg-transparent"
            >
              <X className="mr-1.5" /> Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
