"use client";
/* ─────────────────────────────────────────────────────────
   Mandi Mitra — mobile + OTP login
   Layout adapted from the supplied Optiflow reference: white page,
   brand mark top-left, one centred column, coral commit button.
   Class tokens and the palette live in lib/ui — shared with the
   book screen so the two can't drift.
   Backend is unchanged: POST /api/auth/otp with action
   "request" | "verify" (three stages, no password).
   ──────────────────────────────────────────────────────── */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";
import BrandMark from "@/components/brand-mark";
import ErrorLine from "@/components/error-line";
import {
  COLUMN,
  COMMIT,
  FIELD,
  FIELD_BAD,
  FIELD_LINE,
  FOOTNOTE,
  GHOST,
  H1,
  HEADER,
  HELP,
  LABEL,
  LINK,
  SHELL,
  SUB,
} from "@/lib/ui";

type Stage = "phone" | "otp" | "profile";

export default function LoginClient({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return null;
      }
      return data;
    } catch {
      setError("Can't reach the server. Check your connection and try again");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    const data = await post({ action: "request", phone });
    if (data) {
      setStage("otp");
      setOtp("");
    }
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

  const headline =
    stage === "phone"
      ? t(lang, "login.headline_phone")
      : stage === "otp"
        ? t(lang, "login.headline_otp")
        : t(lang, "login.headline_profile");

  return (
    <main className={SHELL}>
      <header className={HEADER}>
        <BrandMark lang={lang} />
      </header>

      <div className="flex min-h-[calc(100vh-104px)] items-center justify-center px-6 pb-[14vh]">
        <div className={COLUMN}>
          <h1 className={H1}>
            {headline}
          </h1>
          <p className={SUB}>
            {stage === "phone" && (
              <>
                {t(lang, "login.sub_before")}{" "}
                <span className="font-semibold text-[#111111]">{t(lang, "app.brand")}</span>{" "}
                {t(lang, "login.sub_after")}
              </>
            )}
            {stage === "otp" && (
              <>
                {t(lang, "login.otp_sent")}{" "}
                <span className="whitespace-nowrap font-semibold text-[#111111]">+91 {phone}</span>
              </>
            )}
            {stage === "profile" && t(lang, "login.welcome")}
          </p>

          <ErrorLine message={error} />

          {/* ── Stage one: mobile number ── */}
          {stage === "phone" && (
            <form
              className="mt-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                sendOtp();
              }}
            >
              <label htmlFor="phone" className={`mb-2 ${LABEL}`}>
                {t(lang, "login.mobile")}
              </label>
              <div className="relative">
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] font-semibold text-[#6B7280]"
                >
                  +91
                </span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  autoFocus
                  maxLength={10}
                  placeholder={t(lang, "login.mobile_ph")}
                  value={phone}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "screen-error" : undefined}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className={`${FIELD} pl-[3.75rem] tracking-[0.06em] ${
                    error ? FIELD_BAD : FIELD_LINE
                  }`}
                />
              </div>
              <p className={`mt-3 ${HELP}`}>
                <span className="font-medium text-[#111111]">{t(lang, "login.new_here")}</span>{" "}
                {t(lang, "login.new_here_hint")}
              </p>

              <button type="submit" disabled={busy || phone.length !== 10} className={`mt-3 ${COMMIT}`}>
                {busy ? t(lang, "login.sending") : t(lang, "login.send_otp")}
              </button>
            </form>
          )}

          {/* ── Stage two: OTP ── */}
          {stage === "otp" && (
            <form
              className="mt-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                verify();
              }}
            >
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <label htmlFor="otp" className={LABEL}>
                  {t(lang, "login.otp_ph")}
                </label>
                <span className="text-[13px] font-medium text-[#A0A3A8]">
                  {t(lang, "login.demo_otp")}
                </span>
              </div>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={otp}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "screen-error" : undefined}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={`${FIELD} text-center text-[22px] font-semibold tracking-[0.5em] ${
                  error ? FIELD_BAD : FIELD_LINE
                }`}
              />
              <p className={`mt-3 ${HELP}`}>
                <button
                  type="button"
                  onClick={() => {
                    setStage("phone");
                    setError("");
                  }}
                  className={LINK}
                >
                  {t(lang, "login.change_number")}
                </button>
              </p>

              <button type="submit" disabled={busy || otp.length !== 6} className={`mt-3 ${COMMIT}`}>
                {busy ? t(lang, "login.verifying") : t(lang, "login.verify")}
              </button>

              <div className="my-7 flex items-center gap-4">
                <span className="h-px flex-1 bg-[#E4E4E7]" />
                <span className="text-[16px] text-[#A0A3A8]">{t(lang, "login.resend_q")}</span>
                <span className="h-px flex-1 bg-[#E4E4E7]" />
              </div>

              <button type="button" onClick={sendOtp} disabled={busy} className={GHOST}>
                {t(lang, "login.resend")}
              </button>
            </form>
          )}

          {/* ── Stage three: first-visit profile ── */}
          {stage === "profile" && (
            <form
              className="mt-4 space-y-5"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                verify({ name, village, language: lang });
              }}
            >
              <div>
                <label htmlFor="pf-name" className={`mb-2 ${LABEL}`}>
                  {t(lang, "login.name")}
                </label>
                <input
                  id="pf-name"
                  autoFocus
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`${FIELD} ${FIELD_LINE}`}
                />
              </div>
              <div>
                <label htmlFor="pf-village" className={`mb-2 ${LABEL}`}>
                  {t(lang, "login.village")}
                </label>
                <input
                  id="pf-village"
                  autoComplete="address-level3"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className={`${FIELD} ${FIELD_LINE}`}
                />
              </div>

              <button
                type="submit"
                disabled={busy || !name.trim() || !village.trim()}
                className={`mt-3 ${COMMIT}`}
              >
                {busy ? t(lang, "login.creating") : t(lang, "login.create")}
              </button>
            </form>
          )}

          <p className={`mt-8 ${FOOTNOTE}`}>{t(lang, "login.footer")}</p>
        </div>
      </div>
    </main>
  );
}
