"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, ErrorText, Input } from "@/components/ui";
import { addKey } from "./actions";

export function AddKeyForm({ slug, baseLocale }: { slug: string; baseLocale: string }) {
  const [state, action, pending] = useActionState(addKey.bind(null, slug), {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      formRef.current?.querySelector<HTMLInputElement>("input[name=key]")?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-1">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="key" placeholder="Key, e.g. checkout.pay_button" required aria-label="Key" className="font-mono sm:w-72" />
        <Input name="baseValue" placeholder={`Text in ${baseLocale}`} aria-label={`Text in ${baseLocale}`} />
        <Input name="description" placeholder="Context for translators (optional)" aria-label="Description" />
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? "Adding…" : "Add key"}
        </Button>
      </div>
      <ErrorText>{state.error}</ErrorText>
    </form>
  );
}
