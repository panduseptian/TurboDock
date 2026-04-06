"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

const typeStyles: Record<ToastType, string> = {
  success: "text-primary shadow-[0_0_12px_2px_rgba(123,208,255,0.1)]",
  error: "text-error shadow-[0_0_12px_2px_rgba(255,180,171,0.1)]",
  info: "text-on-surface",
  warning: "text-tertiary shadow-[0_0_12px_2px_rgba(222,194,154,0.1)]",
};

const typeIndicator: Record<ToastType, string> = {
  success: "bg-primary",
  error: "bg-error",
  info: "bg-on-surface-variant",
  warning: "bg-tertiary",
};

let addToast: (type: ToastType, message: string) => void = () => {};

export function toast(type: ToastType, message: string) {
  addToast(type, message);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToast = (type: ToastType, message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`glass rounded-lg px-4 py-3 body-sm flex items-center gap-3 min-w-[280px] max-w-[400px] animate-in slide-in-from-right ${typeStyles[t.type]}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeIndicator[t.type]}`}
          />
          {t.message}
        </div>
      ))}
    </div>
  );
}

interface ToastProps {
  message: string;
  type: ToastType;
  onClose?: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <div
        className={`glass rounded-lg px-4 py-3 body-sm flex items-center gap-3 min-w-[280px] max-w-[400px] ${typeStyles[type]}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeIndicator[type]}`}
        />
        <span className="flex-1">{message}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
