"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

export function ProjectTabs({ slug, showSettings }: { slug: string; showSettings: boolean }) {
  const segment = useSelectedLayoutSegment();
  const tabs = [
    { href: `/projects/${slug}`, label: "Translations", active: segment === null },
    {
      href: `/projects/${slug}/import-export`,
      label: "Import / Export",
      active: segment === "import-export",
    },
    { href: `/projects/${slug}/members`, label: "Members", active: segment === "members" },
    ...(showSettings
      ? [{ href: `/projects/${slug}/api-keys`, label: "API keys", active: segment === "api-keys" }]
      : []),
  ];

  return (
    <nav className="flex gap-4 border-b border-border text-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={
            "-mb-px border-b-2 pb-2 " +
            (tab.active
              ? "border-foreground font-medium"
              : "border-transparent text-muted hover:text-foreground")
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
