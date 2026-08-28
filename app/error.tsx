"use client";
import { useEffect } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import BrandMark from "@/components/brand-mark";
import { COLUMN, COMMIT, FOOTNOTE, GHOST, H1, HEADER, SHELL, SUB } from "@/lib/ui";

/** Client error boundary for the farmer routes. Language is pinned to "en"
 *  because getLang() is server-only; when Hindi comes back (see lib/lang.ts)
 *  this needs to read the cookie client-side. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const lang = "en" as const;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={SHELL}>
      <header className={HEADER}>
        <BrandMark lang={lang} />
      </header>

      <div className="flex min-h-[calc(100vh-104px)] items-center justify-center px-6 pb-[14vh]">
        <div className={COLUMN}>
          <h1 className={H1}>{t(lang, "err.oops_title")}</h1>
          <p className={SUB}>{t(lang, "err.oops_body")}</p>

          <button onClick={reset} className={`mt-8 ${COMMIT}`}>
            {t(lang, "err.retry")}
          </button>
          <Link href="/" className={`mt-3 ${GHOST}`}>
            {t(lang, "success.back")}
          </Link>

          {error.digest && (
            <p className="mt-6 text-center font-mono text-[12px] text-[#A0A3A8]">{error.digest}</p>
          )}
          <p className={`mt-8 ${FOOTNOTE}`}>{t(lang, "login.footer")}</p>
        </div>
      </div>
    </main>
  );
}
