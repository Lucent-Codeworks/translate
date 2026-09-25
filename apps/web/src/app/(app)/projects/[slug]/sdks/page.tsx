import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { cx } from "@/components/ui";
import { db } from "@/db";
import { translation, translationKey } from "@/db/schema";
import { requestOrigin } from "@/lib/origin";
import { extractPlaceholders } from "@/lib/placeholders";
import { canManage, getProject } from "@/lib/projects";
import { REDACTED_KEY, sdkGuides } from "@/lib/sdk-guides";
import { requireSession } from "@/lib/session";

export default async function SdksPage({ params, searchParams }: PageProps<"/projects/[slug]/sdks">) {
  const { slug } = await params;
  const { sdk } = await searchParams;
  const session = await requireSession();
  const project = await getProject(session, slug);
  if (!project) notFound();

  // Real keys from the project make the examples copy-pasteable.
  const samples = await db
    .select({ key: translationKey.key, value: translation.value })
    .from(translationKey)
    .leftJoin(
      translation,
      and(eq(translation.keyId, translationKey.id), eq(translation.locale, project.baseLocale)),
    )
    .where(eq(translationKey.projectId, project.id))
    .orderBy(asc(translationKey.key))
    .limit(200);
  const plain = samples.find((s) => !s.value || extractPlaceholders(s.value).length === 0);
  const withParams = samples.find((s) => s.value && extractPlaceholders(s.value).length > 0);

  const guides = sdkGuides({
    origin: await requestOrigin(),
    project: project.slug,
    baseLocale: project.baseLocale,
    exampleLocale: project.locales.find((l) => l !== project.baseLocale) ?? project.baseLocale,
    sampleKey: plain?.key ?? samples[0]?.key ?? "home.title",
    paramSample: withParams
      ? { key: withParams.key, params: extractPlaceholders(withParams.value!) }
      : undefined,
  });
  const active = guides.find((g) => g.id === sdk) ?? guides[0];

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-muted">
        Connect an app to this project. Replace <code className="font-mono text-accent">{REDACTED_KEY}</code>{" "}
        with an API key:{" "}
        {canManage(project.role) ? (
          <Link href={`/projects/${slug}/api-keys`} className="text-accent hover:underline">
            create one on the API keys tab
          </Link>
        ) : (
          "ask a project owner for one"
        )}
        . Keys are read-only and safe to ship in client-side code.
      </p>

      <div className="flex flex-col gap-6 md:flex-row">
        <nav aria-label="SDKs" className="flex shrink-0 gap-1 overflow-x-auto md:w-52 md:flex-col">
          {guides.map((guide) => (
            <Link
              key={guide.id}
              href={`/projects/${slug}/sdks?sdk=${guide.id}`}
              aria-current={guide.id === active.id ? "page" : undefined}
              scroll={false}
              className={cx(
                "flex shrink-0 flex-col rounded-md px-3 py-2 text-sm transition-colors duration-200",
                guide.id === active.id
                  ? "bg-accent-dim text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <span className="font-medium">{guide.label}</span>
              <span className="hidden truncate font-mono text-[0.7rem] opacity-80 md:block">{guide.pkg}</span>
            </Link>
          ))}
        </nav>

        <section className="flex min-w-0 flex-1 flex-col gap-4" aria-labelledby="sdk-heading">
          <div>
            <h2 id="sdk-heading" className="text-lg font-semibold">
              {active.label}
            </h2>
            <p className="mt-1 text-sm text-muted">{active.intro}</p>
          </div>
          {active.blocks.map((block, i) => (
            <div key={block.title} className="overflow-hidden rounded-lg border border-border bg-elevated">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-2/60 px-4 py-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="grid size-5 place-items-center rounded-full bg-accent-dim font-mono text-[0.7rem] text-accent">
                    {i + 1}
                  </span>
                  {block.title}
                </span>
                <CopyButton text={block.code} className="h-7 px-3 text-xs" />
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[0.8rem] leading-relaxed">
                <code>{block.code}</code>
              </pre>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
