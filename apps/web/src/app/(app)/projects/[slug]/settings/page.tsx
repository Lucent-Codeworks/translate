import { notFound } from "next/navigation";
import { Card, Eyebrow } from "@/components/ui";
import { canManage, getProject, listSlugAliases } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage({ params, searchParams }: PageProps<"/projects/[slug]/settings">) {
  const { slug } = await params;
  const { saved } = await searchParams;
  const session = await requireSession();
  const project = await getProject(session, slug);
  if (!project || !canManage(project.role)) notFound();
  const aliases = await listSlugAliases(project.id);

  return (
    <div className="flex flex-col gap-8">
      <Card className="flex flex-col gap-6">
        <div>
          <Eyebrow>General</Eyebrow>
          <h2 className="mt-2 text-lg font-semibold">Project details</h2>
        </div>
        {/* Keyed on the slug so the form resets to fresh values after a rename. */}
        <SettingsForm key={project.slug} project={project} justRenamed={saved === "1"} />
      </Card>

      {aliases.length > 0 && (
        <Card className="flex flex-col gap-3">
          <div>
            <Eyebrow>Previous slugs</Eyebrow>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              These still work for the API and old links, and stay reserved for this project. Apps
              using them keep receiving translations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {aliases.map((alias) => (
              <code
                key={alias}
                className="rounded-full border border-border-strong px-2.5 py-0.5 font-mono text-xs text-muted"
              >
                {alias}
              </code>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
