import Link from "next/link";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import BrandMark from "@/components/brand-mark";
import { COLUMN, COMMIT, FOOTNOTE, H1, HEADER, SHELL, SUB } from "@/lib/ui";

/** Reached by any unmatched route, and by notFound() — including a booking id
 *  that doesn't exist or belongs to another farmer, which is easy to hit from
 *  an old SMS link. Replaces Next's built-in black-on-white 404. */
export default async function NotFound() {
  const lang = await getLang();
  return (
    <main className={SHELL}>
      <header className={HEADER}>
        <BrandMark lang={lang} />
      </header>

      <div className="flex min-h-[calc(100vh-104px)] items-center justify-center px-6 pb-[14vh]">
        <div className={COLUMN}>
          <p className="text-center font-heading text-[64px] font-extrabold leading-none tracking-[-0.04em] text-[#EFEFF1]">
            404
          </p>
          <h1 className={`mt-4 ${H1}`}>{t(lang, "err.not_found_title")}</h1>
          <p className={SUB}>{t(lang, "err.not_found_body")}</p>

          <Link href="/" className={`mt-8 ${COMMIT}`}>
            {t(lang, "success.back")}
          </Link>

          <p className={`mt-8 ${FOOTNOTE}`}>{t(lang, "login.footer")}</p>
        </div>
      </div>
    </main>
  );
}
