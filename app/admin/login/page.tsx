"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconWheat } from "@/components/icons";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setError("Invalid credentials");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200/60">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-leaf-600 text-white">
          <IconWheat size={26} />
        </div>
        <h1 className="mt-3 text-center text-xl font-bold">Mandi Mitra · Centre Admin</h1>
        <p className="mt-1 text-center text-xs text-gray-400">MSP Procurement · staff dashboard</p>
        <input
          className="mt-6 w-full rounded-xl border border-gray-300 px-3 py-2.5"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2.5"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button disabled={busy} className="mt-5 w-full rounded-xl bg-leaf-600 py-2.5 font-semibold text-white hover:bg-leaf-700 disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
        <p className="mt-4 text-center text-xs text-gray-300">demo: admin / admin123</p>
      </form>
    </main>
  );
}
