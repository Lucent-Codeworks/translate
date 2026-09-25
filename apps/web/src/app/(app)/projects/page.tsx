import Link from "next/link";
import { Badge, EmptyState, Eyebrow, LinkButton, ProgressBar } from "@/components/ui";
import { listProjects } from "@/lib/projects";
import { requireSession } from "@/lib/session";

export default async function ProjectsPage() {
  const session = await requireSession();
  const projects = await listProjects(session);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Eyebrow>Workspace</Eyebrow>
          <h1 className="text-3xl font-semibold">Projects</h1>
        </div>
        <LinkButton href="/projects/new">New project</LinkButton>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          action={<LinkButton href="/projects/new">Create your first project</LinkButton>}
        >
          A project holds the keys and translations for one app or site.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const targets = p.locales.length - 1;
            const possible = p.keyCount * targets;
            const pct = possible ? (p.targetTranslatedCount / possible) * 100 : 0;
            return (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.slug}`}
                  className="group flex h-full flex-col gap-4 rounded-lg border border-border bg-elevated p-6 transition duration-200 ease-brand hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-dim font-mono text-sm font-semibold text-accent">
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold tracking-tight group-hover:text-accent">{p.name}</div>
                      <div className="truncate font-mono text-xs text-subtle">{p.slug}</div>
                    </div>
                    <svg
                      className="mt-1 text-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
                      width="16"
                      height="16"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {p.description && <p className="text-sm text-muted">{p.description}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {p.locales.map((code) => (
                      <Badge key={code} tone={code === p.baseLocale ? "accent" : "neutral"}>
                        {code}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-auto flex flex-col gap-2">
                    <div className="flex justify-between text-xs text-subtle">
                      <span>
                        {p.keyCount} {p.keyCount === 1 ? "key" : "keys"}
                      </span>
                      <span>{targets > 0 ? `${Math.round(pct)}% translated` : "No target languages"}</span>
                    </div>
                    <ProgressBar value={targets > 0 ? pct : 0} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
