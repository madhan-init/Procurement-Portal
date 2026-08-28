"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";
import LangToggle from "@/components/lang-toggle";

type Stage = "phone" | "otp" | "profile";

export default function LoginClient({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [language, setLanguage] = useState("hi");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return null;
    }
    return data;
  }

  async function sendOtp() {
    const data = await post({ action: "request", phone });
    if (data) setStage("otp");
  }

  async function verify(extra: Record<string, unknown> = {}) {
    const data = await post({ action: "verify", phone, otp, ...extra });
    if (!data) return;
    if (data.needsProfile) {
      setStage("profile");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <div className="mb-4 flex justify-end">
        <LangToggle lang={lang} />
      </div>
      <div className="mb-8 text-center">
        <div className="text-5xl">🌾</div>
        <h1 className="mt-3 text-2xl font-bold text-green-900">{t(lang, "app.title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t(lang, "app.tagline")}</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        {stage === "phone" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); sendOtp(); }}>
            <label className="block text-sm font-medium">{t(lang, "login.mobile")}</label>
            <div className="flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-3 focus-within:border-green-600">
              <span className="text-gray-500">+91</span>
              <input
                autoFocus
                inputMode="numeric"
                placeholder={t(lang, "login.mobile_ph")}
                className="w-full outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <button disabled={busy} className="w-full rounded-xl bg-green-700 py-3 font-semibold text-white active:scale-[.99] disabled:opacity-50">
              {busy ? t(lang, "login.sending") : t(lang, "login.send_otp")}
            </button>
          </form>
        )}

        {stage === "otp" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); verify(); }}>
            <p className="text-sm text-gray-600">
              {t(lang, "login.otp_sent")} <b>+91 {phone.replace(/\D/g, "").slice(-10)}</b>
              <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">{t(lang, "login.demo_otp")}</span>
            </p>
            <input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              placeholder={t(lang, "login.otp_ph")}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-center text-xl tracking-[.5em] outline-none focus:border-green-600"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button disabled={busy || otp.length !== 6} className="w-full rounded-xl bg-green-700 py-3 font-semibold text-white disabled:opacity-50">
              {busy ? t(lang, "login.verifying") : t(lang, "login.verify")}
            </button>
            <button type="button" className="w-full text-sm text-gray-500" onClick={() => setStage("phone")}>
              {t(lang, "login.change_number")}
            </button>
          </form>
        )}

        {stage === "profile" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); verify({ name, village, language }); }}>
            <p className="text-sm font-medium text-green-800">{t(lang, "login.welcome")}</p>
            <input
              autoFocus
              placeholder={t(lang, "login.name")}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-green-600"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              placeholder={t(lang, "login.village")}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-green-600"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
            />
            <div className="flex gap-2">
              {[{ v: "hi", label: "हिंदी" }, { v: "en", label: "English" }].map((o) => (
                <button
                  type="button"
                  key={o.v}
                  onClick={() => setLanguage(o.v)}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-medium ${
                    language === o.v ? "border-green-700 bg-green-50 text-green-800" : "border-gray-300 text-gray-600"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <button disabled={busy || !name.trim() || !village.trim()} className="w-full rounded-xl bg-green-700 py-3 font-semibold text-white disabled:opacity-50">
              {busy ? t(lang, "login.creating") : t(lang, "login.create")}
            </button>
          </form>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
      <p className="mt-6 text-center text-xs text-gray-400">{t(lang, "login.footer")}</p>
    </main>
  );
}
