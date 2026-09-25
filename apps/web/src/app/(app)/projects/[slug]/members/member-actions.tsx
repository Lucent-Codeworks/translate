"use client";

import { useState, useTransition } from "react";
import { Select } from "@/components/ui";
import type { ProjectRole } from "@/lib/projects";
import { removeMember, updateMemberRole } from "./actions";

const roleLabels: Record<ProjectRole, string> = { owner: "Owner", editor: "Editor", viewer: "Viewer" };

export function MemberActions({
  slug,
  userId,
  name,
  role,
  canManage,
  isSelf,
}: {
  slug: string;
  userId: string;
  name: string;
  role: ProjectRole;
  canManage: boolean;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      setError(undefined);
      const result = await fn();
      if (result?.error) setError(result.error);
    });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        {canManage ? (
          <Select
            // Re-key on role so a rejected change snaps back to the saved role.
            key={role}
            defaultValue={role}
            disabled={pending}
            aria-label={`Role for ${name}`}
            className="h-8 px-2"
            onChange={(e) => {
              const next = e.target.value as ProjectRole;
              const select = e.target;
              run(async () => {
                const result = await updateMemberRole(slug, userId, next);
                if (result.error) select.value = role;
                return result;
              });
            }}
          >
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        ) : (
          <span>{roleLabels[role]}</span>
        )}
        {(canManage || isSelf) && (
          <button
            className="ml-auto text-danger hover:underline disabled:opacity-50"
            disabled={pending}
            onClick={() => {
              const message = isSelf
                ? "Leave this project? You'll lose access unless someone adds you back."
                : `Remove ${name} from this project?`;
              if (confirm(message)) run(() => removeMember(slug, userId));
            }}
          >
            {isSelf ? "Leave" : "Remove"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
