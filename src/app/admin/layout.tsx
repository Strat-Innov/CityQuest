import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · City Quest Admin" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["staff", "admin"], "/admin");

  return (
    <div
      className="min-h-screen w-full px-4 pb-16 pt-6 max-[440px]:pt-5"
      style={{ background: "linear-gradient(160deg, #ebe7f8, #f7f5fc 55%, #ece8f8)" }}
    >
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="eyebrow">City Quest</div>
            <div className="text-xl font-bold tracking-tight">{profile.role === "admin" ? "Admin console" : "Staff console"}</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">
              {profile.full_name} · <span className="pill pill-blue capitalize">{profile.role}</span>
            </span>
            <Link href="/quest" className="font-semibold text-blue underline">
              Participant view
            </Link>
            <form action={logout}>
              <button type="submit" className="cursor-pointer font-semibold text-muted underline">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <AdminNav role={profile.role} />
        {children}
      </div>
    </div>
  );
}
