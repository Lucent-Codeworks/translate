import { notFound } from "next/navigation";
import { canManage, getProject } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { ProjectTabs } from "./project-tabs";

export default async function ProjectLayout({
  children,
  params,
}: LayoutProps<"/projects/[slug]">) {
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
      <ProjectTabs slug={slug} showSettings={canManage(project.role)} />
      {children}
    </div>
  );
}
