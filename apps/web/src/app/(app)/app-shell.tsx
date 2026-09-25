"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { Logo } from "@/components/ui";
import type { ProjectNavItem } from "@/lib/projects";
import { Sidebar, type SidebarUser } from "./sidebar";

/** Sidebar on large screens; a top bar with a slide-in drawer below that. */
export function AppShell({
  user,
  isAdmin,
  projects,
  children,
}: {
  user: SidebarUser;
  isAdmin: boolean;
  projects: ProjectNavItem[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sidebar = (onNavigate?: () => void) => (
    <Sidebar user={user} isAdmin={isAdmin} projects={projects} onNavigate={onNavigate} />
  );

  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-elevated lg:block">
        {sidebar()}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border bg-elevated shadow-2xl">
            <button
              ref={closeRef}
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute top-4 right-3 z-10 grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <CloseIcon />
            </button>
            {sidebar(() => setOpen(false))}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            className="grid size-9 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <MenuIcon />
          </button>
          <Link href="/projects" className="flex items-center gap-2.5 text-sm font-semibold tracking-tight">
            <Logo className="h-6" />
            <span className="h-4 w-px bg-border-strong" aria-hidden="true" />
            <span>Translate</span>
          </Link>
        </header>
        <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
