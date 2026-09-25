import { notFound } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { localeName } from "@/lib/locales";
import { canEdit, getProject } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { ImportForm } from "./import-form";

const selectClass = "h-9 rounded-md border border-border bg-background px-3 text-sm";

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
          <h2 className="font-medium">Export</h2>
          <p className="mt-1 text-sm text-muted">Download one language as a JSON file.</p>
        </div>
        <form action={`/projects/${slug}/export`} method="get" className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Language</span>
            <select name="locale" defaultValue={project.baseLocale} className={selectClass}>
              {locales.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </label>
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1.5 font-medium">Format</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="format" value="flat" defaultChecked />
              Flat <code className="text-xs text-muted">{`{ "home.title": "…" }`}</code>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="format" value="nested" />
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
            <h2 className="font-medium">Import</h2>
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
