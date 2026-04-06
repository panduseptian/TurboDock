"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, X } from "@/components/ui/icons";
import { useEndpointContext } from "@/contexts/endpoint-context";
import { timeAgo, truncateId } from "@/lib/formatters";
import { Volume, VolumeListResponse } from "@/lib/docker/types";

type DeleteDialogState = {
  open: boolean;
  volume: Volume | null;
};

export default function VolumesPage() {
  const { selectedEndpoint } = useEndpointContext();
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userRole, setUserRole] = useState<string>("user");

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    volume: null,
  });

  const [createDialog, setCreateDialog] = useState(false);
  const [newVolume, setNewVolume] = useState({ Name: "", Driver: "local" });

  const fetchVolumes = useCallback((endpoint: string) => {
    setLoading(true);
    fetch(`/api/docker/${endpoint}/volumes`)
      .then((res) => res.json())
      .then((data: VolumeListResponse) => {
        setVolumes(Array.isArray(data.Volumes) ? data.Volumes : []);
        setWarnings(Array.isArray(data.Warnings) ? data.Warnings : []);
      })
      .catch((err) => console.error("Failed to load volumes", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((sessionData) => {
        if (sessionData?.user) setUserRole(sessionData.user.role);
      });
  }, []);

  useEffect(() => {
    if (selectedEndpoint?.id) {
      fetchVolumes(selectedEndpoint.id);
      return;
    }

    setVolumes([]);
    setWarnings([]);
    setLoading(false);
  }, [selectedEndpoint?.id, fetchVolumes]);

  const handleDelete = () => {
    if (!deleteDialog.volume || !selectedEndpoint?.id) return;

    fetch(
      `/api/docker/${selectedEndpoint.id}/volumes/${deleteDialog.volume.Name}?force=true`,
      {
        method: "DELETE",
      },
    ).then(() => {
      setDeleteDialog({ open: false, volume: null });
      fetchVolumes(selectedEndpoint.id);
    });
  };

  const handleCreate = () => {
    if (!newVolume.Name || !selectedEndpoint?.id) return;

    fetch(`/api/docker/${selectedEndpoint.id}/volumes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newVolume),
    }).then(() => {
      setCreateDialog(false);
      setNewVolume({ Name: "", Driver: "local" });
      fetchVolumes(selectedEndpoint.id);
    });
  };

  const filteredVolumes = useMemo(() => {
    if (!search) return volumes;
    return volumes.filter((vol) =>
      (vol.Name || "").toLowerCase().includes(search.toLowerCase()),
    );
  }, [volumes, search]);

  const canManage = userRole === "admin" || userRole === "devops";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-on-surface mb-2">
            VOLUME_LIST
          </h1>
          <p className="text-on-surface-variant font-sans">
            Manage persistent storage volumes on this endpoint
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm font-mono text-on-surface-variant bg-surface-container p-3">
          <div>
            TOTAL COUNTS:{" "}
            <span className="text-on-surface">{volumes.length}</span>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => setCreateDialog(true)}>
              <Plus className="mr-1.5" /> Create Volume
            </Button>
          )}
        </div>
      </div>

      {warnings.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardHeader className="py-4">
            <CardTitle className="text-yellow-400 text-lg">
              WARNINGS FROM DOCKER
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-4">
            <ul className="list-disc list-inside text-sm text-yellow-200/80 pl-4 font-mono space-y-1">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
          <CardTitle>VOLUMES</CardTitle>
          <Input
            placeholder="Search by name..."
            className="w-full sm:max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Mountpoint</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Created</TableHead>
                {canManage && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 6 : 5}
                    className="text-center text-white/50 h-32"
                  >
                    LOADING VOLUMES...
                  </TableCell>
                </TableRow>
              ) : filteredVolumes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 6 : 5}
                    className="text-center text-white/50 h-32"
                  >
                    {search ? "NO RESULTS FOUND" : "NO VOLUMES AVAILABLE"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredVolumes.map((vol) => (
                  <TableRow key={vol.Name}>
                    <TableCell className="font-mono text-on-surface">
                      {vol.Name.length > 24
                        ? truncateId(vol.Name, 24) + "..."
                        : vol.Name}
                    </TableCell>
                    <TableCell className="font-mono text-on-surface-variant">
                      {vol.Driver}
                    </TableCell>
                    <TableCell
                      className="font-mono text-on-surface-variant break-all text-xs"
                      title={vol.Mountpoint}
                    >
                      {vol.Mountpoint.length > 40
                        ? truncateId(vol.Mountpoint, 40) + "..."
                        : vol.Mountpoint}
                    </TableCell>
                    <TableCell className="font-mono text-on-surface-variant uppercase">
                      {vol.Scope}
                    </TableCell>
                    <TableCell className="text-on-surface-variant">
                      {vol.CreatedAt ? timeAgo(vol.CreatedAt) : "—"}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          onClick={() =>
                            setDeleteDialog({ open: true, volume: vol })
                          }
                          title="Remove"
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open: boolean) =>
          !open && setDeleteDialog({ open: false, volume: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-400">REMOVE VOLUME</DialogTitle>
            <DialogDescription>
              Are you sure you want to forcibly remove the volume{" "}
              <span className="font-mono text-on-surface">
                {truncateId(deleteDialog.volume?.Name || "", 30)}
              </span>
              ? All data stored in this volume will be permanently lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialog({ open: false, volume: null })}
            >
              <X className="mr-1.5" /> Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="mr-1.5" /> Confirm Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>CREATE VOLUME</DialogTitle>
            <DialogDescription>
              Provide a name to create a new persistent volume.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-on-surface-variant font-sans">
                Name
              </label>
              <Input
                placeholder="volume-name"
                value={newVolume.Name}
                onChange={(e) =>
                  setNewVolume({ ...newVolume, Name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 flex flex-col">
              <label className="text-sm text-on-surface-variant font-sans">
                Driver
              </label>
              <select
                className="w-full bg-transparent p-3 h-12 rounded-none text-on-surface focus:outline-none focus:ring-2 focus:ring-blue-500/50 opacity-50 cursor-not-allowed"
                value={newVolume.Driver}
                onChange={(e) =>
                  setNewVolume({ ...newVolume, Driver: e.target.value })
                }
                disabled
              >
                <option
                  value="local"
                  className="bg-surface-container-lowest text-on-surface"
                >
                  local
                </option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialog(false)}>
              <X className="mr-1.5" /> Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newVolume.Name}>
              <Plus className="mr-1.5" /> Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
