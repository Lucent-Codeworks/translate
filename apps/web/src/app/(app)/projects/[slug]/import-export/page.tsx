import { notFound } from "next/navigation";
import { Button, Card, Eyebrow, Select } from "@/components/ui";
import { localeName } from "@/lib/locales";
import { canEdit, getProject } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { ImportForm } from "./import-form";

export default async function ImportExportPage({
  params,
}: PageProps<"/projects/[slug]/import-export">) {
  const { slug } = await params;
  const session = await requireSession();
  const project = await getProject(session, slug);
  if (!project) notFound();

  const locales = project.locales.map((code) => ({ code, name: localeName(code) }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="flex flex-col gap-4">
        <div>
          <Eyebrow>Export</Eyebrow>
          <h2 className="mt-2 text-lg font-semibold">Download translations</h2>
          <p className="mt-1 text-sm text-muted">Download one language as a JSON file.</p>
        </div>
        <form action={`/projects/${slug}/export`} method="get" className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Language</span>
            <Select name="locale" defaultValue={project.baseLocale}>
              {locales.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.code})
                </option>
              ))}
            </Select>
          </label>
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1.5 font-medium">Format</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="format" value="flat" defaultChecked className="accent-accent" />
              Flat <code className="text-xs text-muted">{`{ "home.title": "…" }`}</code>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="format" value="nested" className="accent-accent" />
              Nested <code className="text-xs text-muted">{`{ "home": { "title": "…" } }`}</code>
            </label>
          </fieldset>
          <div>
            <Button type="submit">Download JSON</Button>
          </div>
        </form>
      </Card>

      {canEdit(project.role) && (
        <Card className="flex flex-col gap-4">
          <div>
            <Eyebrow>Import</Eyebrow>
            <h2 className="mt-2 text-lg font-semibold">Upload translations</h2>
            <p className="mt-1 text-sm text-muted">
              Upload a flat or nested JSON file of translations for one language.
            </p>
          </div>
          <ImportForm slug={slug} locales={locales} baseLocale={project.baseLocale} />
        </Card>
      )}
    </div>
  );
}
