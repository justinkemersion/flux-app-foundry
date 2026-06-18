"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui/cn";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/records", label: "Records" },
  { href: "/activity", label: "Activity" },
  { href: "/settings/profile", label: "Profile" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-md px-3 py-2 text-sm",
            pathname === link.href || pathname.startsWith(`${link.href}/`)
              ? "bg-[var(--muted)] font-medium"
              : "text-[var(--muted-fg)] hover:bg-[var(--muted)]",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
