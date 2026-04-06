import type {
  Container,
  ContainerCreateConfig,
  ContainerCreateResponse,
  ContainerInspect,
  DockerError,
  DockerInfo,
  DockerVersion,
  Image,
  NodeUpdateSpec,
  Network,
  SwarmInfo,
  SwarmNode,
  SwarmService,
  SwarmTask,
  Volume,
  VolumeListResponse,
} from "./types";

type QueryValue = string | number | boolean;

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, QueryValue | QueryValue[] | undefined>;
  body?: unknown;
  timeoutMs?: number;
  expectNoContent?: boolean;
  extraSuccessStatusCodes?: number[];
};

export class DockerApiError extends Error {
  statusCode: number;
  dockerMessage: string;

  constructor(message: string, statusCode: number, dockerMessage: string) {
    super(message);
    this.name = "DockerApiError";
    this.statusCode = statusCode;
    this.dockerMessage = dockerMessage;
  }
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function appendQueryParams(url: URL, query?: RequestOptions["query"]): void {
  if (!query) {
    return;
  }

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined) {
      continue;
    }

    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        url.searchParams.append(key, String(value));
      }
      continue;
    }

    url.searchParams.set(key, String(rawValue));
  }
}

async function toDockerApiError(response: Response): Promise<DockerApiError> {
  let dockerMessage = `Request failed with status ${response.status}`;

  try {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const errorPayload = (await response.json()) as Partial<DockerError>;
      if (
        typeof errorPayload.message === "string" &&
        errorPayload.message.length > 0
      ) {
        dockerMessage = errorPayload.message;
      }
    } else {
      const text = await response.text();
      if (text.trim().length > 0) {
        dockerMessage = text.trim();
      }
    }
  } catch {
    // Keep default fallback message.
  }

  return new DockerApiError(dockerMessage, response.status, dockerMessage);
}

export function createDockerClient(endpointUrl: string) {
  const baseUrl = `${trimTrailingSlash(endpointUrl)}/v1.47`;

  async function request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const {
      method = "GET",
      query,
      body,
      timeoutMs = 30_000,
      expectNoContent = false,
      extraSuccessStatusCodes = [],
    } = options;

    const url = new URL(`${baseUrl}${path}`);
    appendQueryParams(url, query);

    const headers: HeadersInit = {};
    let encodedBody: string | undefined;

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      encodedBody = JSON.stringify(body);
    }

    const controller = timeoutMs > 0 ? new AbortController() : undefined;
    const timeout =
      controller && timeoutMs > 0
        ? setTimeout(() => {
            controller.abort();
          }, timeoutMs)
        : undefined;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: encodedBody,
        signal: controller?.signal,
      });

      const isSuccess =
        response.ok || extraSuccessStatusCodes.includes(response.status);
      if (!isSuccess) {
        throw await toDockerApiError(response);
      }

      if (expectNoContent || response.status === 204) {
        return undefined as T;
      }

      const text = await response.text();
      if (!text) {
        return undefined as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      if (error instanceof DockerApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new DockerApiError(
          "Docker API request timed out",
          408,
          "Docker API request timed out",
        );
      }

      if (error instanceof Error) {
        throw new DockerApiError(error.message, 500, error.message);
      }

      throw new DockerApiError(
        "Unknown Docker API error",
        500,
        "Unknown Docker API error",
      );
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  async function requestStream(
    path: string,
    query?: RequestOptions["query"],
  ): Promise<ReadableStream<Uint8Array>> {
    const url = new URL(`${baseUrl}${path}`);
    appendQueryParams(url, query);

    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      throw await toDockerApiError(response);
    }

    if (!response.body) {
      throw new DockerApiError(
        "Docker API returned an empty stream",
        response.status,
        "Empty stream",
      );
    }

    return response.body;
  }

  return {
    // System
    getInfo(): Promise<DockerInfo> {
      return request<DockerInfo>("/info");
    },

    getVersion(): Promise<DockerVersion> {
      return request<DockerVersion>("/version");
    },

    // Containers
    listContainers(all = false): Promise<Container[]> {
      return request<Container[]>("/containers/json", { query: { all } });
    },

    createContainer(
      config: ContainerCreateConfig,
    ): Promise<ContainerCreateResponse> {
      const query: Record<string, string> = {};
      const { name, ...body } = config;
      if (name) {
        query.name = name;
      }
      return request<ContainerCreateResponse>("/containers/create", {
        method: "POST",
        query,
        body,
      });
    },

    inspectContainer(id: string): Promise<ContainerInspect> {
      return request<ContainerInspect>(
        `/containers/${encodeURIComponent(id)}/json`,
      );
    },

    startContainer(id: string): Promise<void> {
      return request<void>(`/containers/${encodeURIComponent(id)}/start`, {
        method: "POST",
        expectNoContent: true,
        extraSuccessStatusCodes: [304],
      });
    },

    stopContainer(id: string): Promise<void> {
      return request<void>(`/containers/${encodeURIComponent(id)}/stop`, {
        method: "POST",
        expectNoContent: true,
        extraSuccessStatusCodes: [304],
      });
    },

    restartContainer(id: string): Promise<void> {
      return request<void>(`/containers/${encodeURIComponent(id)}/restart`, {
        method: "POST",
        expectNoContent: true,
      });
    },

    removeContainer(id: string, force = false): Promise<void> {
      return request<void>(`/containers/${encodeURIComponent(id)}`, {
        method: "DELETE",
        query: { force },
        expectNoContent: true,
      });
    },

    getContainerLogs(
      id: string,
      options?: { tail?: number; since?: number; timestamps?: boolean },
    ): Promise<ReadableStream<Uint8Array>> {
      return requestStream(`/containers/${encodeURIComponent(id)}/logs`, {
        follow: true,
        stdout: true,
        stderr: true,
        tail: options?.tail,
        since: options?.since,
        timestamps: options?.timestamps,
      });
    },

    getContainerStats(id: string): Promise<ReadableStream<Uint8Array>> {
      return requestStream(`/containers/${encodeURIComponent(id)}/stats`, {
        stream: true,
      });
    },

    // Images
    listImages(): Promise<Image[]> {
      return request<Image[]>("/images/json");
    },

    inspectImage(id: string): Promise<Image> {
      return request<Image>(`/images/${encodeURIComponent(id)}/json`);
    },

    removeImage(id: string, force = false): Promise<void> {
      return request<void>(`/images/${encodeURIComponent(id)}`, {
        method: "DELETE",
        query: { force },
      });
    },

    // Networks
    listNetworks(): Promise<Network[]> {
      return request<Network[]>("/networks");
    },

    inspectNetwork(id: string): Promise<Network> {
      return request<Network>(`/networks/${encodeURIComponent(id)}`);
    },

    createNetwork(config: {
      Name: string;
      Driver?: string;
      Internal?: boolean;
      Labels?: Record<string, string>;
    }): Promise<{ Id: string }> {
      return request<{ Id: string }>("/networks/create", {
        method: "POST",
        body: config,
      });
    },

    removeNetwork(id: string): Promise<void> {
      return request<void>(`/networks/${encodeURIComponent(id)}`, {
        method: "DELETE",
        expectNoContent: true,
      });
    },

    // Volumes
    listVolumes(): Promise<VolumeListResponse> {
      return request<VolumeListResponse>("/volumes");
    },

    inspectVolume(name: string): Promise<Volume> {
      return request<Volume>(`/volumes/${encodeURIComponent(name)}`);
    },

    createVolume(config: {
      Name: string;
      Driver?: string;
      Labels?: Record<string, string>;
    }): Promise<Volume> {
      return request<Volume>("/volumes/create", {
        method: "POST",
        body: config,
      });
    },

    removeVolume(name: string, force = false): Promise<void> {
      return request<void>(`/volumes/${encodeURIComponent(name)}`, {
        method: "DELETE",
        query: { force },
        expectNoContent: true,
      });
    },

    // Swarm
    getSwarmInfo(): Promise<SwarmInfo> {
      return request<SwarmInfo>("/swarm");
    },

    listServices(): Promise<SwarmService[]> {
      return request<SwarmService[]>("/services");
    },

    inspectService(id: string): Promise<SwarmService> {
      return request<SwarmService>(`/services/${encodeURIComponent(id)}`);
    },

    createService(spec: Record<string, unknown>): Promise<{ ID: string }> {
      return request<{ ID: string }>("/services/create", {
        method: "POST",
        body: spec,
      });
    },

    updateService(
      id: string,
      version: number,
      spec: Record<string, unknown>,
    ): Promise<void> {
      return request<void>(`/services/${encodeURIComponent(id)}/update`, {
        method: "POST",
        query: { version },
        body: spec,
      });
    },

    removeService(id: string): Promise<void> {
      return request<void>(`/services/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },

    listNodes(): Promise<SwarmNode[]> {
      return request<SwarmNode[]>("/nodes");
    },

    inspectNode(id: string): Promise<SwarmNode> {
      return request<SwarmNode>(`/nodes/${encodeURIComponent(id)}`);
    },

    updateNode(
      id: string,
      version: number,
      spec: NodeUpdateSpec,
    ): Promise<void> {
      return request<void>(`/nodes/${encodeURIComponent(id)}/update`, {
        method: "POST",
        query: { version },
        body: spec,
        expectNoContent: true,
        extraSuccessStatusCodes: [200],
      });
    },

    deleteNode(id: string, force = false): Promise<void> {
      return request<void>(`/nodes/${encodeURIComponent(id)}`, {
        method: "DELETE",
        query: { force },
        expectNoContent: true,
      });
    },

    listTasks(filters?: Record<string, string[]>): Promise<SwarmTask[]> {
      return request<SwarmTask[]>("/tasks", {
        query: {
          filters: filters ? JSON.stringify(filters) : undefined,
        },
      });
    },

    inspectTask(id: string): Promise<SwarmTask> {
      return request<SwarmTask>(`/tasks/${encodeURIComponent(id)}`);
    },

    getTaskLogs(
      id: string,
      options?: { tail?: number; since?: number; timestamps?: boolean },
    ): Promise<ReadableStream<Uint8Array>> {
      return requestStream(`/tasks/${encodeURIComponent(id)}/logs`, {
        follow: true,
        stdout: true,
        stderr: true,
        tail: options?.tail,
        since: options?.since,
        timestamps: options?.timestamps,
      });
    },
  };
}
