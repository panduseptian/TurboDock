export type Role = "admin" | "devops" | "support";

export type Permission =
  | "containers.read"
  | "containers.manage"
  | "services.read"
  | "services.manage"
  | "images.read"
  | "images.manage"
  | "networks.read"
  | "networks.manage"
  | "volumes.read"
  | "volumes.manage"
  | "nodes.read"
  | "nodes.manage"
  | "tasks.read"
  | "swarm.read"
  | "endpoints.manage"
  | "users.manage"
  | "audit.read";

const ALL_PERMISSIONS: Permission[] = [
  "containers.read",
  "containers.manage",
  "services.read",
  "services.manage",
  "images.read",
  "images.manage",
  "networks.read",
  "networks.manage",
  "volumes.read",
  "volumes.manage",
  "nodes.read",
  "nodes.manage",
  "tasks.read",
  "swarm.read",
  "endpoints.manage",
  "users.manage",
  "audit.read",
];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ALL_PERMISSIONS,
  devops: [
    "containers.read",
    "containers.manage",
    "services.read",
    "services.manage",
    "images.read",
    "images.manage",
    "networks.read",
    "networks.manage",
    "volumes.read",
    "volumes.manage",
    "nodes.read",
    "nodes.manage",
    "tasks.read",
    "swarm.read",
  ],
  support: [
    "containers.read",
    "services.read",
    "images.read",
    "networks.read",
    "volumes.read",
    "nodes.read",
    "tasks.read",
    "swarm.read",
  ],
};

export function getPermissions(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permission denied for role \"${role}\": ${permission}`);
  }
}
