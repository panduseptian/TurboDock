"use client";

import { Button } from "@/components/ui/button";
import { Play, RotateCw, Square, Trash2 } from "@/components/ui/icons";

type ContainerAction = "start" | "stop" | "restart" | "remove";

interface ContainerActionsProps {
  containerState: string;
  containerId: string;
  canManage: boolean;
  onAction: (containerId: string, action: ContainerAction) => void;
  actionLoading: boolean;
  compact?: boolean;
}

export function ContainerActions({
  containerState,
  containerId,
  canManage,
  onAction,
  actionLoading,
  compact = false,
}: Readonly<ContainerActionsProps>) {
  if (!canManage) {
    return null;
  }

  const normalizedState = containerState.toLowerCase();
  const isRunning = normalizedState === "running";
  const isStopped = normalizedState === "exited" || normalizedState === "dead";
  const isPaused = normalizedState === "paused";

  const sizeClass = compact ? "h-7 px-2 text-[10px]" : "h-8 px-2 text-sm";
  const baseClass = `font-medium transition-colors ${sizeClass}`;

  return (
    <div
      className={
        compact
          ? "flex items-center gap-1 bg-surface-container-high rounded-lg p-0.5"
          : "flex items-center gap-1.5 bg-surface-container-high rounded-lg p-1"
      }
    >
      {isRunning && (
        <>
          <Button
            variant="ghost"
            className={`text-error hover:bg-error/10 ${baseClass}`}
            onClick={() => onAction(containerId, "stop")}
            disabled={actionLoading}
          >
            <Square className="mr-1.5" />
            Stop
          </Button>
          <Button
            variant="ghost"
            className={`text-on-surface-variant hover:bg-surface-container-highest/40 ${baseClass}`}
            onClick={() => onAction(containerId, "restart")}
            disabled={actionLoading}
          >
            <RotateCw className="mr-1.5" />
            Restart
          </Button>
        </>
      )}

      {isStopped && (
        <Button
          variant="ghost"
          className={`text-primary hover:bg-primary/10 ${baseClass}`}
          onClick={() => onAction(containerId, "start")}
          disabled={actionLoading}
        >
          <Play className="mr-1.5" />
          Start
        </Button>
      )}

      {isPaused && (
        <Button
          variant="ghost"
          className={`text-error hover:bg-error/10 ${baseClass}`}
          onClick={() => onAction(containerId, "stop")}
          disabled={actionLoading}
        >
          <Square className="mr-1.5" />
          Stop
        </Button>
      )}

      <Button
        variant="ghost"
        className={`text-error hover:bg-error-container/30 ${baseClass}`}
        onClick={() => onAction(containerId, "remove")}
        disabled={actionLoading}
      >
        <Trash2 className="mr-1.5" />
        Remove
      </Button>
    </div>
  );
}
