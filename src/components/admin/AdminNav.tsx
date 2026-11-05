"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";

const LINKS: { href: string; label: string; roles: Role[] }[] = [
  { href: "/admin", label: "Dashboard", roles: ["admin"] },
  { href: "/admin/participants", label: "Participants", roles: ["staff", "admin"] },
  { href: "/admin/stations", label: "Stations", roles: ["admin"] },
  { href: "/admin/rewards", label: "Rewards", roles: ["admin"] },
  { href: "/admin/redemptions", label: "Redemptions", roles: ["admin"] },
];

export function AdminNav({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections" className="-mx-4 mt-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-1.5 rounded-full bg-white/85 p-1.5 shadow-tabs backdrop-blur-md">
        {LINKS.filter((link) => link.roles.includes(role)).map((link) => {
          const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink ${
                  active ? "bg-blue text-white" : "text-muted"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
