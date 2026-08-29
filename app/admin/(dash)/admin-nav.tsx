"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Chevron from "@/components/chevron";
import { CHIP, FIELD_SM, PICK_OFF, PICK_ON } from "@/lib/ui";

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
      <nav className="flex items-center gap-1.5">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={`${t.href}?centre=${centre}`}
            aria-current={pathname === t.href ? "page" : undefined}
            className={`${CHIP} ${pathname === t.href ? PICK_ON : PICK_OFF}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="relative">
        <select
          aria-label="Centre"
          value={centre}
          onChange={(e) => router.push(`${pathname}?centre=${e.target.value}`)}
          className={`${FIELD_SM} appearance-none pr-10`}
        >
          {centres.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.district}
            </option>
          ))}
        </select>
        <Chevron />
      </div>
    </>
  );
}
