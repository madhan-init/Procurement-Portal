"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Today's queue" },
  { href: "/admin/slots", label: "Slots" },
  { href: "/admin/notifications", label: "Notifications" },
];

export default function AdminNav({ centres }: { centres: { id: number; name: string; district: string }[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const centre = params.get("centre") ?? "1";

  return (
    <>
      <nav className="flex items-center gap-1">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={`${t.href}?centre=${centre}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              pathname === t.href ? "bg-leaf-600 text-white" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <select
        value={centre}
        onChange={(e) => router.push(`${pathname}?centre=${e.target.value}`)}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
      >
        {centres.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — {c.district}
          </option>
        ))}
      </select>
    </>
  );
}
