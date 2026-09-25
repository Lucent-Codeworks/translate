"use client";

import { useTransition } from "react";
import { revokeApiKey } from "./actions";

export function RevokeKeyButton({ slug, keyId, name }: { slug: string; keyId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="text-danger hover:underline disabled:opacity-50"
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
