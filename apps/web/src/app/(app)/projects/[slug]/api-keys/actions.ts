"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { projectApiKey } from "@/db/schema";
import { generateApiKey } from "@/lib/api-keys";
import { canManage, getProject } from "@/lib/projects";
import { requireSession } from "@/lib/session";

async function authorizeOwner(slug: string) {
  const session = await requireSession();
  const project = await getProject(session, slug);
  if (!project || !canManage(project.role)) throw new Error("Not allowed");
  return { session, project };
}

export type CreateKeyState = { error?: string; secret?: string };

export async function createApiKey(
  slug: string,
  _prev: CreateKeyState,
  formData: FormData,
): Promise<CreateKeyState> {
  const { session, project } = await authorizeOwner(slug);
  const name = z.string().trim().min(1, "Name is required").max(100).safeParse(formData.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };

  const { secret, hash, prefix } = generateApiKey();
  await db.insert(projectApiKey).values({
    projectId: project.id,
    name: name.data,
    prefix,
    hash,
    createdById: session.user.id,
  });
  refresh();
  return { secret };
}

export async function revokeApiKey(slug: string, keyId: string) {
  const { project } = await authorizeOwner(slug);
  if (!z.uuid().safeParse(keyId).success) return;
  await db
    .update(projectApiKey)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(projectApiKey.id, keyId),
        eq(projectApiKey.projectId, project.id),
        isNull(projectApiKey.revokedAt),
      ),
    );
  refresh();
}
