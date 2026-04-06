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
import { Badge } from "@/components/ui/badge";
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
import { Network } from "@/lib/docker/types";

type DeleteDialogState = {
  open: boolean;
  network: Network | null;
};

export default function NetworksPage() {
  const { selectedEndpoint } = useEndpointContext();
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userRole, setUserRole] = useState<string>("user");

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    network: null,
  });

  const [createDialog, setCreateDialog] = useState(false);
  const [newNetwork, setNewNetwork] = useState({ Name: "", Driver: "bridge" });

  const fetchNetworks = useCallback((endpoint: string) => {
    setLoading(true);
    fetch(`/api/docker/${endpoint}/networks`)
      .then((res) => res.json())
      .then((data) => {
        setNetworks(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Failed to load networks", err))
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
      fetchNetworks(selectedEndpoint.id);
      return;
    }

    setNetworks([]);
    setLoading(false);
  }, [selectedEndpoint?.id, fetchNetworks]);

  const handleDelete = () => {
    if (!deleteDialog.network || !selectedEndpoint?.id) return;

    fetch(
      `/api/docker/${selectedEndpoint.id}/networks/${deleteDialog.network.Id}`,
      {
        method: "DELETE",
      },
    ).then(() => {
      setDeleteDialog({ open: false, network: null });
      fetchNetworks(selectedEndpoint.id);
    });
  };

  const handleCreate = () => {
    if (!newNetwork.Name || !selectedEndpoint?.id) return;

    fetch(`/api/docker/${selectedEndpoint.id}/networks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newNetwork),
    }).then(() => {
      setCreateDialog(false);
      setNewNetwork({ Name: "", Driver: "bridge" });
      fetchNetworks(selectedEndpoint.id);
    });
  };

  const filteredNetworks = useMemo(() => {
    if (!search) return networks;
    return networks.filter(
      (net) =>
        (net.Name || "").toLowerCase().includes(search.toLowerCase()) ||
        (net.Id || "").toLowerCase().includes(search.toLowerCase()),
    );
  }, [networks, search]);

  const canManage = userRole === "admin" || userRole === "devops";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="headline-md text-on-surface mb-2">Networks</h1>
          <p className="body-md text-on-surface-variant">
            View and manage container networks on this endpoint
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="label-md text-on-surface-variant">
            Total Networks:{" "}
            <span className="text-on-surface">{networks.length}</span>
          </div>
          {canManage && (
            <Button
              className="gradient-primary text-on-primary"
              onClick={() => setCreateDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Create Network
            </Button>
          )}
        </div>
      </div>

      <div className="bg-surface-container rounded-xl shadow-ambient overflow-hidden flex flex-col">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="title-md text-on-surface">Network Index</h2>
          <Input
            placeholder="Search by name or ID..."
            className="w-full sm:max-w-xs bg-surface-container-lowest border-none text-on-surface"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="label-sm text-on-surface-variant">
                  Name
                </TableHead>
                <TableHead className="label-sm text-on-surface-variant">
                  ID
                </TableHead>
                <TableHead className="label-sm text-on-surface-variant">
                  Driver
                </TableHead>
                <TableHead className="label-sm text-on-surface-variant">
                  Scope
                </TableHead>
                <TableHead className="label-sm text-on-surface-variant">
                  Internal
                </TableHead>
                <TableHead className="label-sm text-on-surface-variant">
                  Created
                </TableHead>
                {canManage && (
                  <TableHead className="text-right label-sm text-on-surface-variant">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow
                    key={i}
                    className="border-none hover:bg-transparent"
                  >
                    <TableCell colSpan={canManage ? 7 : 6} className="py-4">
                      <div className="h-10 w-full bg-surface-container-high animate-pulse rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredNetworks.length === 0 ? (
                <TableRow className="border-none hover:bg-transparent">
                  <TableCell
                    colSpan={canManage ? 7 : 6}
                    className="text-center text-on-surface-variant h-32 body-md"
                  >
                    {search ? "No results found" : "No networks available"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredNetworks.map((net) => {
                  const isBuiltIn = ["bridge", "host", "none"].includes(
                    net.Name,
                  );

                  return (
                    <TableRow
                      key={net.Id}
                      className="border-none hover:bg-surface-container-high transition-colors"
                    >
                      <TableCell className="body-sm text-on-surface">
                        {net.Name}
                      </TableCell>
                      <TableCell className="label-sm text-on-surface-variant">
                        {truncateId(net.Id)}
                      </TableCell>
                      <TableCell className="label-sm text-on-surface-variant">
                        {net.Driver}
                      </TableCell>
                      <TableCell className="label-sm text-on-surface-variant uppercase">
                        {net.Scope}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={net.Internal ? "warning" : "default"}
                          className="label-sm"
                        >
                          {net.Internal ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="label-sm text-on-surface-variant">
                        {timeAgo(net.Created)}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-error hover:text-error hover:bg-error-container/30 transition-colors"
                            onClick={() =>
                              setDeleteDialog({ open: true, network: net })
                            }
                            disabled={isBuiltIn}
                            title={
                              isBuiltIn
                                ? "Built-in networks cannot be removed"
                                : "Remove network"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open: boolean) =>
          !open && setDeleteDialog({ open: false, network: null })
        }
      >
        <DialogContent className="glass border-none">
          <DialogHeader>
            <DialogTitle className="headline-sm text-on-surface">
              Remove Network
            </DialogTitle>
            <DialogDescription className="body-md text-on-surface-variant pt-2">
              Are you sure you want to remove the network{" "}
              <span className="font-semibold text-on-surface">
                {deleteDialog.network?.Name}
              </span>
              ? Containers attached to this network might lose connectivity.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button
              variant="ghost"
              className="text-on-surface hover:bg-surface-container-highest"
              onClick={() => setDeleteDialog({ open: false, network: null })}
            >
              Cancel
            </Button>
            <Button
              className="bg-error text-on-error hover:bg-error/90 border-none"
              onClick={handleDelete}
            >
              Confirm Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="glass border-none">
          <DialogHeader>
            <DialogTitle className="headline-sm text-on-surface">
              Create Network
            </DialogTitle>
            <DialogDescription className="body-md text-on-surface-variant pt-2">
              Provide a name and select a driver for the new network.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="label-md text-on-surface">Name</label>
              <Input
                placeholder="network-name"
                className="bg-surface-container-lowest border-none text-on-surface focus-visible:ring-1 focus-visible:ring-primary h-11"
                value={newNetwork.Name}
                onChange={(e) =>
                  setNewNetwork({ ...newNetwork, Name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 flex flex-col">
              <label className="label-md text-on-surface">Driver</label>
              <select
                className="w-full bg-surface-container-lowest text-on-surface border-none p-3 rounded-md h-11 focus:outline-none focus:ring-1 focus:ring-primary transition-colors appearance-none"
                value={newNetwork.Driver}
                onChange={(e) =>
                  setNewNetwork({ ...newNetwork, Driver: e.target.value })
                }
              >
                <option value="bridge">bridge</option>
                <option value="overlay">overlay</option>
                <option value="macvlan">macvlan</option>
                <option value="host">host</option>
                <option value="none">none</option>
              </select>
            </div>
          </div>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button
              variant="ghost"
              className="text-on-surface hover:bg-surface-container-highest"
              onClick={() => setCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="gradient-primary text-on-primary border-none"
              onClick={handleCreate}
              disabled={!newNetwork.Name}
            >
              Create Network
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
