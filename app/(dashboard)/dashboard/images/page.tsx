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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Search, X } from "@/components/ui/icons";
import { useEndpointContext } from "@/contexts/endpoint-context";
import { formatBytes, timeAgo, truncateId } from "@/lib/formatters";
import { Image } from "@/lib/docker/types";

type DeleteDialogState = {
  open: boolean;
  image: Image | null;
};

export default function ImagesPage() {
  const { selectedEndpoint } = useEndpointContext();
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userRole, setUserRole] = useState<string>("user");
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    image: null,
  });

  const fetchImages = useCallback((endpoint: string) => {
    setLoading(true);
    fetch(`/api/docker/${endpoint}/images`)
      .then((res) => res.json())
      .then((data) => {
        setImages(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Failed to load images", err))
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
      fetchImages(selectedEndpoint.id);
      return;
    }

    setImages([]);
    setLoading(false);
  }, [selectedEndpoint?.id, fetchImages]);

  const handleDelete = () => {
    if (!deleteDialog.image || !selectedEndpoint?.id) return;

    fetch(
      `/api/docker/${selectedEndpoint.id}/images/${deleteDialog.image.Id}?force=true`,
      {
        method: "DELETE",
      },
    ).then(() => {
      setDeleteDialog({ open: false, image: null });
      fetchImages(selectedEndpoint.id);
    });
  };

  const filteredImages = useMemo(() => {
    if (!search) return images;
    return images.filter(
      (img) =>
        (img.RepoTags || []).some((tag: string) =>
          tag.toLowerCase().includes(search.toLowerCase()),
        ) || img.Id.toLowerCase().includes(search.toLowerCase()),
    );
  }, [images, search]);

  const totalSize = images.reduce((acc, img) => acc + (img.Size || 0), 0);
  const canManage = userRole === "admin" || userRole === "devops";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="headline-md text-on-surface text-2xl font-semibold">
            Images
          </h1>
          <p className="body-md text-on-surface-variant">
            View and manage container images on this endpoint
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3 shadow-ambient">
          <div className="flex flex-col">
            <span className="label-sm text-on-surface-variant">
              Total Count
            </span>
            <span className="title-md text-on-surface font-medium">
              {images.length}
            </span>
          </div>
          <div className="w-[1px] h-8 bg-outline-variant" />
          <div className="flex flex-col">
            <span className="label-sm text-on-surface-variant">Total Size</span>
            <span className="title-md text-on-surface font-medium">
              {formatBytes(totalSize)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <Input
            placeholder="Search by repo or tag..."
            className="w-full pl-9 bg-surface-container-lowest border-none shadow-none text-on-surface focus-visible:ring-1 focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-surface-container rounded-xl shadow-ambient overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-outline-variant hover:bg-transparent">
              <TableHead className="text-on-surface-variant font-medium">
                Repository:Tag
              </TableHead>
              <TableHead className="text-on-surface-variant font-medium">
                ID
              </TableHead>
              <TableHead className="text-on-surface-variant font-medium">
                Size
              </TableHead>
              <TableHead className="text-on-surface-variant font-medium">
                Created
              </TableHead>
              {canManage && (
                <TableHead className="text-right text-on-surface-variant font-medium">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow
                  key={i}
                  className="border-b border-outline-variant/50 hover:bg-transparent"
                >
                  <TableCell>
                    <div className="h-5 w-48 bg-surface-container-high animate-pulse rounded-md" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-24 bg-surface-container-high animate-pulse rounded-md" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-16 bg-surface-container-high animate-pulse rounded-md" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-24 bg-surface-container-high animate-pulse rounded-md" />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="h-8 w-8 bg-surface-container-high animate-pulse rounded-full ml-auto" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : filteredImages.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={canManage ? 5 : 4}
                  className="text-center text-on-surface-variant h-32"
                >
                  {search ? "No results found" : "No images available"}
                </TableCell>
              </TableRow>
            ) : (
              filteredImages.map((image) => {
                const tags = image.RepoTags || ["<none>:<none>"];
                const isUnused = tags.includes("<none>:<none>");

                return (
                  <TableRow
                    key={image.Id}
                    className="border-b border-outline-variant/50 hover:bg-surface-container-high/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex flex-col gap-2 items-start">
                        {tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="bg-surface-container-high rounded-full px-2 py-0.5 label-sm text-on-surface break-all max-w-[300px] truncate"
                          >
                            {tag}
                          </span>
                        ))}
                        {isUnused && (
                          <span className="bg-error-container/20 text-error rounded-full px-2 py-0.5 label-sm mt-1">
                            Unused
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="body-sm text-on-surface">
                      {truncateId(image.Id)}
                    </TableCell>
                    <TableCell className="body-sm text-on-surface-variant">
                      {formatBytes(image.Size || 0)}
                    </TableCell>
                    <TableCell className="body-sm text-on-surface-variant">
                      {timeAgo(image.Created)}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-error hover:bg-error-container/30 hover:text-error transition-colors"
                          onClick={() => setDeleteDialog({ open: true, image })}
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
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

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open: boolean) =>
          !open && setDeleteDialog({ open: false, image: null })
        }
      >
        <DialogContent className="bg-surface/80 backdrop-blur-xl border border-outline-variant shadow-elevation-3 rounded-2xl sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle className="title-lg text-error">
              Remove Image
            </DialogTitle>
            <DialogDescription className="body-md text-on-surface-variant mt-2">
              Are you sure you want to forcibly remove the image{" "}
              <span className="font-mono text-on-surface bg-surface-container-high px-1.5 py-0.5 rounded-md text-sm">
                {deleteDialog.image ? truncateId(deleteDialog.image.Id) : ""}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button
              variant="ghost"
              className="text-on-surface hover:bg-surface-container-high"
              onClick={() => setDeleteDialog({ open: false, image: null })}
            >
              <X className="mr-1.5 w-4 h-4" /> Cancel
            </Button>
            <Button
              variant="danger"
              className="bg-error text-on-error hover:bg-error/90"
              onClick={handleDelete}
            >
              <Trash2 className="mr-1.5 w-4 h-4" /> Confirm Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
