"use client";

import { useRef, useState, useTransition } from "react";
import { saveTranslation } from "./actions";

type Status = { kind: "idle" | "saved" } | { kind: "error"; message: string };

/** A textarea that saves its value when it loses focus. Esc reverts, Ctrl/Cmd+Enter saves. */
export function TranslationCell({
  slug,
  keyId,
  locale,
  initialValue,
  readOnly,
  label,
}: {
  slug: string;
  keyId: string;
  locale: string;
  initialValue: string;
  readOnly: boolean;
  label: string;
}) {
  const saved = useRef(initialValue);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [filled, setFilled] = useState(initialValue !== "");
  const [pending, startTransition] = useTransition();

  function save(value: string) {
    if (value === saved.current) return;
    startTransition(async () => {
      const result = await saveTranslation(slug, keyId, locale, value).catch(() => ({
        error: "Could not save",
      }));
      if (result.error) {
        setStatus({ kind: "error", message: result.error });
      } else {
        saved.current = value;
        setStatus({ kind: "saved" });
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <textarea
        aria-label={label}
        defaultValue={initialValue}
        readOnly={readOnly}
        rows={1}
        placeholder={readOnly ? "" : "Missing translation"}
        className={
          "field-sizing-content min-h-9 w-full resize-none rounded-md border bg-transparent px-2 py-1.5 text-sm outline-none transition duration-200 ease-brand placeholder:text-warning/80 focus:bg-surface focus:ring-3 focus:ring-accent-dim " +
          (status.kind === "error"
            ? "border-danger"
            : filled
              ? "border-transparent hover:border-border-strong focus:border-accent"
              : "border-dashed border-warning-border bg-warning/5 focus:border-accent")
        }
        onChange={(e) => setFilled(e.currentTarget.value !== "")}
        onFocus={() => status.kind === "saved" && setStatus({ kind: "idle" })}
        onBlur={(e) => !readOnly && save(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.currentTarget.value = saved.current;
            setFilled(saved.current !== "");
            e.currentTarget.blur();
          } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      />
      {(pending || status.kind !== "idle") && (
        <span
          className={
            "px-2 text-xs " + (status.kind === "error" && !pending ? "text-danger" : "text-accent")
          }
        >
          {pending ? "Saving…" : status.kind === "error" ? status.message : "Saved"}
        </span>
      )}
    </div>
  );
}
