import Link from "next/link";
import { isAdmin } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <nav className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 text-sm">
          <Link href="/projects" className="font-semibold">
            Translate
          </Link>
          <Link href="/projects" className="text-muted hover:text-foreground">
            Projects
          </Link>
          {isAdmin(session) && (
            <Link href="/admin/users" className="text-muted hover:text-foreground">
              Users
            </Link>
          )}
          <div className="ml-auto flex items-center gap-4">
            <span className="text-muted">{session.user.email}</span>
            <SignOutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
