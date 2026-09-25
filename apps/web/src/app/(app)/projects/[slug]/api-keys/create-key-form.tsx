"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { CopyButton } from "@/components/copy-button";
import { Button, ErrorText, Input } from "@/components/ui";
import { createApiKey } from "./actions";

export function CreateKeyForm({
  slug,
  origin,
  baseLocale,
}: {
  slug: string;
  origin: string;
  baseLocale: string;
}) {
  const [state, action, pending] = useActionState(createApiKey.bind(null, slug), {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.secret) formRef.current?.reset();
  }, [state]);

  const snippet = `import { createTranslateClient } from "@lucent-translate/sdk";

const i18n = createTranslateClient({
  baseUrl: "${origin}",
  project: "${slug}",
  apiKey: "${state.secret}",
  fallbackLocale: "${baseLocale}",
});

await i18n.load("${baseLocale}"); // or the user's locale
i18n.start(); // poll for live updates
i18n.t("${baseLocale}", "some.key");`;

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} action={action} className="flex flex-col gap-1">
        <div className="flex gap-2">
          <Input
            name="name"
            placeholder="Name, e.g. Production web app"
            required
            aria-label="Key name"
            className="max-w-sm"
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create API key"}
          </Button>
        </div>
        <ErrorText>{state.error}</ErrorText>
      </form>

      {state.secret && (
        <div className="flex flex-col gap-3 rounded-lg border border-accent bg-accent-dim p-6">
          <div className="text-sm font-medium">
            Copy your new key now. It won&apos;t be shown again.
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md border border-border-strong bg-surface px-3 py-2 font-mono text-sm text-accent">
              {state.secret}
            </code>
            <CopyButton text={state.secret} />
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">
              SDK usage{" "}
              <span className="text-subtle">
                (setup for React, Svelte, Vue, Nuxt, PHP and Rust is on the{" "}
                <Link href={`/projects/${slug}/sdks`} className="text-accent hover:underline">
                  SDKs tab
                </Link>
                )
              </span>
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-md border border-border-strong bg-surface p-3 font-mono text-xs">
              {snippet}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
