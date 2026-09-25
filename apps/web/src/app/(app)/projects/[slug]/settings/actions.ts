"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { project, projectSlugAlias } from "@/db/schema";
import { canManage, getProject, isSlugReserved } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { projectDescription, projectName, projectSlug } from "@/lib/validation";

const schema = z.object({ name: projectName, slug: projectSlug, description: projectDescription });

export type SettingsState = {
  errors?: Partial<Record<"name" | "slug" | "description", string>>;
  saved?: boolean;
};

export async function updateProject(slug: string, _prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const session = await requireSession();
  const current = await getProject(session, slug);
  if (!current || !canManage(current.role)) throw new Error("Not allowed");

  const parsed = schema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    const errors: SettingsState["errors"] = {};
    for (const issue of parsed.error.issues) {
      errors[issue.path[0] as keyof NonNullable<SettingsState["errors"]>] ??= issue.message;
    }
    return { errors };
  }
  const { name, slug: newSlug, description } = parsed.data;
  const slugChanged = newSlug !== current.slug;

  if (slugChanged && (await isSlugReserved(newSlug, current.id))) {
    return { errors: { slug: "Another project used this slug before, so it's reserved" } };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(project)
        .set({ name, slug: newSlug, description: description || null })
        .where(eq(project.id, current.id));
      if (slugChanged) {
        // Keep the old slug resolving to this project, and reclaim the new one
        // if it was one of this project's own old slugs.
        await tx
          .delete(projectSlugAlias)
          .where(and(eq(projectSlugAlias.slug, newSlug), eq(projectSlugAlias.projectId, current.id)));
        await tx.insert(projectSlugAlias).values({ slug: current.slug, projectId: current.id });
      }
    });
  } catch (err) {
    // 23505 = unique_violation: another project has this slug right now.
    if ((err as { cause?: { code?: string } }).cause?.code === "23505") {
      return { errors: { slug: "This slug is already taken" } };
    }
    throw err;
  }

  if (slugChanged) redirect(`/projects/${newSlug}/settings?saved=1`);
  refresh(); // the name shows in the header and sidebar
  return { saved: true };
}
