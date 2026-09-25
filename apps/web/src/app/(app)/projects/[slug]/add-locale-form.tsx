"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, ErrorText, Input } from "@/components/ui";
import { addLocale } from "./actions";

export function AddLocaleForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(addLocale.bind(null, slug), {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          name="code"
          placeholder="Language code, e.g. de or pt-BR"
          required
          className="w-64"
          aria-label="Language code"
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Adding…" : "Add language"}
        </Button>
      </div>
      <ErrorText>{state.error}</ErrorText>
    </form>
  );
}
