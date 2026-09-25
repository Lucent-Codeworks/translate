"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button, ErrorText, Input } from "@/components/ui";
import { deleteKey, updateKey } from "./actions";

type Props = {
  slug: string;
  keyId: string;
  name: string;
  description: string | null;
  editable: boolean;
};

export function KeyCell({ slug, keyId, name, description, editable }: Props) {
  const [editing, setEditing] = useState(false);
  const [deleting, startDelete] = useTransition();

  if (editing) {
    return (
      <EditKeyForm
        slug={slug}
        keyId={keyId}
        name={name}
        description={description}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={"group flex flex-col gap-1 " + (deleting ? "opacity-50" : "")}>
      <div className="break-all font-mono text-xs font-medium">{name}</div>
      {description && <div className="text-xs text-subtle">{description}</div>}
      {editable && (
        <div className="flex gap-3 text-xs text-muted group-focus-within:opacity-100 group-hover:opacity-100 sm:opacity-0">
          <button className="hover:text-accent" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button
            className="hover:text-danger"
            disabled={deleting}
            onClick={() => {
              if (!confirm(`Delete "${name}" and all of its translations?`)) return;
              startDelete(() => deleteKey(slug, keyId));
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

function EditKeyForm({
  slug,
  keyId,
  name,
  description,
  onDone,
}: Omit<Props, "editable"> & { onDone: () => void }) {
  const [state, action, pending] = useActionState(updateKey.bind(null, slug), {});

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form
      action={action}
      className="flex flex-col gap-2"
      onKeyDown={(e) => e.key === "Escape" && onDone()}
    >
      <input type="hidden" name="keyId" value={keyId} />
      <Input name="key" defaultValue={name} required autoFocus aria-label="Key" className="font-mono text-xs" />
      <Input
        name="description"
        defaultValue={description ?? ""}
        placeholder="Context for translators"
        aria-label="Description"
        className="text-xs"
      />
      <ErrorText>{state.error}</ErrorText>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="h-7 px-3 text-xs">
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone} className="h-7 px-3 text-xs">
          Cancel
        </Button>
      </div>
    </form>
  );
}
