"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export function NavLinks({ showUsers }: { showUsers: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/projects", label: "Projects" },
    ...(showUsers ? [{ href: "/admin/users", label: "Users" }] : []),
  ];

  return (
    <div className="flex items-center gap-1">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-md px-2.5 py-1.5 transition-colors duration-200 sm:px-3",
              active ? "bg-accent-dim text-accent" : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
