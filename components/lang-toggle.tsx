"use client";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";

export default function LangToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  function set(next: Lang) {
    document.cookie = `sih_lang=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  }
  return (
    <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs font-semibold">
      {(["en", "hi"] as const).map((l) => (
        <button
          key={l}
          onClick={() => set(l)}
          className={`px-2.5 py-1.5 ${lang === l ? "bg-green-700 text-white" : "bg-white text-gray-500"}`}
        >
          {l === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}
