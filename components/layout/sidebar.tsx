"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EndpointSwitcher } from "@/components/layout/endpoint-switcher";

const mainItems = [
  { label: "Dashboard", href: "/dashboard", icon: "grid" },
  { label: "Containers", href: "/dashboard/containers", icon: "box" },
  { label: "Images", href: "/dashboard/images", icon: "layers" },
  { label: "Networks", href: "/dashboard/networks", icon: "network" },
  { label: "Volumes", href: "/dashboard/volumes", icon: "database" },
];

const swarmItems = [
  { label: "Services", href: "/dashboard/services", icon: "server" },
  { label: "Nodes", href: "/dashboard/nodes", icon: "network" },
  { label: "Tasks", href: "/dashboard/tasks", icon: "grid" },
];

const adminItems = [
  { label: "Users", href: "/dashboard/users", icon: "users" },
  { label: "Endpoints", href: "/dashboard/endpoints", icon: "link" },
  { label: "Audit Log", href: "/dashboard/audit-logs", icon: "scroll" },
];

const iconMap: Record<string, React.ReactNode> = {
  grid: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="7" height="7" x="3" y="3" />
      <rect width="7" height="7" x="14" y="3" />
      <rect width="7" height="7" x="14" y="14" />
      <rect width="7" height="7" x="3" y="14" />
    </svg>
  ),
  box: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  ),
  layers: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    </svg>
  ),
  network: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
      <path d="M12 12V8" />
    </svg>
  ),
  database: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  ),
  server: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  ),
  users: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  link: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  scroll: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 12h-5" />
      <path d="M15 8h-5" />
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2" />
    </svg>
  ),
};

function NavItem({
  label,
  href,
  icon,
  isActive,
}: {
  label: string;
  href: string;
  icon: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 py-2 px-4 transition-colors ${
        isActive
          ? "bg-surface-container-highest border-l-2 border-primary text-on-surface"
          : "border-l-2 border-transparent text-on-surface-variant hover:bg-surface-container-high/50"
      }`}
    >
      <span className={isActive ? "text-primary" : "text-on-surface-variant"}>
        {iconMap[icon]}
      </span>
      <span className="label-md">{label}</span>
    </Link>
  );
}

export function Sidebar({
  selectedEndpointType = null,
  isAdmin = false,
  isMobile = false,
}: {
  selectedEndpointType?: "standalone" | "swarm" | null;
  isAdmin?: boolean;
  isMobile?: boolean;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`w-[256px] h-screen bg-surface-container-low flex-col fixed inset-y-0 z-50 ${
        isMobile ? "flex" : "hidden md:flex"
      }`}
    >
      <div className="p-6 shrink-0">
        <Link
          href="/dashboard"
          className="headline-sm text-on-surface hover:opacity-80 transition-opacity block"
        >
          TurboDock
        </Link>
      </div>
      <div className="px-4 py-3">
        <EndpointSwitcher />
      </div>
      <nav className="flex-1 overflow-y-auto py-6 space-y-1">
        <div className="px-4 mb-2">
          <span className="label-sm text-on-surface-variant">Main</span>
        </div>
        {mainItems.map((item) => (
          <NavItem key={item.href} {...item} isActive={isActive(item.href)} />
        ))}

        {selectedEndpointType === "swarm" && (
          <>
            <div className="px-4 mt-6 mb-2">
              <span className="label-sm text-on-surface-variant">Swarm</span>
            </div>
            {swarmItems.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                isActive={isActive(item.href)}
              />
            ))}
          </>
        )}

        {isAdmin && (
          <>
            <div className="px-4 mt-6 mb-2">
              <span className="label-sm text-on-surface-variant">Admin</span>
            </div>
            {adminItems.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                isActive={isActive(item.href)}
              />
            ))}
          </>
        )}
      </nav>
      <div className="p-4 label-sm text-on-surface-variant opacity-50">
        v1.0.0
      </div>
    </aside>
  );
}
