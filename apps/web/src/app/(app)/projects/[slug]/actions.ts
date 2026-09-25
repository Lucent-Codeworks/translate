"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { projectLocale, translation, translationKey } from "@/db/schema";
import { canEdit, canManage, getProject, type ProjectRole } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { localeCode, translationKeyName } from "@/lib/validation";

export type FormState = { error?: string; ok?: boolean };

/** Loads the project and ensures the current user's role passes `allowed`. */
async function authorize(slug: string, allowed: (role: ProjectRole) => boolean) {
  const session = await requireSession();
  const project = await getProject(session, slug);
  if (!project || !allowed(project.role)) throw new Error("Not allowed");
  return { session, project };
}

const isUniqueViolation = (err: unknown) =>
  (err as { cause?: { code?: string } }).cause?.code === "23505";

export async function addLocale(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { project } = await authorize(slug, canManage);
  const parsed = localeCode.safeParse(formData.get("code"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await db.insert(projectLocale).values({ projectId: project.id, code: parsed.data });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: `${parsed.data} is already added` };
    throw err;
  }
  refresh();
  return { ok: true };
}

export async function removeLocale(slug: string, code: string) {
  const { project } = await authorize(slug, canManage);
  if (code === project.baseLocale) throw new Error("The base language can't be removed");

  await db.transaction(async (tx) => {
    const projectKeys = tx
      .select({ id: translationKey.id })
      .from(translationKey)
      .where(eq(translationKey.projectId, project.id));
    await tx
      .delete(translation)
      .where(and(eq(translation.locale, code), inArray(translation.keyId, projectKeys)));
    await tx
      .delete(projectLocale)
      .where(and(eq(projectLocale.projectId, project.id), eq(projectLocale.code, code)));
  });
  refresh();
}

const addKeySchema = z.object({
  key: translationKeyName,
  description: z.string().trim().max(500).optional(),
  baseValue: z.string().max(10_000).optional(),
});

export async function addKey(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { session, project } = await authorize(slug, canEdit);
  const parsed = addKeySchema.safeParse({
    key: formData.get("key"),
    description: formData.get("description") || undefined,
    baseValue: formData.get("baseValue") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { key, description, baseValue } = parsed.data;

  try {
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(translationKey)
        .values({ projectId: project.id, key, description })
        .returning({ id: translationKey.id });
      if (baseValue) {
        await tx.insert(translation).values({
          keyId: created.id,
          locale: project.baseLocale,
          value: baseValue,
          updatedById: session.user.id,
        });
      }
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: `The key "${key}" already exists` };
    throw err;
  }
  refresh();
  return { ok: true };
}

const updateKeySchema = z.object({
  keyId: z.uuid(),
  key: translationKeyName,
  description: z.string().trim().max(500),
});

/** Renames a key and/or changes its description. Translations are kept. */
export async function updateKey(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { project } = await authorize(slug, canEdit);
  const parsed = updateKeySchema.safeParse({
    keyId: formData.get("keyId"),
    key: formData.get("key"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { keyId, key, description } = parsed.data;

  try {
    const updated = await db
      .update(translationKey)
      .set({ key, description: description || null })
      .where(and(eq(translationKey.id, keyId), eq(translationKey.projectId, project.id)))
      .returning({ id: translationKey.id });
    if (updated.length === 0) return { error: "Key not found" };
  } catch (err) {
    if (isUniqueViolation(err)) return { error: `The key "${key}" already exists` };
    throw err;
  }
  refresh();
  return { ok: true };
}

/** Deletes a key along with all of its translations. */
export async function deleteKey(slug: string, keyId: string) {
  const { project } = await authorize(slug, canEdit);
  if (!z.uuid().safeParse(keyId).success) return;
  await db
    .delete(translationKey)
    .where(and(eq(translationKey.id, keyId), eq(translationKey.projectId, project.id)));
  refresh();
}

/** Sets a key's value in one locale. An empty value removes the translation. */
export async function saveTranslation(
  slug: string,
  keyId: string,
  locale: string,
  value: string,
): Promise<FormState> {
  const { session, project } = await authorize(slug, canEdit);
  if (!z.uuid().safeParse(keyId).success) return { error: "Key not found" };
  if (!project.locales.includes(locale)) return { error: "Unknown language" };
  if (value.length > 10_000) return { error: "Translation is too long" };

  const [key] = await db
    .select({ id: translationKey.id })
    .from(translationKey)
    .where(and(eq(translationKey.id, keyId), eq(translationKey.projectId, project.id)));
  if (!key) return { error: "Key not found" };

  if (value === "") {
    await db
      .delete(translation)
      .where(and(eq(translation.keyId, keyId), eq(translation.locale, locale)));
  } else {
    await db
      .insert(translation)
      .values({ keyId, locale, value, updatedById: session.user.id })
      .onConflictDoUpdate({
        target: [translation.keyId, translation.locale],
        set: { value, updatedById: session.user.id, updatedAt: new Date() },
      });
  }
  refresh();
  return { ok: true };
}
