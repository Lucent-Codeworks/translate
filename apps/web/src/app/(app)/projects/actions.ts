"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { project, projectLocale, projectMember } from "@/db/schema";
import { requireSession } from "@/lib/session";

const localeCode = z
  .string()
  .trim()
  .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/, "Use a BCP 47 code like en or pt-BR");

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only")
    .max(64),
  description: z.string().trim().max(500).optional(),
  baseLocale: localeCode,
});

export type CreateProjectState = {
  errors?: Partial<Record<keyof z.infer<typeof createProjectSchema> | "form", string>>;
  values?: Record<string, string>;
};

export async function createProject(
  _prev: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const session = await requireSession();
  const values = Object.fromEntries(
    ["name", "slug", "description", "baseLocale"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const parsed = createProjectSchema.safeParse({
    ...values,
    description: values.description || undefined,
  });
  if (!parsed.success) {
    const errors: CreateProjectState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<CreateProjectState["errors"]>;
      errors[key] ??= issue.message;
    }
    return { errors, values };
  }

  const data = parsed.data;
  try {
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(project)
        .values({ ...data, createdById: session.user.id })
        .returning({ id: project.id });
      await tx
        .insert(projectMember)
        .values({ projectId: created.id, userId: session.user.id, role: "owner" });
      await tx.insert(projectLocale).values({ projectId: created.id, code: data.baseLocale });
    });
  } catch (err) {
    // 23505 = unique_violation (slug taken)
    if ((err as { cause?: { code?: string } }).cause?.code === "23505") {
      return { errors: { slug: "This slug is already taken" }, values };
    }
    throw err;
  }

  redirect(`/projects/${data.slug}`);
}
