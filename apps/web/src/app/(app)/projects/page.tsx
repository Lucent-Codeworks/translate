import Link from "next/link";
import { Card } from "@/components/ui";
import { listProjects } from "@/lib/projects";
import { requireSession } from "@/lib/session";

export default async function ProjectsPage() {
  const session = await requireSession();
  const projects = await listProjects(session);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Link
          href="/projects/new"
          className="inline-flex h-9 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
        >
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card className="text-center text-sm text-muted">
          No projects yet. Create one to start adding translations.
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.slug}`} className="block">
                <Card className="hover:bg-surface">
                  <div className="font-medium">{p.name}</div>
                  <div className="mt-1 text-sm text-muted">
                    {p.slug} · base {p.baseLocale}
                  </div>
                  {p.description && <p className="mt-2 text-sm">{p.description}</p>}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
