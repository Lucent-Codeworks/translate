import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { getProject } from "@/lib/projects";
import { requireSession } from "@/lib/session";

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const session = await requireSession();
  const project = await getProject(session, slug);
  if (!project) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        {project.description && <p className="mt-1 text-muted">{project.description}</p>}
      </div>
      <Card>
        <h2 className="font-medium">Locales</h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {project.locales.map((code) => (
            <li key={code} className="rounded-md border border-border px-2 py-1 font-mono">
              {code}
              {code === project.baseLocale && <span className="ml-1 text-muted">(base)</span>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
