"use client";

import { useTransition } from "react";
import { revokeApiKey } from "./actions";

export function RevokeKeyButton({ slug, keyId, name }: { slug: string; keyId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Revoke "${name}"? Apps using it will stop receiving translations.`)) return;
        startTransition(() => revokeApiKey(slug, keyId));
      }}
    >
      {pending ? "Revoking…" : "Revoke"}
    </button>
  );
}
