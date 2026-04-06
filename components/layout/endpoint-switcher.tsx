"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useEndpointContext } from "@/contexts/endpoint-context";

export function EndpointSwitcher() {
  const { endpoints, selectedEndpoint, setEndpoint } = useEndpointContext();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) {
        return;
      }

      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    globalThis.document.addEventListener("mousedown", handleClickOutside);

    return () => {
      globalThis.document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedName = selectedEndpoint?.name ?? "No endpoint selected";

  return (
    <div ref={wrapperRef} className="relative w-full max-w-60">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between bg-surface-container-high rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-container-highest"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`h-2 w-2 rounded-full ${
              selectedEndpoint
                ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]"
                : "bg-error"
            }`}
            aria-hidden
          />
          <span className="truncate body-sm text-on-surface">
            {selectedName}
          </span>
        </div>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 text-on-surface-variant transition-transform duration-300 ${
            open ? "rotate-180" : "rotate-0"
          }`}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full flex flex-col gap-1 p-1 max-h-60 overflow-y-auto glass rounded-lg shadow-ambient">
          {endpoints.length > 0 ? (
            endpoints.map((endpoint) => {
              const isSelected = endpoint.id === selectedEndpoint?.id;

              return (
                <button
                  key={endpoint.id}
                  type="button"
                  onClick={() => {
                    setEndpoint(endpoint.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 px-2 py-2 text-left rounded-md transition-colors ${
                    isSelected
                      ? "bg-surface-container-highest"
                      : "hover:bg-surface-container-high/50"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      isSelected
                        ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]"
                        : "bg-surface-container-high"
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate body-sm text-on-surface">
                    {endpoint.name}
                  </span>
                  <span className="ml-auto label-sm text-on-surface-variant">
                    {endpoint.type}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2.5 body-sm text-on-surface-variant">
              No endpoints.{" "}
              <Link
                href="/dashboard/endpoints"
                className="label-sm text-primary hover:underline transition-all"
                onClick={() => setOpen(false)}
              >
                Add endpoint
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
