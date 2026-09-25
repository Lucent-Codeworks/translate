"use client";

import { startTransition, useActionState } from "react";
import { Button, ErrorText } from "@/components/ui";
import { importTranslations } from "./actions";

const SHOWN_SKIPS = 20;

export function ImportForm({
  slug,
  locales,
  baseLocale,
}: {
  slug: string;
  locales: { code: string; name: string }[];
  baseLocale: string;
}) {
  const [state, action, pending] = useActionState(importTranslations.bind(null, slug), {});
  const result = state.result;

  return (
    <form
      // Submitting via onSubmit (not `action`) skips React's automatic form
      // reset, so the chosen language and options stay put between imports.
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">File</span>
        <input
          type="file"
          name="file"
          accept=".json,application/json"
          required
          className="text-sm file:mr-3 file:h-9 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:text-sm"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Language</span>
        <select
          name="locale"
          defaultValue={baseLocale}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        >
          {locales.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name} ({l.code})
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="createKeys" defaultChecked className="mt-1" />
          <span>
            Create keys that don&apos;t exist yet
            <span className="block text-xs text-muted">Otherwise they are skipped.</span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="overwrite" defaultChecked className="mt-1" />
          <span>
            Overwrite existing translations
            <span className="block text-xs text-muted">
              Otherwise only missing translations are filled in.
            </span>
          </span>
        </label>
      </div>
      <ErrorText>{state.error}</ErrorText>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Importing…" : "Import"}
        </Button>
      </div>

      {result && (
        <div role="status" className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3 text-sm">
          <div className="font-medium">Import finished</div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            <li>New keys: {result.createdKeys}</li>
            <li>Added translations: {result.added}</li>
            <li>Updated translations: {result.updated}</li>
            <li>Unchanged: {result.unchanged}</li>
          </ul>
          {result.skipped.length > 0 && (
            <details>
              <summary className="cursor-pointer text-amber-700 dark:text-amber-400">
                Skipped {result.skipped.length}
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-xs">
                {result.skipped.slice(0, SHOWN_SKIPS).map((s, i) => (
                  <li key={i}>
                    <code>{s.key}</code>: {s.reason}
                  </li>
                ))}
                {result.skipped.length > SHOWN_SKIPS && (
                  <li className="text-muted">…and {result.skipped.length - SHOWN_SKIPS} more</li>
                )}
              </ul>
            </details>
          )}
        </div>
      )}
    </form>
  );
}
