"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  CodeIcon,
  FolderIcon,
  KeyIcon,
  LanguagesIcon,
  PlusIcon,
  TransferIcon,
  UsersIcon,
} from "@/components/icons";
import { cx, Logo } from "@/components/ui";
import type { ProjectNavItem } from "@/lib/projects";
import { SignOutButton } from "./sign-out-button";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

/** Pages inside a project; `segment` is the path after /projects/[slug]. */
export const PROJECT_SECTIONS: { segment: string | null; label: string; icon: IconType; ownerOnly?: boolean }[] = [
  { segment: null, label: "Translations", icon: LanguagesIcon },
  { segment: "import-export", label: "Import / Export", icon: TransferIcon },
  { segment: "sdks", label: "SDKs", icon: CodeIcon },
  { segment: "members", label: "Members", icon: UsersIcon },
  { segment: "api-keys", label: "API keys", icon: KeyIcon, ownerOnly: true },
];

export interface SidebarUser {
  name: string;
  email: string;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  onNavigate,
  className,
}: {
  href: string;
  icon: IconType;
  label: string;
  active: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-200",
        active ? "bg-accent-dim font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-foreground",
        className,
      )}
    >
      <Icon className="shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar({
  user,
  isAdmin,
  projects,
  onNavigate,
}: {
  user: SidebarUser;
  isAdmin: boolean;
  projects: ProjectNavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const match = pathname.match(/^\/projects\/([^/]+)(?:\/([^/]+))?/);
  const activeSlug = match && match[1] !== "new" ? decodeURIComponent(match[1]) : null;
  const activeSection = match?.[2] ?? null;

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/projects"
        onClick={onNavigate}
        className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-5 font-semibold tracking-tight"
      >
        <Logo className="h-7 shrink-0" />
        <span className="h-5 w-px bg-border-strong" aria-hidden="true" />
        <span>Translate</span>
      </Link>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between px-2.5 pb-1">
            <span className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.14em] text-subtle">
              Projects
            </span>
            <Link
              href="/projects/new"
              onClick={onNavigate}
              title="New project"
              aria-label="New project"
              className={cx(
                "grid size-6 place-items-center rounded-md transition-colors",
                pathname === "/projects/new"
                  ? "bg-accent-dim text-accent"
                  : "text-subtle hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <PlusIcon width={15} height={15} />
            </Link>
          </div>
          <NavItem
            href="/projects"
            icon={FolderIcon}
            label="All projects"
            active={pathname === "/projects"}
            onNavigate={onNavigate}
          />
          {projects.map((project) => {
            const open = project.slug === activeSlug;
            return (
              <div key={project.slug} className="flex flex-col">
                <Link
                  href={`/projects/${project.slug}`}
                  onClick={onNavigate}
                  aria-current={open && activeSection === null ? "page" : undefined}
                  className={cx(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-200",
                    open ? "font-medium text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  <span
                    className={cx(
                      "grid size-[18px] shrink-0 place-items-center rounded font-mono text-[0.6rem] font-semibold",
                      open ? "bg-accent text-on-accent" : "bg-accent-dim text-accent",
                    )}
                  >
                    {project.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate">{project.name}</span>
                </Link>
                {open && (
                  <div className="my-1 ml-[18px] flex flex-col gap-0.5 border-l border-border pl-2">
                    {PROJECT_SECTIONS.filter((s) => !s.ownerOnly || project.canManage).map((section) => (
                      <NavItem
                        key={section.label}
                        href={`/projects/${project.slug}${section.segment ? `/${section.segment}` : ""}`}
                        icon={section.icon}
                        label={section.label}
                        active={activeSection === section.segment}
                        onNavigate={onNavigate}
                        className="py-1"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-1">
            <span className="px-2.5 pb-1 font-mono text-[0.68rem] font-medium uppercase tracking-[0.14em] text-subtle">
              Instance
            </span>
            <NavItem
              href="/admin/users"
              icon={UsersIcon}
              label="Users"
              active={pathname.startsWith("/admin/users")}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-3 border-t border-border px-4 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-dim font-mono text-xs font-medium text-accent">
          {initials(user.name || user.email)}
        </span>
        <div className="min-w-0 flex-1 text-sm leading-tight">
          <div className="truncate font-medium">{user.name}</div>
          <div className="truncate text-xs text-subtle">{user.email}</div>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}
