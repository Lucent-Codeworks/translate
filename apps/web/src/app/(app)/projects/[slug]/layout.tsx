import Link from "next/link";
import { notFound } from "next/navigation";
import { Eyebrow } from "@/components/ui";
import { getProject } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { SectionCrumb } from "./section-crumb";

export default async function ProjectLayout({
  children,
  params,
}: LayoutProps<"/projects/[slug]">) {
  const { slug } = await params;
  const session = await requireSession();
  const project = await getProject(session, slug);
  if (!project) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 border-b border-border pb-6">
        <Eyebrow>
          <Link href="/projects" className="hover:underline">
            Projects
          </Link>{" "}
          / {project.slug}
          <SectionCrumb />
        </Eyebrow>
        <h1 className="text-3xl font-semibold">{project.name}</h1>
        {project.description && <p className="text-muted">{project.description}</p>}
      </div>
      {children}
    </div>
  );
}
