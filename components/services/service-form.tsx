"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkmark, Plus, Trash2 } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";

export type ServiceFormValues = {
  name: string;
  image: string;
  replicas: number;
  command: string;
  args: string;
  workingDir: string;
  user: string;
  hostname: string;
  tty: boolean;
  envVars: string[];
  labels: string[];
  constraints: string[];
  mounts: MountEntry[];
  portMappings: PortEntry[];
  networks: string[];
  restartCondition: "none" | "on-failure" | "any";
  restartDelay: string;
  restartMaxAttempts: string;
  updateParallelism: string;
  updateDelay: string;
  updateOrder: "stop-first" | "start-first";
  rollbackParallelism: string;
  rollbackDelay: string;
  rollbackOrder: "stop-first" | "start-first";
  limitCpus: string;
  limitMemory: string;
  reserveCpus: string;
  reserveMemory: string;
};

type MountEntry = {
  type: "bind" | "volume" | "tmpfs";
  source: string;
  target: string;
  readOnly: boolean;
};

type PortEntry = {
  publishedPort: string;
  targetPort: string;
  protocol: "tcp" | "udp";
  publishMode: "ingress" | "host";
};

type ServiceFormProps = {
  initialValues?: Partial<ServiceFormValues>;
  onSubmit: (payload: Record<string, unknown>) => Promise<void> | void;
  submitLabel?: string;
  disabled?: boolean;
};

type StringListField = "envVars" | "labels" | "constraints" | "networks";

const EMPTY_KEY_VALUE_ROW = "";
const EMPTY_CONSTRAINT_ROW = "";
const EMPTY_NETWORK_ROW = "";

const EMPTY_PORT_ROW: PortEntry = {
  publishedPort: "",
  targetPort: "",
  protocol: "tcp",
  publishMode: "ingress",
};

const EMPTY_MOUNT_ROW: MountEntry = {
  type: "bind",
  source: "",
  target: "",
  readOnly: false,
};

function createRowKey(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function splitCommandLine(value: string): string[] | undefined {
  const parts = value
    .trim()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : undefined;
}

function parseKeyValueList(
  values: string[],
): Record<string, string> | undefined {
  const pairs = values
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separatorIndex = item.indexOf("=");
      if (separatorIndex <= 0) {
        return null;
      }

      const key = item.slice(0, separatorIndex).trim();
      const value = item.slice(separatorIndex + 1).trim();
      if (!key) {
        return null;
      }

      return [key, value] as const;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);

  if (pairs.length === 0) {
    return undefined;
  }

  return Object.fromEntries(pairs);
}

function parseDurationToNanoseconds(value: string): number | undefined {
  const raw = value.trim().toLowerCase();
  if (!raw) {
    return undefined;
  }

  const match = /^(\d+(?:\.\d+)?)(ns|us|µs|ms|s|m|h)$/.exec(raw);
  if (!match) {
    return undefined;
  }

  const magnitude = Number(match[1]);
  if (!Number.isFinite(magnitude)) {
    return undefined;
  }

  const unitToNanos: Record<string, number> = {
    ns: 1,
    us: 1_000,
    µs: 1_000,
    ms: 1_000_000,
    s: 1_000_000_000,
    m: 60_000_000_000,
    h: 3_600_000_000_000,
  };

  const factor = unitToNanos[match[2]];
  return Math.round(magnitude * factor);
}

function parseMemoryToBytes(value: string): number | undefined {
  const raw = value.trim().toLowerCase();
  if (!raw) {
    return undefined;
  }

  const match = /^(\d+(?:\.\d+)?)([bkmgt])?$/.exec(raw);
  if (!match) {
    return undefined;
  }

  const magnitude = Number(match[1]);
  if (!Number.isFinite(magnitude)) {
    return undefined;
  }

  const unit = match[2] ?? "b";
  const unitToBytes: Record<string, number> = {
    b: 1,
    k: 1024,
    m: 1024 ** 2,
    g: 1024 ** 3,
    t: 1024 ** 4,
  };

  return Math.round(magnitude * unitToBytes[unit]);
}

function parseCpuToNanoCpus(value: string): number | undefined {
  const raw = value.trim();
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return Math.round(parsed * 1_000_000_000);
}

function toDockerServiceSpec(
  values: ServiceFormValues,
): Record<string, unknown> {
  const normalizedName = values.name.trim();
  const normalizedImage = values.image.trim();

  const labels = parseKeyValueList(values.labels);
  const command = splitCommandLine(values.command);
  const args = splitCommandLine(values.args);

  const env = values.envVars
    .map((entry) => entry.trim())
    .filter((entry) => entry.includes("=") && entry.indexOf("=") > 0);

  const mounts: Array<Record<string, unknown>> = [];
  for (const mount of values.mounts) {
    const source = mount.source.trim();
    const target = mount.target.trim();
    if (!target) {
      continue;
    }

    if (mount.type === "tmpfs") {
      mounts.push({
        Type: "tmpfs",
        Target: target,
        ...(mount.readOnly ? { ReadOnly: true } : {}),
      });
      continue;
    }

    if (!source) {
      continue;
    }

    mounts.push({
      Type: mount.type,
      Source: source,
      Target: target,
      ...(mount.readOnly ? { ReadOnly: true } : {}),
    });
  }

  const constraints = values.constraints
    .map((constraint) => constraint.trim())
    .filter(Boolean);

  const limitNanoCpus = parseCpuToNanoCpus(values.limitCpus);
  const limitMemoryBytes = parseMemoryToBytes(values.limitMemory);
  const reserveNanoCpus = parseCpuToNanoCpus(values.reserveCpus);
  const reserveMemoryBytes = parseMemoryToBytes(values.reserveMemory);

  const limits =
    typeof limitNanoCpus === "number" || typeof limitMemoryBytes === "number"
      ? {
          ...(typeof limitNanoCpus === "number"
            ? { NanoCPUs: limitNanoCpus }
            : {}),
          ...(typeof limitMemoryBytes === "number"
            ? { MemoryBytes: limitMemoryBytes }
            : {}),
        }
      : undefined;

  const reservations =
    typeof reserveNanoCpus === "number" ||
    typeof reserveMemoryBytes === "number"
      ? {
          ...(typeof reserveNanoCpus === "number"
            ? { NanoCPUs: reserveNanoCpus }
            : {}),
          ...(typeof reserveMemoryBytes === "number"
            ? { MemoryBytes: reserveMemoryBytes }
            : {}),
        }
      : undefined;

  const resources =
    limits || reservations
      ? {
          ...(limits ? { Limits: limits } : {}),
          ...(reservations ? { Reservations: reservations } : {}),
        }
      : undefined;

  const restartDelay = parseDurationToNanoseconds(values.restartDelay);
  const restartMaxAttemptsRaw = values.restartMaxAttempts.trim();
  const restartMaxAttempts = restartMaxAttemptsRaw
    ? Number(restartMaxAttemptsRaw)
    : undefined;

  const restartPolicy = {
    Condition: values.restartCondition,
    ...(typeof restartDelay === "number" ? { Delay: restartDelay } : {}),
    ...(Number.isFinite(restartMaxAttempts)
      ? { MaxAttempts: restartMaxAttempts }
      : {}),
  };

  const networkTargets = values.networks
    .map((network) => network.trim())
    .filter(Boolean)
    .map((network) => ({ Target: network }));

  const ports = values.portMappings
    .map((port) => {
      const published = Number(port.publishedPort.trim());
      const target = Number(port.targetPort.trim());
      if (!Number.isInteger(published) || !Number.isInteger(target)) {
        return null;
      }

      return {
        PublishedPort: published,
        TargetPort: target,
        Protocol: port.protocol,
        PublishMode: port.publishMode,
      };
    })
    .filter((port): port is NonNullable<typeof port> => port !== null);

  const updateDelay = parseDurationToNanoseconds(values.updateDelay);
  const rollbackDelay = parseDurationToNanoseconds(values.rollbackDelay);
  const updateParallelism = Number(values.updateParallelism.trim());
  const rollbackParallelism = Number(values.rollbackParallelism.trim());

  return {
    Name: normalizedName,
    ...(labels ? { Labels: labels } : {}),
    TaskTemplate: {
      ContainerSpec: {
        Image: normalizedImage,
        ...(command ? { Command: command } : {}),
        ...(args ? { Args: args } : {}),
        ...(env.length > 0 ? { Env: env } : {}),
        ...(values.workingDir.trim() ? { Dir: values.workingDir.trim() } : {}),
        ...(values.user.trim() ? { User: values.user.trim() } : {}),
        ...(values.hostname.trim() ? { Hostname: values.hostname.trim() } : {}),
        ...(values.tty ? { TTY: true } : {}),
        ...(mounts.length > 0 ? { Mounts: mounts } : {}),
      },
      ...(constraints.length > 0
        ? {
            Placement: {
              Constraints: constraints,
            },
          }
        : {}),
      ...(resources ? { Resources: resources } : {}),
      RestartPolicy: restartPolicy,
      ...(networkTargets.length > 0 ? { Networks: networkTargets } : {}),
    },
    Mode: {
      Replicated: {
        Replicas: values.replicas,
      },
    },
    UpdateConfig: {
      ...(Number.isFinite(updateParallelism)
        ? { Parallelism: updateParallelism }
        : {}),
      ...(typeof updateDelay === "number" ? { Delay: updateDelay } : {}),
      Order: values.updateOrder,
    },
    RollbackConfig: {
      ...(Number.isFinite(rollbackParallelism)
        ? { Parallelism: rollbackParallelism }
        : {}),
      ...(typeof rollbackDelay === "number" ? { Delay: rollbackDelay } : {}),
      Order: values.rollbackOrder,
    },
    ...(ports.length > 0
      ? {
          EndpointSpec: {
            Ports: ports,
          },
        }
      : {}),
  };
}

export function ServiceForm({
  initialValues,
  onSubmit,
  submitLabel = "Save Service",
  disabled = false,
}: Readonly<ServiceFormProps>) {
  const [values, setValues] = useState<ServiceFormValues>({
    name: initialValues?.name ?? "",
    image: initialValues?.image ?? "",
    replicas: initialValues?.replicas ?? 1,
    command: initialValues?.command ?? "",
    args: initialValues?.args ?? "",
    workingDir: initialValues?.workingDir ?? "",
    user: initialValues?.user ?? "",
    hostname: initialValues?.hostname ?? "",
    tty: initialValues?.tty ?? false,
    envVars:
      initialValues?.envVars && initialValues.envVars.length > 0
        ? initialValues.envVars
        : [EMPTY_KEY_VALUE_ROW],
    labels:
      initialValues?.labels && initialValues.labels.length > 0
        ? initialValues.labels
        : [EMPTY_KEY_VALUE_ROW],
    constraints:
      initialValues?.constraints && initialValues.constraints.length > 0
        ? initialValues.constraints
        : [EMPTY_CONSTRAINT_ROW],
    mounts:
      initialValues?.mounts && initialValues.mounts.length > 0
        ? initialValues.mounts
        : [{ ...EMPTY_MOUNT_ROW }],
    portMappings:
      initialValues?.portMappings && initialValues.portMappings.length > 0
        ? initialValues.portMappings
        : [{ ...EMPTY_PORT_ROW }],
    networks:
      initialValues?.networks && initialValues.networks.length > 0
        ? initialValues.networks
        : [EMPTY_NETWORK_ROW],
    restartCondition: initialValues?.restartCondition ?? "any",
    restartDelay: initialValues?.restartDelay ?? "5s",
    restartMaxAttempts: initialValues?.restartMaxAttempts ?? "",
    updateParallelism: initialValues?.updateParallelism ?? "1",
    updateDelay: initialValues?.updateDelay ?? "10s",
    updateOrder: initialValues?.updateOrder ?? "stop-first",
    rollbackParallelism: initialValues?.rollbackParallelism ?? "1",
    rollbackDelay: initialValues?.rollbackDelay ?? "10s",
    rollbackOrder: initialValues?.rollbackOrder ?? "stop-first",
    limitCpus: initialValues?.limitCpus ?? "",
    limitMemory: initialValues?.limitMemory ?? "",
    reserveCpus: initialValues?.reserveCpus ?? "",
    reserveMemory: initialValues?.reserveMemory ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [envRowKeys, setEnvRowKeys] = useState<string[]>(
    Array.from({ length: values.envVars.length }, () => createRowKey("env")),
  );
  const [labelRowKeys, setLabelRowKeys] = useState<string[]>(
    Array.from({ length: values.labels.length }, () => createRowKey("label")),
  );
  const [constraintRowKeys, setConstraintRowKeys] = useState<string[]>(
    Array.from({ length: values.constraints.length }, () =>
      createRowKey("constraint"),
    ),
  );
  const [networkRowKeys, setNetworkRowKeys] = useState<string[]>(
    Array.from({ length: values.networks.length }, () =>
      createRowKey("network"),
    ),
  );
  const [portRowKeys, setPortRowKeys] = useState<string[]>(
    Array.from({ length: values.portMappings.length }, () =>
      createRowKey("port"),
    ),
  );
  const [mountRowKeys, setMountRowKeys] = useState<string[]>(
    Array.from({ length: values.mounts.length }, () => createRowKey("mount")),
  );

  const updateField = (
    field: keyof ServiceFormValues,
    value: string | number | boolean,
  ) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateStringListField = (
    field: StringListField,
    index: number,
    value: string,
  ) => {
    setValues((current) => {
      const next = [...current[field]];
      next[index] = value;
      return {
        ...current,
        [field]: next,
      };
    });
  };

  const addStringListFieldRow = (field: StringListField) => {
    setValues((current) => ({
      ...current,
      [field]: [...current[field], ""],
    }));

    if (field === "envVars") {
      setEnvRowKeys((current) => [...current, createRowKey("env")]);
    }
    if (field === "labels") {
      setLabelRowKeys((current) => [...current, createRowKey("label")]);
    }
    if (field === "constraints") {
      setConstraintRowKeys((current) => [
        ...current,
        createRowKey("constraint"),
      ]);
    }
    if (field === "networks") {
      setNetworkRowKeys((current) => [...current, createRowKey("network")]);
    }
  };

  const removeStringListFieldRow = (field: StringListField, index: number) => {
    setValues((current) => {
      const source = current[field];
      if (source.length === 1) {
        return {
          ...current,
          [field]: [""],
        };
      }

      return {
        ...current,
        [field]: source.filter((_, rowIndex) => rowIndex !== index),
      };
    });

    if (field === "envVars") {
      setEnvRowKeys((current) =>
        current.length === 1
          ? [createRowKey("env")]
          : current.filter((_, rowIndex) => rowIndex !== index),
      );
    }
    if (field === "labels") {
      setLabelRowKeys((current) =>
        current.length === 1
          ? [createRowKey("label")]
          : current.filter((_, rowIndex) => rowIndex !== index),
      );
    }
    if (field === "constraints") {
      setConstraintRowKeys((current) =>
        current.length === 1
          ? [createRowKey("constraint")]
          : current.filter((_, rowIndex) => rowIndex !== index),
      );
    }
    if (field === "networks") {
      setNetworkRowKeys((current) =>
        current.length === 1
          ? [createRowKey("network")]
          : current.filter((_, rowIndex) => rowIndex !== index),
      );
    }
  };

  const updatePortMappingAt = (
    index: number,
    field: keyof PortEntry,
    value: string,
  ) => {
    setValues((current) => {
      const next = [...current.portMappings];
      next[index] = {
        ...next[index],
        [field]: value,
      };

      return {
        ...current,
        portMappings: next,
      };
    });
  };

  const addPortMapping = () => {
    setValues((current) => ({
      ...current,
      portMappings: [...current.portMappings, { ...EMPTY_PORT_ROW }],
    }));
    setPortRowKeys((current) => [...current, createRowKey("port")]);
  };

  const removePortMapping = (index: number) => {
    setValues((current) => {
      if (current.portMappings.length === 1) {
        return {
          ...current,
          portMappings: [{ ...EMPTY_PORT_ROW }],
        };
      }

      return {
        ...current,
        portMappings: current.portMappings.filter(
          (_, rowIndex) => rowIndex !== index,
        ),
      };
    });
    setPortRowKeys((current) =>
      current.length === 1
        ? [createRowKey("port")]
        : current.filter((_, rowIndex) => rowIndex !== index),
    );
  };

  const updateMountAt = (
    index: number,
    field: keyof MountEntry,
    value: string | boolean,
  ) => {
    setValues((current) => {
      const next = [...current.mounts];
      next[index] = {
        ...next[index],
        [field]: value,
      } as MountEntry;

      return {
        ...current,
        mounts: next,
      };
    });
  };

  const addMount = () => {
    setValues((current) => ({
      ...current,
      mounts: [...current.mounts, { ...EMPTY_MOUNT_ROW }],
    }));
    setMountRowKeys((current) => [...current, createRowKey("mount")]);
  };

  const removeMount = (index: number) => {
    setValues((current) => {
      if (current.mounts.length === 1) {
        return {
          ...current,
          mounts: [{ ...EMPTY_MOUNT_ROW }],
        };
      }

      return {
        ...current,
        mounts: current.mounts.filter((_, rowIndex) => rowIndex !== index),
      };
    });
    setMountRowKeys((current) =>
      current.length === 1
        ? [createRowKey("mount")]
        : current.filter((_, rowIndex) => rowIndex !== index),
    );
  };

  const isSubmitDisabled =
    disabled ||
    submitting ||
    values.name.trim() === "" ||
    values.image.trim() === "" ||
    values.replicas < 1;

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitDisabled) {
      return;
    }

    setSubmitting(true);
    void Promise.resolve(onSubmit(toDockerServiceSpec(values))).finally(() => {
      setSubmitting(false);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-surface-base text-on-surface">
      <Card className="bg-surface-container border-none shadow-none">
        <CardHeader>
          <CardTitle className="headline-sm">
            Basic Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              value={values.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="SERVICE NAME (REQUIRED)"
              required
              className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
            />
            <Input
              value={values.image}
              onChange={(event) => updateField("image", event.target.value)}
              placeholder="IMAGE (REQUIRED) e.g. nginx:latest"
              required
              className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              type="number"
              min={1}
              value={String(values.replicas)}
              onChange={(event) => {
                const next = Number(event.target.value);
                updateField(
                  "replicas",
                  Number.isFinite(next) && next > 0 ? next : 1,
                );
              }}
              placeholder="REPLICAS"
              className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
            />
            <Input
              value={values.command}
              onChange={(event) => updateField("command", event.target.value)}
              placeholder="COMMAND (OPTIONAL)"
              className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
            />
            <Input
              value={values.args}
              onChange={(event) => updateField("args", event.target.value)}
              placeholder="ARGUMENTS (OPTIONAL)"
              className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              value={values.workingDir}
              onChange={(event) =>
                updateField("workingDir", event.target.value)
              }
              placeholder="WORKING DIR (OPTIONAL)"
              className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
            />
            <Input
              value={values.user}
              onChange={(event) => updateField("user", event.target.value)}
              placeholder="USER (OPTIONAL)"
              className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
            />
            <Input
              value={values.hostname}
              onChange={(event) => updateField("hostname", event.target.value)}
              placeholder="HOSTNAME (OPTIONAL)"
              className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
            />
          </div>

          <label className="inline-flex items-center gap-2 label-sm text-on-surface-variant">
            <input
              type="checkbox"
              checked={values.tty}
              onChange={(event) => updateField("tty", event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span>TTY</span>
          </label>
        </CardContent>
      </Card>

      <Card className="bg-surface-container border-none shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="headline-sm">
            Environment Variables
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-surface-container-highest/40"
            onClick={() => addStringListFieldRow("envVars")}
          >
            <Plus className="mr-1.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {values.envVars.map((entry, index) => (
            <div key={envRowKeys[index]} className="flex items-center gap-2 bg-surface-container-high rounded-lg p-3">
              <Input
                value={entry}
                onChange={(event) =>
                  updateStringListField("envVars", index, event.target.value)
                }
                placeholder="KEY=VALUE"
                className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
              />
              <Button
                type="button"
                variant="ghost"
            size="sm-icon"
            className="text-error hover:bg-error-container/30"
            onClick={() => removeStringListFieldRow("envVars", index)}
                aria-label="Remove environment variable"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-surface-container border-none shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="headline-sm">Labels</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-surface-container-highest/40"
            onClick={() => addStringListFieldRow("labels")}
          >
            <Plus className="mr-1.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {values.labels.map((entry, index) => (
            <div key={labelRowKeys[index]} className="flex items-center gap-2 bg-surface-container-high rounded-lg p-3">
              <Input
                value={entry}
                onChange={(event) =>
                  updateStringListField("labels", index, event.target.value)
                }
                placeholder="key=value"
                className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
              />
              <Button
                type="button"
                variant="ghost"
            size="sm-icon"
            className="text-error hover:bg-error-container/30"
            onClick={() => removeStringListFieldRow("labels", index)}
                aria-label="Remove label"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-surface-container border-none shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="headline-sm">
            Port Mappings
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-surface-container-highest/40"
            onClick={addPortMapping}
          >
            <Plus className="mr-1.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {values.portMappings.map((mapping, index) => (
            <div
              key={portRowKeys[index]}
              className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_130px_140px_auto] bg-surface-container-high rounded-lg p-3"
            >
              <Input
                value={mapping.publishedPort}
                onChange={(event) =>
                  updatePortMappingAt(
                    index,
                    "publishedPort",
                    event.target.value,
                  )
                }
                placeholder="PUBLISHED PORT"
                className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
              />
              <Input
                value={mapping.targetPort}
                onChange={(event) =>
                  updatePortMappingAt(index, "targetPort", event.target.value)
                }
                placeholder="TARGET PORT"
                className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
              />
              <select
                value={mapping.protocol}
                onChange={(event) =>
                  updatePortMappingAt(
                    index,
                    "protocol",
                    event.target.value as "tcp" | "udp",
                  )
                }
                className="bg-surface-container-lowest text-on-surface rounded-md h-10 px-3 outline-none focus:ring-2 focus:ring-primary/40 border-none"
              >
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
              <select
                value={mapping.publishMode}
                onChange={(event) =>
                  updatePortMappingAt(
                    index,
                    "publishMode",
                    event.target.value as "ingress" | "host",
                  )
                }
                className="bg-surface-container-lowest text-on-surface rounded-md h-10 px-3 outline-none focus:ring-2 focus:ring-primary/40 border-none"
              >
                <option value="ingress">INGRESS</option>
                <option value="host">HOST</option>
              </select>
              <Button
                type="button"
                variant="ghost"
            size="sm-icon"
            className="text-error hover:bg-error-container/30"
            onClick={() => removePortMapping(index)}
                aria-label="Remove port mapping"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-surface-container border-none shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="headline-sm">
            Volumes / Mounts
          </CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={addMount}>
            <Plus className="mr-1.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {values.mounts.map((mount, index) => (
            <div
              key={mountRowKeys[index]}
              className="grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr_1fr_130px_auto] bg-surface-container-high rounded-lg p-3"
            >
              <select
                value={mount.type}
                onChange={(event) =>
                  updateMountAt(
                    index,
                    "type",
                    event.target.value as "bind" | "volume" | "tmpfs",
                  )
                }
                className="bg-surface-container-lowest text-on-surface rounded-md h-10 px-3 outline-none focus:ring-2 focus:ring-primary/40 border-none"
              >
                <option value="bind">BIND</option>
                <option value="volume">VOLUME</option>
                <option value="tmpfs">TMPFS</option>
              </select>
              <Input
                value={mount.source}
                onChange={(event) =>
                  updateMountAt(index, "source", event.target.value)
                }
                placeholder="SOURCE"
                className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
              />
              <Input
                value={mount.target}
                onChange={(event) =>
                  updateMountAt(index, "target", event.target.value)
                }
                placeholder="TARGET"
                className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
              />
              <label className="inline-flex h-12 items-center gap-2 bg-surface-container-lowest border-none px-3 label-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={mount.readOnly}
                  onChange={(event) =>
                    updateMountAt(index, "readOnly", event.target.checked)
                  }
                  className="h-4 w-4 accent-primary"
                />
                <span>READ ONLY</span>
              </label>
              <Button
                type="button"
                variant="ghost"
            size="sm-icon"
            className="text-error hover:bg-error-container/30"
            onClick={() => removeMount(index)}
                aria-label="Remove mount"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-surface-container border-none shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="headline-sm">Networks</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-surface-container-highest/40"
            onClick={() => addStringListFieldRow("networks")}
          >
            <Plus className="mr-1.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {values.networks.map((network, index) => (
            <div
              key={networkRowKeys[index]}
              className="flex items-center gap-2 bg-surface-container-high rounded-lg p-3"
            >
              <Input
                value={network}
                onChange={(event) =>
                  updateStringListField("networks", index, event.target.value)
                }
                placeholder="NETWORK NAME OR ID"
                className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
              />
              <Button
                type="button"
                variant="ghost"
            size="sm-icon"
            className="text-error hover:bg-error-container/30"
            onClick={() => removeStringListFieldRow("networks", index)}
                aria-label="Remove network"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-surface-container border-none shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="headline-sm">
            Placement Constraints
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-surface-container-highest/40"
            onClick={() => addStringListFieldRow("constraints")}
          >
            <Plus className="mr-1.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {values.constraints.map((constraint, index) => (
            <div
              key={constraintRowKeys[index]}
              className="flex items-center gap-2 bg-surface-container-high rounded-lg p-3"
            >
              <Input
                value={constraint}
                onChange={(event) =>
                  updateStringListField(
                    "constraints",
                    index,
                    event.target.value,
                  )
                }
                placeholder="node.role==manager"
                className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
              />
              <Button
                type="button"
                variant="ghost"
            size="sm-icon"
            className="text-error hover:bg-error-container/30"
            onClick={() => removeStringListFieldRow("constraints", index)}
                aria-label="Remove constraint"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <p className="label-sm text-on-surface-variant">
            Examples: node.role==manager, node.labels.zone==us-east-1,
            node.hostname==worker-1
          </p>
        </CardContent>
      </Card>

      <Card className="bg-surface-container border-none shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="headline-sm">Advanced</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAdvancedOpen((current) => !current)}
          >
            {advancedOpen ? "Collapse" : "Expand"}
          </Button>
        </CardHeader>
        {advancedOpen ? (
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h4 className="label-sm text-on-surface-variant">
                Resources
              </h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input
                  value={values.limitCpus}
                  onChange={(event) =>
                    updateField("limitCpus", event.target.value)
                  }
                  placeholder="CPU LIMIT (e.g. 0.5)"
                  className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
                />
                <Input
                  value={values.limitMemory}
                  onChange={(event) =>
                    updateField("limitMemory", event.target.value)
                  }
                  placeholder="MEMORY LIMIT (e.g. 256m)"
                  className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
                />
                <Input
                  value={values.reserveCpus}
                  onChange={(event) =>
                    updateField("reserveCpus", event.target.value)
                  }
                  placeholder="CPU RESERVATION"
                  className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
                />
                <Input
                  value={values.reserveMemory}
                  onChange={(event) =>
                    updateField("reserveMemory", event.target.value)
                  }
                  placeholder="MEMORY RESERVATION"
                  className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="label-sm text-on-surface-variant">
                Restart Policy
              </h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <select
                  value={values.restartCondition}
                  onChange={(event) =>
                    updateField(
                      "restartCondition",
                      event.target.value as "none" | "on-failure" | "any",
                    )
                  }
                  className="bg-surface-container-lowest text-on-surface rounded-md h-10 px-3 outline-none focus:ring-2 focus:ring-primary/40 border-none"
                >
                  <option value="none">NONE</option>
                  <option value="on-failure">ON-FAILURE</option>
                  <option value="any">ANY</option>
                </select>
                <Input
                  value={values.restartDelay}
                  onChange={(event) =>
                    updateField("restartDelay", event.target.value)
                  }
                  placeholder="DELAY (e.g. 5s)"
                  className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
                />
                <Input
                  value={values.restartMaxAttempts}
                  onChange={(event) =>
                    updateField("restartMaxAttempts", event.target.value)
                  }
                  placeholder="MAX ATTEMPTS"
                  className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="label-sm text-on-surface-variant">
                Update Config
              </h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Input
                  value={values.updateParallelism}
                  onChange={(event) =>
                    updateField("updateParallelism", event.target.value)
                  }
                  placeholder="PARALLELISM"
                  className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
                />
                <Input
                  value={values.updateDelay}
                  onChange={(event) =>
                    updateField("updateDelay", event.target.value)
                  }
                  placeholder="DELAY (e.g. 10s)"
                  className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
                />
                <select
                  value={values.updateOrder}
                  onChange={(event) =>
                    updateField(
                      "updateOrder",
                      event.target.value as "stop-first" | "start-first",
                    )
                  }
                  className="bg-surface-container-lowest text-on-surface rounded-md h-10 px-3 outline-none focus:ring-2 focus:ring-primary/40 border-none"
                >
                  <option value="stop-first">STOP-FIRST</option>
                  <option value="start-first">START-FIRST</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="label-sm text-on-surface-variant">
                Rollback Config
              </h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Input
                  value={values.rollbackParallelism}
                  onChange={(event) =>
                    updateField("rollbackParallelism", event.target.value)
                  }
                  placeholder="PARALLELISM"
                  className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
                />
                <Input
                  value={values.rollbackDelay}
                  onChange={(event) =>
                    updateField("rollbackDelay", event.target.value)
                  }
                  placeholder="DELAY (e.g. 10s)"
                  className="bg-surface-container-lowest border-none focus:ring-2 focus:ring-primary/40 body-sm text-on-surface"
                />
                <select
                  value={values.rollbackOrder}
                  onChange={(event) =>
                    updateField(
                      "rollbackOrder",
                      event.target.value as "stop-first" | "start-first",
                    )
                  }
                  className="bg-surface-container-lowest text-on-surface rounded-md h-10 px-3 outline-none focus:ring-2 focus:ring-primary/40 border-none"
                >
                  <option value="stop-first">STOP-FIRST</option>
                  <option value="start-first">START-FIRST</option>
                </select>
              </div>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card className="bg-surface-container border-none shadow-none">
        <CardContent className="flex justify-end">
          <Button type="submit" disabled={isSubmitDisabled} className="gradient-primary text-on-primary w-full">
            <Checkmark className="mr-1.5" />
            {submitting ? "Submitting..." : submitLabel}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
