"use client";
/* Admin sign-in — the farmer login screen's shell and tokens, one form. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import BrandMark from "@/components/brand-mark";
import ErrorLine from "@/components/error-line";
import { COLUMN, COMMIT, FIELD, FIELD_BAD, FIELD_LINE, FOOTNOTE, H1, HEADER, LABEL, SHELL, SUB } from "@/lib/ui";

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
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push("/admin");
        router.refresh();
        return;
      }
      setError("Invalid credentials");
    } catch {
      setError("Can't reach the server. Check your connection and try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={SHELL}>
      <header className={HEADER}>
        <div className="flex items-baseline gap-2">
          <BrandMark lang="en" />
          <span className="text-[13px] font-bold uppercase tracking-[0.11em] text-[#A0A3A8]">Admin</span>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-104px)] items-center justify-center px-6 pb-[14vh]">
        <div className={COLUMN}>
          <h1 className={H1}>Centre sign-in</h1>
          <p className={SUB}>MSP Procurement · staff dashboard</p>

          <ErrorLine message={error} />

          <form onSubmit={submit} className="mt-4 space-y-5" noValidate>
            <div>
              <label htmlFor="admin-user" className={`mb-2 ${LABEL}`}>
                Username
              </label>
              <input
                id="admin-user"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`${FIELD} ${error ? FIELD_BAD : FIELD_LINE}`}
              />
            </div>
            <div>
              <label htmlFor="admin-pass" className={`mb-2 ${LABEL}`}>
                Password
              </label>
              <input
                id="admin-pass"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "screen-error" : undefined}
                onChange={(e) => setPassword(e.target.value)}
                className={`${FIELD} ${error ? FIELD_BAD : FIELD_LINE}`}
              />
            </div>

            <button type="submit" disabled={busy} className={`mt-3 ${COMMIT}`}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className={`mt-8 ${FOOTNOTE}`}>demo: admin / admin123</p>
        </div>
      </div>
    </main>
  );
}
