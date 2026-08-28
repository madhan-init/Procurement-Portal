"use client";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";

export default function LangToggle({ lang, variant = "chip" }: { lang: Lang; variant?: "chip" | "link" }) {
  const router = useRouter();
  function set(next: Lang) {
    document.cookie = `sih_lang=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  }

  if (variant === "link") {
    // Shows the OTHER language as the affordance ("हिंदी में देखें" / "View in English").
    const other: Lang = lang === "en" ? "hi" : "en";
    return (
      <button onClick={() => set(other)} className="font-medium text-leaf-700 underline-offset-2 hover:underline">
        {lang === "en" ? "हिंदी में देखें" : "View in English"}
      </button>
    );
  }

  return (
    <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs font-semibold">
      {(["en", "hi"] as const).map((l) => (
        <button
          key={l}
          onClick={() => set(l)}
          className={`px-2.5 py-1.5 ${lang === l ? "bg-leaf-600 text-white" : "bg-white text-gray-500"}`}
        >
          {l === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}
