"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, ErrorText, Field, Input } from "@/components/ui";
import { updateProject } from "./actions";

export function SettingsForm({
  project,
  justRenamed,
}: {
  project: { slug: string; name: string; description: string | null };
  justRenamed: boolean;
}) {
  const [state, action, pending] = useActionState(updateProject.bind(null, project.slug), {
    saved: justRenamed,
  });
  const [slug, setSlug] = useState(project.slug);

  // Drop ?saved=1 (set by the redirect after a rename) so a reload doesn't re-announce it.
  useEffect(() => {
    if (justRenamed) window.history.replaceState(null, "", window.location.pathname);
  }, [justRenamed]);
  const slugChanging = slug.trim().toLowerCase() !== project.slug;

  return (
    <form action={action} className="flex max-w-xl flex-col gap-5">
      <Field label="Name">
        <Input name="name" defaultValue={project.name} required maxLength={100} />
        <ErrorText>{state.errors?.name}</ErrorText>
      </Field>

      <Field label="Slug" hint="Used in URLs and by the SDKs to identify this project.">
        <Input
          name="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          maxLength={64}
          className="font-mono"
        />
        <ErrorText>{state.errors?.slug}</ErrorText>
      </Field>
      {slugChanging && (
        <p className="-mt-3 rounded-md border border-warning-border bg-warning/5 px-3 py-2 text-sm text-foreground">
          Apps configured with <code className="font-mono">{project.slug}</code> keep working: the old
          slug stays reserved for this project. Update their SDK config to{" "}
          <code className="font-mono">{slug.trim().toLowerCase() || "…"}</code> when convenient.
        </p>
      )}

      <Field label="Description">
        <textarea
          name="description"
          defaultValue={project.description ?? ""}
          maxLength={500}
          rows={3}
          className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm outline-none transition duration-200 ease-brand placeholder:text-subtle hover:border-accent/60 focus:border-accent focus:ring-3 focus:ring-accent-dim"
        />
        <ErrorText>{state.errors?.description}</ErrorText>
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {state.saved && !pending && (
          <span role="status" className="text-sm text-accent">
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
