"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkmark, Pencil, Plus, Trash2, X } from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/hooks/use-session";
import type { Role } from "@/lib/auth/rbac";

type UserRow = {
  id: string;
  username: string;
  role: Role;
  createdAt: string;
};

const roleLabel: Record<Role, string> = {
  admin: "Admin",
  devops: "DevOps",
  support: "Support",
};

function RoleBadge({ role }: { role: Role }) {
  if (role === "admin") {
    return (
      <span className="inline-flex rounded-md px-2.5 py-1 text-xs font-medium uppercase tracking-wide bg-primary/10 text-primary">
        Admin
      </span>
    );
  }

  if (role === "devops") {
    return (
      <span className="inline-flex rounded-md px-2.5 py-1 text-xs font-medium uppercase tracking-wide bg-tertiary/10 text-tertiary">
        DevOps
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md px-2.5 py-1 text-xs font-medium uppercase tracking-wide bg-surface-container-highest text-on-surface-variant">
      Support
    </span>
  );
}

export default function UsersPage() {
  const { user, loading: sessionLoading } = useSession();
  const canManage = user?.role === "admin";

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [createRole, setCreateRole] = useState<Role>("support");
  const [creating, setCreating] = useState(false);

  const [editRole, setEditRole] = useState<Role>("support");
  const [editPassword, setEditPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/users", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to load users");
      }

      const payload = (await response.json()) as UserRow[];
      setUsers(payload);
    } catch (requestError) {
      setUsers([]);
      setError((requestError as Error).message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading && canManage) {
      void loadUsers();
    }
  }, [sessionLoading, canManage]);

  const createUser = async () => {
    setError(null);

    if (!createUsername.trim()) {
      setError("Username is required.");
      return;
    }

    if (createPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (createPassword !== createConfirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: createUsername.trim(),
          password: createPassword,
          role: createRole,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to create user");
      }

      setAddOpen(false);
      setCreateUsername("");
      setCreatePassword("");
      setCreateConfirmPassword("");
      setCreateRole("support");
      await loadUsers();
    } catch (requestError) {
      setError((requestError as Error).message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = (target: UserRow) => {
    setEditTarget(target);
    setEditRole(target.role);
    setEditPassword("");
  };

  const updateUser = async () => {
    if (!editTarget) {
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const body: { role: Role; password?: string } = {
        role: editRole,
      };

      if (editPassword.trim()) {
        body.password = editPassword;
      }

      const response = await fetch(`/api/users/${editTarget.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to update user");
      }

      setEditTarget(null);
      await loadUsers();
    } catch (requestError) {
      setError((requestError as Error).message || "Failed to update user");
    } finally {
      setUpdating(false);
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to delete user");
      }

      setDeleteTarget(null);
      await loadUsers();
    } catch (requestError) {
      setError((requestError as Error).message || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  const rows = useMemo(
    () =>
      users.map((entry) => (
        <TableRow
          key={entry.id}
          className="border-none hover:bg-white/5 transition-colors"
        >
          <TableCell className="body-sm text-on-surface">
            {entry.username}
          </TableCell>
          <TableCell>
            <RoleBadge role={entry.role} />
          </TableCell>
          <TableCell className="text-on-surface-variant">
            {new Date(entry.createdAt).toLocaleString()}
          </TableCell>
          <TableCell>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="icon"
                title="Edit"
                onClick={() => openEditDialog(entry)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Delete"
                className="text-error hover:text-error"
                onClick={() => setDeleteTarget(entry)}
              >
                <Trash2 />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )),
    [users],
  );

  if (sessionLoading) {
    return (
      <div className="bg-surface-container rounded-xl shadow-ambient overflow-hidden">
        <div className="p-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-32 rounded-md bg-surface-container-high animate-pulse" />
              <div className="h-4 w-20 rounded-md bg-surface-container-high animate-pulse" />
              <div className="h-4 w-40 rounded-md bg-surface-container-high animate-pulse" />
              <div className="h-4 w-16 rounded-md bg-surface-container-high animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="rounded-xl bg-error-container/20 p-4 body-sm text-error">
        Permission denied. Only admin users can access user management.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="headline-md text-on-surface">Users</h1>
          <p className="body-sm text-on-surface-variant">
            Manage user accounts and role permissions.
          </p>
        </div>
        <Button
          className="gradient-primary text-on-primary"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="mr-1.5" />
          Add User
        </Button>
      </div>

      {error && (
        <div className="rounded-xl bg-error-container/20 p-3 body-sm text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-surface-container rounded-xl shadow-ambient overflow-hidden border-none">
          <div className="p-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-32 rounded-md bg-surface-container-high animate-pulse" />
                <div className="h-4 w-20 rounded-md bg-surface-container-high animate-pulse" />
                <div className="h-4 w-40 rounded-md bg-surface-container-high animate-pulse" />
                <div className="h-4 w-16 rounded-md bg-surface-container-high animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-surface-container rounded-xl shadow-ambient overflow-hidden border-none">
          <Table className="border-none">
            <TableHeader className="border-none">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="border-none">{rows}</TableBody>
          </Table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="border-white/10 bg-surface-container/80 backdrop-blur-2xl text-on-surface">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Create a new account and assign a role.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 space-y-4">
            <Input
              className="bg-surface-container-lowest border-none"
              label="Username"
              value={createUsername}
              onChange={(event) => setCreateUsername(event.target.value)}
            />
            <Input
              className="bg-surface-container-lowest border-none"
              label="Password"
              type="password"
              value={createPassword}
              onChange={(event) => setCreatePassword(event.target.value)}
            />
            <Input
              className="bg-surface-container-lowest border-none"
              label="Confirm Password"
              type="password"
              value={createConfirmPassword}
              onChange={(event) => setCreateConfirmPassword(event.target.value)}
            />
            <div>
              <label className="label-sm">Role</label>
              <select
                value={createRole}
                onChange={(event) => setCreateRole(event.target.value as Role)}
                className="h-10 w-full rounded-md bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/40"
              >
                <option value="admin">{roleLabel.admin}</option>
                <option value="devops">{roleLabel.devops}</option>
                <option value="support">{roleLabel.support}</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAddOpen(false)}
              disabled={creating}
            >
              <X className="mr-1.5" />
              Cancel
            </Button>
            <Button onClick={() => void createUser()} disabled={creating}>
              <Plus className="mr-1.5" />
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(open: boolean) => !open && setEditTarget(null)}
      >
        <DialogContent className="border-white/10 bg-surface-container/80 backdrop-blur-2xl text-on-surface">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Change role and optionally reset password.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 space-y-4">
            <div>
              <label className="label-sm">Role</label>
              <select
                value={editRole}
                onChange={(event) => setEditRole(event.target.value as Role)}
                className="h-10 w-full rounded-md bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/40"
              >
                <option value="admin">{roleLabel.admin}</option>
                <option value="devops">{roleLabel.devops}</option>
                <option value="support">{roleLabel.support}</option>
              </select>
            </div>

            <Input
              className="bg-surface-container-lowest border-none"
              label="New Password (Optional)"
              type="password"
              value={editPassword}
              onChange={(event) => setEditPassword(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditTarget(null)}
              disabled={updating}
            >
              <X className="mr-1.5" />
              Cancel
            </Button>
            <Button onClick={() => void updateUser()} disabled={updating}>
              <Checkmark className="mr-1.5" />
              {updating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="border-white/10 bg-surface-container/80 backdrop-blur-2xl text-on-surface">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This action permanently removes the user. Related records may be
              cascaded based on database constraints.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              <X className="mr-1.5" />
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void deleteUser()}
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
