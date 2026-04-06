"use client";

import { useState } from "react";
import { ServiceForm } from "@/components/services/service-form";
import { ServiceList } from "@/components/services/service-list";
import { Button } from "@/components/ui/button";
import { X } from "@/components/ui/icons";
import { useEndpointContext } from "@/contexts/endpoint-context";

type ViewState = "list" | "create";

export default function ServicesPage() {
  const { selectedEndpoint } = useEndpointContext();
  const [state, setState] = useState<ViewState>("list");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleCreateService = async (spec: Record<string, unknown>) => {
    if (!selectedEndpoint?.id) {
      setSubmitError("No endpoint selected");
      return;
    }

    setSubmitError(null);

    const response = await fetch(
      `/api/docker/${selectedEndpoint.id}/services`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(spec),
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      const message =
        payload && typeof payload.error === "string"
          ? payload.error
          : "Failed to create service";
      setSubmitError(message);
      return;
    }

    setState("list");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="headline-md text-on-surface">Services</h1>
      </div>

      {selectedEndpoint?.id ? (
        state === "list" ? (
          <ServiceList
            endpointId={selectedEndpoint.id}
            onCreateClick={() => {
              setSubmitError(null);
              setState("create");
            }}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3">
              <h2 className="title-lg text-on-surface">Create Service</h2>
              <Button
                type="button"
                variant="ghost"
                className="text-on-surface-variant hover:text-on-surface"
                onClick={() => {
                  setSubmitError(null);
                  setState("list");
                }}
              >
                <X className="mr-1.5" />
                Cancel
              </Button>
            </div>

            {submitError ? (
              <p className="rounded-lg bg-error-container/20 p-3 text-sm text-error">
                {submitError}
              </p>
            ) : null}

            <ServiceForm
              onSubmit={handleCreateService}
              submitLabel="Create Service"
            />
          </div>
        )
      ) : (
        <div className="p-6">
          <p className="text-on-surface-variant">No endpoint selected</p>
        </div>
      )}
    </div>
  );
}
