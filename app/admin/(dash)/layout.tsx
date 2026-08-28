import Link from "next/link";
import { prisma } from "@/lib/db";
import AdminNav from "./admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const centres = await prisma.centre.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, district: true } });
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-bold">
            <span>🏛️</span> <span>Procurement Admin</span>
          </Link>
          <AdminNav centres={centres} />
          <form action="/api/admin/logout" method="post" className="ml-auto">
            <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500">Logout</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
