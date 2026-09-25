"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { translation, translationKey } from "@/db/schema";
import { flattenMessages, type Skipped } from "@/lib/json-format";
import { canEdit, getProject } from "@/lib/projects";
import { requireSession } from "@/lib/session";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
// Stay well below Postgres' 65k bind-parameter limit per statement.
const CHUNK = 1000;

const chunks = <T,>(items: T[]) =>
  Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, i) =>
    items.slice(i * CHUNK, (i + 1) * CHUNK),
  );

export type ImportResult = {
  createdKeys: number;
  added: number;
  updated: number;
  unchanged: number;
  skipped: Skipped[];
};
export type ImportState = { error?: string; result?: ImportResult };

export async function importTranslations(
  slug: string,
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const session = await requireSession();
  const project = await getProject(session, slug);
  if (!project || !canEdit(project.role)) throw new Error("Not allowed");

  const locale = String(formData.get("locale"));
  if (!project.locales.includes(locale)) return { error: "Choose a language from this project" };
  const createKeys = formData.get("createKeys") === "on";
  const overwrite = formData.get("overwrite") === "on";

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a JSON file" };
  if (file.size > MAX_FILE_BYTES) return { error: "The file is larger than 5 MB" };

  let parsed;
  try {
    parsed = flattenMessages(JSON.parse(await file.text()));
  } catch (err) {
    return { error: err instanceof SyntaxError ? "The file isn't valid JSON" : (err as Error).message };
  }
  const { messages, skipped } = parsed;
  if (messages.size === 0) return { result: { createdKeys: 0, added: 0, updated: 0, unchanged: 0, skipped } };

  const result = await db.transaction(async (tx) => {
    const keyIds = new Map(
      (
        await tx
          .select({ id: translationKey.id, key: translationKey.key })
          .from(translationKey)
          .where(eq(translationKey.projectId, project.id))
      ).map((k) => [k.key, k.id]),
    );

    const missing = [...messages.keys()].filter((k) => !keyIds.has(k));
    let createdKeys = 0;
    if (createKeys) {
      for (const batch of chunks(missing)) {
        const created = await tx
          .insert(translationKey)
          .values(batch.map((key) => ({ projectId: project.id, key })))
          .returning({ id: translationKey.id, key: translationKey.key });
        for (const k of created) keyIds.set(k.key, k.id);
        createdKeys += created.length;
      }
    } else {
      for (const key of missing) skipped.push({ key, reason: "key doesn't exist in the project" });
    }

    const current = new Map(
      (
        await tx
          .select({ keyId: translation.keyId, value: translation.value })
          .from(translation)
          .innerJoin(translationKey, eq(translationKey.id, translation.keyId))
          .where(and(eq(translationKey.projectId, project.id), eq(translation.locale, locale)))
      ).map((t) => [t.keyId, t.value]),
    );

    let added = 0, updated = 0, unchanged = 0;
    const writes: { keyId: string; value: string }[] = [];
    for (const [key, value] of messages) {
      const keyId = keyIds.get(key);
      if (!keyId) continue;
      const existing = current.get(keyId);
      if (existing === undefined) {
        added++;
        writes.push({ keyId, value });
      } else if (existing !== value && overwrite) {
        updated++;
        writes.push({ keyId, value });
      } else {
        unchanged++;
      }
    }

    for (const batch of chunks(writes)) {
      await tx
        .insert(translation)
        .values(batch.map((w) => ({ ...w, locale, updatedById: session.user.id })))
        .onConflictDoUpdate({
          target: [translation.keyId, translation.locale],
          set: {
            value: sql`excluded.value`,
            updatedById: session.user.id,
            updatedAt: new Date(),
          },
        });
    }

    return { createdKeys, added, updated, unchanged, skipped };
  });

  refresh();
  return { result };
}
