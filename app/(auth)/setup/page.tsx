"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus } from "@/components/ui/icons";

export default function SetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create account");
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Setup failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
          <UserPlus className="w-6 h-6 text-primary" />
        </div>
        <h1 className="headline-md mb-2">Initial Setup</h1>
        <p className="body-sm text-on-surface-variant">
          Create your admin account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          className="bg-surface-container-lowest border-none focus-within:ring-2 focus-within:ring-primary/50"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="bg-surface-container-lowest border-none focus-within:ring-2 focus-within:ring-primary/50"
        />
        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          className="bg-surface-container-lowest border-none focus-within:ring-2 focus-within:ring-primary/50"
        />
        {error && (
          <div className="text-error bg-error-container/20 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}
        <Button
          type="submit"
          className="w-full gradient-primary text-on-primary font-semibold border-none"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Admin Account"}
        </Button>
      </form>
    </div>
  );
}
