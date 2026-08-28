import { t, type Lang } from "@/lib/i18n";

/** Wordmark for the coral/ink screens — Outfit, tight tracking, ink.
 *  Sits top-left of every farmer screen. */
export default function BrandMark({ lang }: { lang: Lang }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="block font-heading text-[26px] font-extrabold tracking-[-0.02em] text-[#111111]">
        {t(lang, "app.brand")}
      </span>
    </div>
  );
}
