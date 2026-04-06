"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContainerActions } from "./container-actions";
import { timeAgo } from "@/lib/formatters";

type ContainerItem = {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Created: number;
  Ports: Array<{
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }>;
};

interface ContainerListProps {
  containers: ContainerItem[];
  loading: boolean;
  canManage: boolean;
  onAction: (
    containerId: string,
    action: "start" | "stop" | "restart" | "remove",
  ) => void;
  actionLoadingId: string | null;
}

const STATUS_FILTERS = [
  "all",
  "running",
  "exited",
  "paused",
  "created",
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

function containerName(names: string[]): string {
  if (!names || names.length === 0) return "unnamed";
  return names[0].replace(/^\//, "");
}

function statusToBadge(
  state: string,
): "running" | "stopped" | "paused" | "created" | "default" {
  switch (state) {
    case "running":
      return "running";
    case "exited":
    case "dead":
      return "stopped";
    case "paused":
      return "paused";
    case "created":
      return "created";
    default:
      return "default";
  }
}

function formatPorts(
  ports: Array<{ PrivatePort: number; PublicPort?: number; Type: string }>,
): string {
  if (!ports || ports.length === 0) return "—";
  const mapped = ports
    .filter((p) => p.PublicPort)
    .map((p) => `${p.PublicPort}:${p.PrivatePort}/${p.Type}`);
  if (mapped.length === 0) return "—";
  return (
    mapped.slice(0, 3).join(", ") +
    (mapped.length > 3 ? ` +${mapped.length - 3}` : "")
  );
}

export function ContainerList({
  containers,
  loading,
  canManage,
  onAction,
  actionLoadingId,
}: Readonly<ContainerListProps>) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredContainers = useMemo(() => {
    let result = containers;

    if (statusFilter !== "all") {
      result = result.filter((c) => {
        if (statusFilter === "exited") {
          return c.State === "exited" || c.State === "dead";
        }
        return c.State === statusFilter;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          containerName(c.Names).toLowerCase().includes(q) ||
          c.Image.toLowerCase().includes(q) ||
          c.Id.toLowerCase().includes(q),
      );
    }

    return result;
  }, [containers, search, statusFilter]);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`h-8 px-3 text-sm rounded-md transition-colors ${
                statusFilter === filter
                  ? "bg-surface-container-highest text-primary"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <Input
          placeholder="Search name, image, or ID..."
          className="w-full sm:max-w-xs bg-surface-container-lowest border-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="hidden lg:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Ports</TableHead>
              <TableHead className="hidden xl:table-cell">Created</TableHead>
              {canManage && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 7 : 6}
                  className="text-center text-on-surface-variant h-32"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-on-surface-variant border-t-primary rounded-full animate-spin" />
                    <span className="text-sm">Loading containers...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredContainers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 7 : 6}
                  className="text-center text-on-surface-variant h-32"
                >
                  <span className="text-sm">
                    {search || statusFilter !== "all"
                      ? "No matching containers"
                      : "No containers found"}
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              filteredContainers.map((c) => (
                <TableRow key={c.Id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/containers/${c.Id}`}
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      {containerName(c.Names)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-on-surface-variant body-sm max-w-[200px] truncate">
                    {c.Image}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusToBadge(c.State)}>{c.State}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-on-surface-variant text-sm">
                    {c.Status}
                  </TableCell>
                  <TableCell className="hidden md:table-cell label-sm text-on-surface-variant">
                    {formatPorts(c.Ports)}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-on-surface-variant text-sm">
                    {timeAgo(c.Created)}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <ContainerActions
                        containerState={c.State}
                        containerId={c.Id}
                        canManage={canManage}
                        onAction={onAction}
                        actionLoading={actionLoadingId === c.Id}
                        compact={true}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
