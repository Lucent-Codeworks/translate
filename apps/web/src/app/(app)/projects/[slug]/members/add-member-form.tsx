"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, ErrorText, Input } from "@/components/ui";
import { addMember } from "./actions";

export function AddMemberForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(addMember.bind(null, slug), {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-1">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="email"
          type="email"
          placeholder="Email of an existing account"
          required
          aria-label="Email"
          className="sm:max-w-sm"
        />
        <select
          name="role"
          defaultValue="editor"
          aria-label="Role"
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="owner">Owner</option>
        </select>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add member"}
        </Button>
      </div>
      <ErrorText>{state.error}</ErrorText>
    </form>
  );
}
