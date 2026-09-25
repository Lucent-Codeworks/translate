import "server-only";
import { headers } from "next/headers";

/** Public URL of this instance as the browser sees it (respects reverse proxies). */
export async function requestOrigin() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}
