import { prisma } from "@/lib/db";
import { getLang } from "@/lib/lang";
import BrandMark from "@/components/brand-mark";
import AdminNav from "./admin-nav";

export const dynamic = "force-dynamic";

/** Admin shell — same white surface, borders and type as the farmer
 *  screens; only the layout differs (dense, wide, tabbed). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const centres = await prisma.centre.findMany({
    orderBy: { id: "asc" },
    select: { id: true, name: true, district: true },
  });
  const lang = await getLang();

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-[#E4E4E7] bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-3.5">
          <div className="flex shrink-0 items-baseline gap-2">
            <BrandMark lang={lang} />
            <span className="text-[13px] font-bold uppercase tracking-[0.11em] text-[#A0A3A8]">Admin</span>
          </div>
          <AdminNav centres={centres} />
          <form action="/api/admin/logout" method="post" className="ml-auto shrink-0">
            <button className="text-[15px] font-medium text-[#6B7280] underline-offset-4 transition-colors hover:text-[#111111] hover:underline">
              Logout
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-6 py-8">{children}</main>
    </div>
  );
}
