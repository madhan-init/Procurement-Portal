"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";
import LangToggle from "@/components/lang-toggle";
import { IconWheat } from "@/components/icons";

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6 text-[18px]">
      <div className="mb-4 flex justify-end">
        <LangToggle lang={lang} />
      </div>
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-leaf-600 text-white shadow-sm">
          <IconWheat size={30} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-leaf-900">{t(lang, "app.title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t(lang, "app.tagline")}</p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60">
        {stage === "phone" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); sendOtp(); }}>
            <label className="block text-sm font-medium">{t(lang, "login.mobile")}</label>
            <div className="flex h-14 items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 focus-within:border-leaf-600">
              <span className="text-gray-500">+91</span>
              <input
                autoFocus
                inputMode="numeric"
                placeholder={t(lang, "login.mobile_ph")}
                className="h-full w-full bg-transparent outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <button disabled={busy} className="min-h-14 w-full rounded-xl bg-leaf-600 font-semibold text-white hover:bg-leaf-700 active:scale-[.99] disabled:opacity-50">
              {busy ? t(lang, "login.sending") : t(lang, "login.send_otp")}
            </button>
          </form>
        )}

        {stage === "otp" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); verify(); }}>
            <p className="text-sm text-gray-600">
              {t(lang, "login.otp_sent")} <b>+91 {phone.replace(/\D/g, "").slice(-10)}</b>
              <span className="ml-1 rounded-full bg-wheat-50 px-2 py-0.5 text-xs font-medium text-wheat-700">{t(lang, "login.demo_otp")}</span>
            </p>
            <input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              placeholder={t(lang, "login.otp_ph")}
              className="h-14 w-full rounded-xl border border-gray-300 px-3 text-center text-xl tracking-[.5em] outline-none focus:border-leaf-600"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button disabled={busy || otp.length !== 6} className="min-h-14 w-full rounded-xl bg-leaf-600 font-semibold text-white hover:bg-leaf-700 disabled:opacity-50">
              {busy ? t(lang, "login.verifying") : t(lang, "login.verify")}
            </button>
            <button type="button" className="w-full text-sm text-gray-500" onClick={() => setStage("phone")}>
              {t(lang, "login.change_number")}
            </button>
          </form>
        )}

        {stage === "profile" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); verify({ name, village, language }); }}>
            <p className="text-sm font-medium text-leaf-800">{t(lang, "login.welcome")}</p>
            <input
              autoFocus
              placeholder={t(lang, "login.name")}
              className="h-14 w-full rounded-xl border border-gray-300 px-4 outline-none focus:border-leaf-600"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              placeholder={t(lang, "login.village")}
              className="h-14 w-full rounded-xl border border-gray-300 px-4 outline-none focus:border-leaf-600"
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
                    language === o.v ? "border-leaf-600 bg-leaf-50 text-leaf-800" : "border-gray-300 text-gray-600"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <button disabled={busy || !name.trim() || !village.trim()} className="min-h-14 w-full rounded-xl bg-leaf-600 font-semibold text-white hover:bg-leaf-700 disabled:opacity-50">
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
