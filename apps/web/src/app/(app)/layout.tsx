import Link from "next/link";
import { Logo } from "@/components/ui";
import { isAdmin } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 text-sm sm:gap-8">
          <Link href="/projects" className="flex shrink-0 items-center gap-3 font-semibold tracking-tight">
            <Logo className="h-7 shrink-0 sm:h-8" />
            <span className="hidden h-5 w-px bg-border-strong sm:block" aria-hidden="true" />
            <span className="hidden sm:inline">Translate</span>
          </Link>
          <NavLinks showUsers={isAdmin(session)} />
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <span
              title={session.user.email}
              className="grid size-8 place-items-center rounded-full bg-accent-dim font-mono text-xs font-medium text-accent"
            >
              {initials(session.user.name || session.user.email)}
            </span>
            <span className="hidden text-muted sm:inline">{session.user.email}</span>
            <SignOutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
    </div>
  );
}
