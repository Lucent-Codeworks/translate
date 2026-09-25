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
    { href: `/projects/${slug}/sdks`, label: "SDKs", active: segment === "sdks" },
    { href: `/projects/${slug}/members`, label: "Members", active: segment === "members" },
    ...(showSettings
      ? [{ href: `/projects/${slug}/api-keys`, label: "API keys", active: segment === "api-keys" }]
      : []),
  ];

  return (
    <nav
      // Baseline drawn as an inset shadow (not a border the tabs overlap), so the
      // row never overflows vertically; horizontal scroll stays for narrow screens.
      className="flex gap-6 overflow-x-auto text-sm shadow-[inset_0_-1px_0_var(--border)] [scrollbar-width:none]"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={
            "shrink-0 border-b-2 pb-3 transition-colors duration-200 " +
            (tab.active
              ? "border-accent font-medium text-foreground"
              : "border-transparent text-muted hover:border-border-strong hover:text-foreground")
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
