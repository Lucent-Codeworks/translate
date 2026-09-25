import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, cx, EmptyState, ProgressBar } from "@/components/ui";
import { localeName } from "@/lib/locales";
import {
  canEdit,
  canManage,
  getLocaleProgress,
  getProject,
  getTranslationRows,
} from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { AddKeyForm } from "./add-key-form";
import { AddLocaleForm } from "./add-locale-form";
import { KeyCell } from "./key-cell";
import { RemoveLocaleButton } from "./remove-locale-button";
import { TranslationCell } from "./translation-cell";

export default async function ProjectPage({
  params,
  searchParams,
}: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const { locale: requested } = await searchParams;
  const session = await requireSession();
  const project = await getProject(session, slug);
  if (!project) notFound();

  const { baseLocale, locales } = project;
  const targetLocales = locales.filter((l) => l !== baseLocale);
  // Default to the first language that needs translating.
  const active =
    typeof requested === "string" && locales.includes(requested)
      ? requested
      : (targetLocales[0] ?? baseLocale);
  const columns = active === baseLocale ? [baseLocale] : [baseLocale, active];

  const [progress, rows] = await Promise.all([
    getLocaleProgress(project.id),
    getTranslationRows(project.id, columns),
  ]);
  const editable = canEdit(project.role);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <nav className="flex flex-wrap gap-2" aria-label="Languages">
          {[baseLocale, ...targetLocales].map((code) => {
            const done = progress.translated[code] ?? 0;
            const pct = progress.totalKeys ? Math.round((done / progress.totalKeys) * 100) : 100;
            return (
              <Link
                key={code}
                href={`/projects/${slug}?locale=${encodeURIComponent(code)}`}
                aria-current={code === active ? "page" : undefined}
                className={cx(
                  "flex min-w-36 flex-col gap-2 rounded-md border px-3 py-2 text-sm transition duration-200 ease-brand",
                  code === active
                    ? "border-accent bg-surface shadow-[0_0_0_3px_var(--accent-dim)]"
                    : "border-border bg-elevated text-muted hover:border-border-strong hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">{localeName(code)}</span>
                  <span className="ml-auto font-mono text-xs text-subtle">{code}</span>
                </span>
                {code === baseLocale ? (
                  <Badge tone="accent" className="self-start">Base</Badge>
                ) : (
                  <span className="flex items-center gap-2">
                    <ProgressBar value={pct} className="flex-1" />
                    <span className="font-mono text-xs text-subtle">{pct}%</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        {canManage(project.role) && (
          <div className="flex flex-wrap items-start gap-2">
            <AddLocaleForm slug={slug} />
            {active !== baseLocale && (
              <RemoveLocaleButton slug={slug} code={active} name={localeName(active)} />
            )}
          </div>
        )}
      </section>

      {editable && <AddKeyForm slug={slug} baseLocale={baseLocale} />}

      {rows.length === 0 ? (
        <EmptyState title="No keys yet">
          {editable
            ? "Add your first key above, or import a JSON file from the Import / Export tab."
            : "Ask an editor to add some."}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-elevated">
          <table className="w-full min-w-[40rem] table-fixed text-sm">
            <thead className="border-b border-border bg-surface-2/60 text-left text-xs uppercase tracking-wider text-subtle">
              <tr>
                <th className="w-1/4 px-3 py-2 font-medium">Key</th>
                {columns.map((code) => (
                  <th key={code} className="px-3 py-2 font-medium">
                    {localeName(code)} <span className="font-mono normal-case">{code}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border align-top transition-colors last:border-0 hover:bg-surface/60">
                  <td className="px-3 py-2">
                    <KeyCell
                      slug={slug}
                      keyId={row.id}
                      name={row.key}
                      description={row.description}
                      editable={editable}
                    />
                  </td>
                  {columns.map((code) => (
                    <td key={code} className="px-1 py-1">
                      <TranslationCell
                        // Remount when switching languages so the textarea shows fresh data.
                        key={`${row.id}:${code}`}
                        slug={slug}
                        keyId={row.id}
                        locale={code}
                        initialValue={row.values[code] ?? ""}
                        readOnly={!editable}
                        label={`${row.key} in ${localeName(code)}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
