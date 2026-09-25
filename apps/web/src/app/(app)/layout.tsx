import { isAdmin, listProjectNav } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { AppShell } from "./app-shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();
  const projects = await listProjectNav(session);

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email }}
      isAdmin={isAdmin(session)}
      projects={projects}
    >
      {children}
    </AppShell>
  );
}
