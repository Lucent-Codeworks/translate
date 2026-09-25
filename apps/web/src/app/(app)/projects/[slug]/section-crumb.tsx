"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { PROJECT_SECTIONS } from "../../sidebar";

/** " / SDKs" etc. for the project header breadcrumb. */
export function SectionCrumb() {
  const segment = useSelectedLayoutSegment();
  const section = PROJECT_SECTIONS.find((s) => s.segment === segment);
  return section ? <> / {section.label}</> : null;
}
