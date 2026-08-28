"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <div className="text-center text-4xl">🏛️</div>
        <h1 className="mt-3 text-center text-xl font-bold">Centre Admin</h1>
        <p className="mt-1 text-center text-xs text-gray-400">MSP Procurement · staff dashboard</p>
        <input
          className="mt-6 w-full rounded-lg border border-gray-300 px-3 py-2.5"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2.5"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button disabled={busy} className="mt-5 w-full rounded-lg bg-gray-900 py-2.5 font-semibold text-white disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
        <p className="mt-4 text-center text-xs text-gray-300">demo: admin / admin123</p>
      </form>
    </main>
  );
}
