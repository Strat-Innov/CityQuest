"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/pass", label: "ID" },
  { href: "/quest", label: "Quest" },
] as const;

/**
 * Bottom tab bar from the prototype. Pinned to the viewport (the prototype
 * pinned it to the bottom of a fixed-height frame) so it stays reachable.
 */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Sections"
      className="fixed bottom-3.5 left-1/2 z-10 flex w-[calc(100%-24px)] max-w-[376px] -translate-x-1/2 gap-1.5 rounded-full bg-white/85 p-1.5 shadow-tabs backdrop-blur-md"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 rounded-full p-3 text-center text-[15px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink ${
              active ? "bg-blue text-white" : "text-muted"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
