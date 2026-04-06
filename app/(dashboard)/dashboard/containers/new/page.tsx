"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Play, Trash2, X } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { useEndpointContext } from "@/contexts/endpoint-context";

type PortMapping = {
  hostPort: string;
  containerPort: string;
  protocol: "tcp" | "udp";
};

type ContainerCreateConfig = {
  name?: string;
  Image: string;
  Cmd?: string[];
  Env?: string[];
  ExposedPorts?: Record<string, Record<string, never>>;
  WorkingDir?: string;
  User?: string;
  Hostname?: string;
  Tty?: boolean;
  HostConfig?: {
    Binds?: string[];
    PortBindings?: Record<string, Array<{ HostPort: string }>>;
    RestartPolicy?: {
      Name: "no" | "always" | "unless-stopped" | "on-failure";
    };
    NetworkMode?: string;
    Privileged?: boolean;
  };
};

type CreatedContainerResponse = {
  Id?: string;
  Warnings?: string[];
};

const EMPTY_ENV_ROW = "";
const EMPTY_BIND_ROW = "";
const EMPTY_PORT_ROW: PortMapping = {
  hostPort: "",
  containerPort: "",
  protocol: "tcp",
};

export default function NewContainerPage() {
  const router = useRouter();
  const { selectedEndpoint } = useEndpointContext();

  const [containerName, setContainerName] = useState("");
  const [image, setImage] = useState("");
  const [command, setCommand] = useState("");

  const [envVars, setEnvVars] = useState<string[]>([EMPTY_ENV_ROW]);
  const [portMappings, setPortMappings] = useState<PortMapping[]>([
    EMPTY_PORT_ROW,
  ]);
  const [bindMounts, setBindMounts] = useState<string[]>([EMPTY_BIND_ROW]);

  const [restartPolicy, setRestartPolicy] = useState<
    "no" | "always" | "unless-stopped" | "on-failure"
  >("no");

  const [workingDir, setWorkingDir] = useState("");
  const [userValue, setUserValue] = useState("");
  const [hostname, setHostname] = useState("");
  const [networkMode, setNetworkMode] = useState("");
  const [privileged, setPrivileged] = useState(false);
  const [tty, setTty] = useState(false);

  const [startAfterCreate, setStartAfterCreate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageError = useMemo(() => {
    if (!image.trim()) {
      return "IMAGE IS REQUIRED";
    }

    return null;
  }, [image]);

  const canSubmit = !submitting && !imageError && Boolean(selectedEndpoint?.id);

  const updateEnvAt = (index: number, value: string) => {
    setEnvVars((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const addEnvRow = () => {
    setEnvVars((previous) => [...previous, EMPTY_ENV_ROW]);
  };

  const removeEnvRow = (index: number) => {
    setEnvVars((previous) => {
      if (previous.length === 1) {
        return [EMPTY_ENV_ROW];
      }
      return previous.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const updatePortAt = (
    index: number,
    field: keyof PortMapping,
    value: string,
  ) => {
    setPortMappings((previous) => {
      const next = [...previous];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const addPortRow = () => {
    setPortMappings((previous) => [...previous, { ...EMPTY_PORT_ROW }]);
  };

  const removePortRow = (index: number) => {
    setPortMappings((previous) => {
      if (previous.length === 1) {
        return [{ ...EMPTY_PORT_ROW }];
      }
      return previous.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const updateBindAt = (index: number, value: string) => {
    setBindMounts((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const addBindRow = () => {
    setBindMounts((previous) => [...previous, EMPTY_BIND_ROW]);
  };

  const removeBindRow = (index: number) => {
    setBindMounts((previous) => {
      if (previous.length === 1) {
        return [EMPTY_BIND_ROW];
      }
      return previous.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const buildCreateConfig = (): ContainerCreateConfig => {
    const config: ContainerCreateConfig = {
      Image: image.trim(),
    };

    if (containerName.trim()) {
      config.name = containerName.trim();
    }

    if (command.trim()) {
      const cmd = command
        .trim()
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean);
      if (cmd.length > 0) {
        config.Cmd = cmd;
      }
    }

    const normalizedEnv = envVars
      .map((entry) => entry.trim())
      .filter((entry) => {
        if (!entry) {
          return false;
        }

        const separatorIndex = entry.indexOf("=");
        return separatorIndex > 0;
      });

    if (normalizedEnv.length > 0) {
      config.Env = normalizedEnv;
    }

    const portBindings: Record<string, Array<{ HostPort: string }>> = {};
    const exposedPorts: Record<string, Record<string, never>> = {};

    for (const mapping of portMappings) {
      const containerPort = mapping.containerPort.trim();
      if (!containerPort) {
        continue;
      }

      const protocol = mapping.protocol || "tcp";
      const key = `${containerPort}/${protocol}`;
      exposedPorts[key] = {};
      portBindings[key] = [{ HostPort: mapping.hostPort.trim() }];
    }

    if (Object.keys(exposedPorts).length > 0) {
      config.ExposedPorts = exposedPorts;
    }

    const hostConfig: NonNullable<ContainerCreateConfig["HostConfig"]> = {
      RestartPolicy: {
        Name: restartPolicy,
      },
    };

    if (Object.keys(portBindings).length > 0) {
      hostConfig.PortBindings = portBindings;
    }

    const binds = bindMounts
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    if (binds.length > 0) {
      hostConfig.Binds = binds;
    }

    if (networkMode.trim()) {
      hostConfig.NetworkMode = networkMode.trim();
    }

    if (privileged) {
      hostConfig.Privileged = true;
    }

    if (Object.keys(hostConfig).length > 0) {
      config.HostConfig = hostConfig;
    }

    if (workingDir.trim()) {
      config.WorkingDir = workingDir.trim();
    }

    if (userValue.trim()) {
      config.User = userValue.trim();
    }

    if (hostname.trim()) {
      config.Hostname = hostname.trim();
    }

    if (tty) {
      config.Tty = true;
    }

    return config;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);

    if (!selectedEndpoint?.id) {
      setError("SELECT AN ENDPOINT BEFORE CREATING A CONTAINER");
      return;
    }

    if (imageError) {
      setError(imageError);
      return;
    }

    setSubmitting(true);

    try {
      const payload = buildCreateConfig();

      const createResponse = await fetch(
        `/api/docker/${selectedEndpoint.id}/containers`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!createResponse.ok) {
        const failed = (await createResponse.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        throw new Error(
          failed?.error ||
            failed?.message ||
            "FAILED TO CREATE CONTAINER. CHECK INPUT AND TRY AGAIN.",
        );
      }

      const created = (await createResponse.json()) as CreatedContainerResponse;
      const createdId = created?.Id;

      if (startAfterCreate && createdId) {
        const startResponse = await fetch(
          `/api/docker/${selectedEndpoint.id}/containers/${createdId}/start`,
          {
            method: "POST",
            credentials: "include",
          },
        );

        if (!startResponse.ok) {
          const failed = (await startResponse.json().catch(() => null)) as {
            error?: string;
            message?: string;
          } | null;
          throw new Error(
            failed?.error ||
              failed?.message ||
              "CONTAINER CREATED BUT FAILED TO START.",
          );
        }
      }

      router.push("/dashboard/containers");
    } catch (submitError) {
      setError((submitError as Error).message || "FAILED TO CREATE CONTAINER");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 text-on-surface">
      <div className="space-y-2">
        <h1 className="headline-md text-on-surface">Create Container</h1>
        <p className="text-sm text-on-surface-variant">
          Configure and create a container on the selected endpoint.
        </p>
      </div>

      {!selectedEndpoint?.id && (
        <div className="rounded-lg bg-error-container/20 p-4 text-sm text-error">
          No endpoint selected. Choose an endpoint to continue.
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-error-container/20 p-4 text-sm text-error">
          {error}
        </div>
      )}

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Basic Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="label-sm">Container Name</label>
              <Input
                value={containerName}
                onChange={(event) => setContainerName(event.target.value)}
                placeholder="Optional"
                className="bg-surface-container-lowest border-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-sm">
                Image <span className="text-error">*</span>
              </label>
              <Input
                value={image}
                onChange={(event) => setImage(event.target.value)}
                placeholder="e.g. nginx:latest"
                required
                className="bg-surface-container-lowest border-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-sm">Command</label>
              <Input
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                placeholder="e.g. sh -c nginx -g 'daemon off;'"
                className="bg-surface-container-lowest border-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Environment Variables</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addEnvRow}
              className="text-primary hover:bg-surface-container-highest/40"
            >
              <Plus className="mr-1.5" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {envVars.map((entry, index) => (
              <div
                key={`env-${index}`}
                className="flex items-center gap-2 bg-surface-container-high rounded-lg p-3"
              >
                <Input
                  value={entry}
                  onChange={(event) => updateEnvAt(index, event.target.value)}
                  placeholder="KEY=VALUE"
                  className="bg-surface-container-lowest border-none focus-visible:ring-2 focus-visible:ring-primary/40"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm-icon"
                  onClick={() => removeEnvRow(index)}
                  aria-label="Remove environment variable"
                  className="text-error hover:bg-error-container/30"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Port Mappings</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addPortRow}
              className="text-primary hover:bg-surface-container-highest/40"
            >
              <Plus className="mr-1.5" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {portMappings.map((mapping, index) => (
              <div
                key={`port-${index}`}
                className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_100px_auto] bg-surface-container-high rounded-lg p-3"
              >
                <div className="space-y-1">
                  <label className="label-sm">Host Port</label>
                  <Input
                    value={mapping.hostPort}
                    onChange={(event) =>
                      updatePortAt(index, "hostPort", event.target.value)
                    }
                    placeholder="Host"
                    className="bg-surface-container-lowest border-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="label-sm">Container Port</label>
                  <Input
                    value={mapping.containerPort}
                    onChange={(event) =>
                      updatePortAt(index, "containerPort", event.target.value)
                    }
                    placeholder="Container"
                    className="bg-surface-container-lowest border-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="label-sm">Protocol</label>
                  <select
                    value={mapping.protocol}
                    onChange={(event) =>
                      updatePortAt(
                        index,
                        "protocol",
                        event.target.value as "tcp" | "udp",
                      )
                    }
                    className="bg-surface-container-lowest text-on-surface rounded-md h-10 px-3 outline-none focus:ring-2 focus:ring-primary/40 w-full border-none"
                  >
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm-icon"
                    onClick={() => removePortRow(index)}
                    aria-label="Remove port mapping"
                    className="text-error hover:bg-error-container/30"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Volumes / Bind Mounts</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addBindRow}
              className="text-primary hover:bg-surface-container-highest/40"
            >
              <Plus className="mr-1.5" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {bindMounts.map((entry, index) => (
              <div
                key={`bind-${index}`}
                className="flex items-center gap-2 bg-surface-container-high rounded-lg p-3"
              >
                <Input
                  value={entry}
                  onChange={(event) => updateBindAt(index, event.target.value)}
                  placeholder="/host/path:/container/path"
                  className="bg-surface-container-lowest border-none focus-visible:ring-2 focus-visible:ring-primary/40"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm-icon"
                  onClick={() => removeBindRow(index)}
                  aria-label="Remove bind mount"
                  className="text-error hover:bg-error-container/30"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restart Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={restartPolicy}
              onChange={(event) =>
                setRestartPolicy(
                  event.target.value as
                    | "no"
                    | "always"
                    | "unless-stopped"
                    | "on-failure",
                )
              }
              className="bg-surface-container-lowest text-on-surface rounded-md h-10 px-3 outline-none focus:ring-2 focus:ring-primary/40 w-full max-w-sm border-none"
            >
              <option value="no">No</option>
              <option value="always">Always</option>
              <option value="unless-stopped">Unless-stopped</option>
              <option value="on-failure">On-failure</option>
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Advanced</CardTitle>
          </CardHeader>
          <CardContent>
            <details className="group border border-white/5 rounded-lg">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm text-on-surface-variant hover:text-on-surface group-open:border-b group-open:border-white/5 bg-surface-container-high rounded-t-lg">
                Toggle Advanced Options
              </summary>
              <div className="space-y-4 p-4 bg-surface-container-high/50 rounded-b-lg">
                <div className="space-y-1.5">
                  <label className="label-sm">Working Directory</label>
                  <Input
                    value={workingDir}
                    onChange={(event) => setWorkingDir(event.target.value)}
                    placeholder="Optional"
                    className="bg-surface-container-lowest border-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label-sm">User</label>
                  <Input
                    value={userValue}
                    onChange={(event) => setUserValue(event.target.value)}
                    placeholder="Optional"
                    className="bg-surface-container-lowest border-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label-sm">Hostname</label>
                  <Input
                    value={hostname}
                    onChange={(event) => setHostname(event.target.value)}
                    placeholder="Optional"
                    className="bg-surface-container-lowest border-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label-sm">Network Mode</label>
                  <Input
                    value={networkMode}
                    onChange={(event) => setNetworkMode(event.target.value)}
                    placeholder="e.g. bridge, host"
                    className="bg-surface-container-lowest border-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </div>

                <div className="flex flex-wrap gap-6 text-sm text-on-surface-variant pt-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={privileged}
                      onChange={(event) => setPrivileged(event.target.checked)}
                      className="h-4 w-4 bg-transparent accent-primary"
                    />
                    Privileged
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={tty}
                      onChange={(event) => setTty(event.target.checked)}
                      className="h-4 w-4 bg-transparent accent-primary"
                    />
                    TTY
                  </label>
                </div>
              </div>
            </details>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-6">
            <label className="inline-flex items-center gap-2 text-sm text-on-surface-variant">
              <input
                type="checkbox"
                checked={startAfterCreate}
                onChange={(event) => setStartAfterCreate(event.target.checked)}
                className="h-4 w-4 bg-transparent accent-primary"
              />
              <Play className="h-4 w-4" />
              Start after creation
            </label>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/dashboard/containers")}
                disabled={submitting}
                className="text-primary hover:text-primary/80"
              >
                <X className="mr-1.5" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="gradient-primary text-on-primary font-semibold"
              >
                {submitting ? "Creating..." : "Create Container"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
