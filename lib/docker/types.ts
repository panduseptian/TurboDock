export interface DockerError {
  message: string;
}

export interface ObjectVersion {
  Index: number;
}

export interface Port {
  IP?: string;
  PrivatePort: number;
  PublicPort?: number;
  Type: "tcp" | "udp" | "sctp" | string;
}

export interface Mount {
  Type: string;
  Name?: string;
  Source: string;
  Destination: string;
  Mode: string;
  RW: boolean;
}

export interface DockerInfo {
  ID: string;
  Name: string;
  ServerVersion: string;
  Containers: number;
  ContainersRunning: number;
  ContainersPaused: number;
  ContainersStopped: number;
  Images: number;
  NCPU: number;
  MemTotal: number;
  OperatingSystem: string;
  OSType: string;
  Architecture: string;
  Swarm: {
    LocalNodeState:
      | "inactive"
      | "pending"
      | "active"
      | "locked"
      | "error"
      | string;
    NodeID: string;
    NodeAddr?: string;
    ControlAvailable?: boolean;
    Error?: string;
    Nodes?: number;
    Managers?: number;
  };
}

export interface DockerVersion {
  Version: string;
  ApiVersion: string;
  GoVersion: string;
  Os: string;
  Arch: string;
  BuildTime: string;
}

export interface Container {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  State: string;
  Status: string;
  Ports: Port[];
  Labels: Record<string, string>;
  NetworkSettings: {
    Networks?: Record<
      string,
      {
        NetworkID?: string;
        EndpointID?: string;
        IPAddress?: string;
        Gateway?: string;
        MacAddress?: string;
      }
    >;
  };
  Mounts: Mount[];
}

export interface ContainerInspect {
  Id: string;
  Name: string;
  Created: string;
  Path: string;
  Args: string[];
  Image: string;
  RestartCount: number;
  Driver?: string;
  Platform?: string;
  Config: {
    Hostname: string;
    User: string;
    Image: string;
    Env: string[];
    Cmd: string[] | null;
    Entrypoint: string[] | null;
    WorkingDir: string;
    Labels: Record<string, string>;
    Tty: boolean;
    OpenStdin: boolean;
  };
  HostConfig: {
    NetworkMode: string;
    RestartPolicy: {
      Name: string;
      MaximumRetryCount: number;
    };
    LogConfig?: {
      Type: string;
      Config: Record<string, string>;
    };
    AutoRemove?: boolean;
    Privileged?: boolean;
    ReadonlyRootfs?: boolean;
    Binds?: string[];
  };
  NetworkSettings: {
    IPAddress: string;
    Gateway: string;
    MacAddress: string;
    Networks: Record<
      string,
      {
        NetworkID?: string;
        EndpointID?: string;
        IPAddress?: string;
        Gateway?: string;
        MacAddress?: string;
        Aliases?: string[];
      }
    >;
  };
  State: {
    Status: string;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    OOMKilled: boolean;
    Dead: boolean;
    Pid: number;
    ExitCode: number;
    Error: string;
    StartedAt: string;
    FinishedAt: string;
    Health?: {
      Status: string;
      FailingStreak: number;
      Log?: Array<{
        Start: string;
        End: string;
        ExitCode: number;
        Output: string;
      }>;
    };
  };
  Mounts: Mount[];
}

export interface ContainerStats {
  read: string;
  cpu_stats: {
    cpu_usage: {
      total_usage: number;
      percpu_usage?: number[];
      usage_in_kernelmode?: number;
      usage_in_usermode?: number;
    };
    system_cpu_usage?: number;
    online_cpus?: number;
    throttling_data?: {
      periods: number;
      throttled_periods: number;
      throttled_time: number;
    };
  };
  precpu_stats: {
    cpu_usage: {
      total_usage: number;
      percpu_usage?: number[];
      usage_in_kernelmode?: number;
      usage_in_usermode?: number;
    };
    system_cpu_usage?: number;
    online_cpus?: number;
    throttling_data?: {
      periods: number;
      throttled_periods: number;
      throttled_time: number;
    };
  };
  memory_stats: {
    usage: number;
    max_usage?: number;
    limit: number;
    stats?: Record<string, number>;
  };
  networks?: Record<
    string,
    {
      rx_bytes: number;
      rx_packets: number;
      rx_errors: number;
      rx_dropped: number;
      tx_bytes: number;
      tx_packets: number;
      tx_errors: number;
      tx_dropped: number;
    }
  >;
  blkio_stats: {
    io_service_bytes_recursive?: Array<{
      major: number;
      minor: number;
      op: string;
      value: number;
    }>;
  };
}

export interface Image {
  Id: string;
  RepoTags: string[];
  RepoDigests?: string[];
  Created: number | string;
  Size: number;
  SharedSize?: number;
  VirtualSize?: number;
  Labels: Record<string, string> | null;
}

export interface Network {
  Id: string;
  Name: string;
  Created: string;
  Scope: string;
  Driver: string;
  IPAM: {
    Driver: string;
    Config?: Array<{
      Subnet?: string;
      Gateway?: string;
    }>;
    Options?: Record<string, string>;
  };
  Internal: boolean;
  Containers?: Record<
    string,
    {
      Name?: string;
      IPv4Address?: string;
      IPv6Address?: string;
      MacAddress?: string;
    }
  >;
  Labels?: Record<string, string>;
}

export interface Volume {
  Name: string;
  Driver: string;
  Mountpoint: string;
  Labels: Record<string, string> | null;
  Scope: string;
  CreatedAt?: string;
  Status?: Record<string, unknown> | null;
}

export interface VolumeListResponse {
  Volumes: Volume[];
  Warnings: string[];
}

export interface SwarmService {
  ID: string;
  Version: ObjectVersion;
  CreatedAt: string;
  UpdatedAt: string;
  Spec: {
    Name: string;
    Labels?: Record<string, string>;
    TaskTemplate: Record<string, unknown>;
    Mode: Record<string, unknown>;
    UpdateConfig?: Record<string, unknown>;
    EndpointSpec?: Record<string, unknown>;
  };
  Endpoint?: {
    Spec?: Record<string, unknown>;
    Ports?: Array<{
      Protocol?: string;
      TargetPort?: number;
      PublishedPort?: number;
      PublishMode?: string;
    }>;
    VirtualIPs?: Array<{
      NetworkID?: string;
      Addr?: string;
    }>;
  };
}

export interface SwarmNode {
  ID: string;
  Version: ObjectVersion;
  CreatedAt: string;
  UpdatedAt: string;
  Spec: {
    Name?: string;
    Role?: "worker" | "manager" | string;
    Availability?: "active" | "pause" | "drain" | string;
    Labels?: Record<string, string>;
  };
  Description: {
    Hostname: string;
    Platform: {
      Architecture: string;
      OS: string;
    };
    Resources: {
      NanoCPUs: number;
      MemoryBytes: number;
    };
    Engine: {
      EngineVersion: string;
    };
  };
  Status: {
    State: string;
    Message: string;
    Addr?: string;
  };
  ManagerStatus?: {
    Leader: boolean;
    Reachability: "unknown" | "unreachable" | "reachable" | string;
    Addr: string;
  };
}

export interface SwarmTask {
  ID: string;
  Version: ObjectVersion;
  CreatedAt: string;
  UpdatedAt: string;
  Spec: Record<string, unknown>;
  ServiceID: string;
  NodeID: string;
  Status: {
    Timestamp?: string;
    State: string;
    Message: string;
    Err?: string;
    ContainerStatus?: {
      ContainerID?: string;
      PID?: number;
      ExitCode?: number;
    };
  };
  DesiredState: string;
}

export interface SwarmInfo {
  ID: string;
  Version: ObjectVersion;
  CreatedAt: string;
  UpdatedAt: string;
  Spec: {
    Name?: string;
    Labels?: Record<string, string>;
    Orchestration?: Record<string, unknown>;
    Raft?: Record<string, unknown>;
    Dispatcher?: Record<string, unknown>;
    CAConfig?: Record<string, unknown>;
    EncryptionConfig?: Record<string, unknown>;
    TaskDefaults?: Record<string, unknown>;
  };
  JoinTokens: {
    Worker: string;
    Manager: string;
  };
}

export interface PortBinding {
  HostIp?: string;
  HostPort: string;
}

export interface ContainerCreateConfig {
  name?: string;
  Image: string;
  Cmd?: string[];
  Env?: string[];
  ExposedPorts?: Record<string, object>;
  HostConfig?: {
    PortBindings?: Record<string, PortBinding[]>;
    Binds?: string[];
    RestartPolicy?: {
      Name: "no" | "always" | "unless-stopped" | "on-failure";
      MaximumRetryCount?: number;
    };
    NetworkMode?: string;
    Memory?: number;
    NanoCpus?: number;
    Privileged?: boolean;
  };
  NetworkingConfig?: {
    EndpointsConfig?: Record<string, { Aliases?: string[] }>;
  };
  Labels?: Record<string, string>;
  Tty?: boolean;
  OpenStdin?: boolean;
  WorkingDir?: string;
  User?: string;
  Hostname?: string;
}

export interface ContainerCreateResponse {
  Id: string;
  Warnings: string[];
}

export interface NodeUpdateSpec {
  Name?: string;
  Labels?: Record<string, string>;
  Role?: "worker" | "manager";
  Availability?: "active" | "pause" | "drain";
}
