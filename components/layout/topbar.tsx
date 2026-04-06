"use client";
import * as React from "react";
import { useRouter } from "next/navigation";

export function Topbar({
  title,
  username,
  role,
  onToggleMobile,
}: {
  title: string;
  username?: string;
  role?: string;
  onToggleMobile?: () => void;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 md:left-[256px] h-[56px] bg-surface-container-low z-40 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="md:hidden p-1.5 rounded-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          aria-label="Toggle menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <h1 className="text-title-md font-sans text-on-surface">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {username && (
          <div className="flex items-center gap-3">
            <span className="text-label-sm font-sans text-on-surface-variant hidden sm:inline">
              {role}
            </span>
            <span className="text-body-sm font-sans text-on-surface">
              {username}
            </span>
          </div>
        )}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="px-3 py-1.5 rounded-sm text-label-sm font-sans text-on-surface-variant hover:bg-surface-container-high hover:text-error transition-colors disabled:opacity-50"
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </header>
  );
}
