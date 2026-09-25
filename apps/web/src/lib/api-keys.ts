import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { project, projectApiKey } from "@/db/schema";

const KEY_PREFIX = "lt_";

const hashKey = (secret: string) => createHash("sha256").update(secret).digest("hex");

/** Generates a new secret. Only its hash is stored; the secret is shown to the user once. */
export function generateApiKey() {
  const secret = KEY_PREFIX + randomBytes(24).toString("base64url");
  return { secret, hash: hashKey(secret), prefix: secret.slice(0, KEY_PREFIX.length + 6) };
}

/**
 * Resolves a bearer token to its project, or null if the key is unknown,
 * revoked, or belongs to a different project.
 */
export async function verifyApiKey(secret: string, slug: string) {
  if (!secret.startsWith(KEY_PREFIX)) return null;

  const [row] = await db
    .select({ keyId: projectApiKey.id, project })
    .from(projectApiKey)
    .innerJoin(project, eq(project.id, projectApiKey.projectId))
    .where(
      and(
        eq(projectApiKey.hash, hashKey(secret)),
        eq(project.slug, slug),
        isNull(projectApiKey.revokedAt),
      ),
    );
  if (!row) return null;

  // Record usage, at most once a minute per key to avoid a write on every poll.
  const now = new Date();
  await db
    .update(projectApiKey)
    .set({ lastUsedAt: now })
    .where(
      and(
        eq(projectApiKey.id, row.keyId),
        or(
          isNull(projectApiKey.lastUsedAt),
          lt(projectApiKey.lastUsedAt, new Date(now.getTime() - 60_000)),
        ),
      ),
    );

  return row.project;
}
