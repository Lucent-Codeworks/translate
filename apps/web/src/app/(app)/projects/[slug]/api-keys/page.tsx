import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Badge, EmptyState } from "@/components/ui";
import { db } from "@/db";
import { projectApiKey } from "@/db/schema";
import { canManage, getProject } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { CreateKeyForm } from "./create-key-form";
import { RevokeKeyButton } from "./revoke-key-button";

const formatDate = (d: Date | null) =>
  d ? d.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" }) : "Never";

export default async function ApiKeysPage({ params }: PageProps<"/projects/[slug]/api-keys">) {
  const { slug } = await params;
  const session = await requireSession();
  const project = await getProject(session, slug);
  if (!project || !canManage(project.role)) notFound();

  const keys = await db
    .select()
    .from(projectApiKey)
    .where(eq(projectApiKey.projectId, project.id))
    .orderBy(desc(projectApiKey.createdAt));

  // Public URL of this instance, for the SDK snippet.
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-muted">
        API keys let the SDK fetch this project&apos;s translations. They are read-only and safe
        to ship in client-side code.
      </p>

      <CreateKeyForm slug={slug} origin={origin} baseLocale={project.baseLocale} />

      {keys.length === 0 ? (
        <EmptyState title="No API keys yet">Create one to let the SDK fetch this project&apos;s translations.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-elevated">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="border-b border-border bg-surface-2/60 text-left text-xs uppercase tracking-wider text-subtle">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Key</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium">Last used</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr
                  key={k.id}
                  className={"border-b border-border last:border-0 " + (k.revokedAt ? "text-muted" : "")}
                >
                  <td className="px-4 py-2">{k.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-accent">{k.prefix}…</td>
                  <td className="px-4 py-2">{formatDate(k.createdAt)}</td>
                  <td className="px-4 py-2">{formatDate(k.lastUsedAt)}</td>
                  <td className="px-4 py-2 text-right">
                    {k.revokedAt ? (
                      <Badge>Revoked</Badge>
                    ) : (
                      <RevokeKeyButton slug={slug} keyId={k.id} name={k.name} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
