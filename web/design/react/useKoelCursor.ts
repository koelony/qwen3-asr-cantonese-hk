/* generated from koelony/design@e6933b9b8c1d, do not edit. Change it in koelony/design and sync. */
import { useEffect } from "react";
import { mountCursor, resetCursorHover } from "../lib/cursor.ts";

/**
 * Mounts the Little Koel cursor for the life of the component (mouse only, follows
 * prefers-reduced-motion live; see cursor.ts). Pass the current pathname as `route` on a
 * client-routed site so the hover states are cleared on navigation.
 */
export function useKoelCursor(route?: string): void {
  useEffect(() => mountCursor(), []);
  useEffect(() => {
    if (route !== undefined) resetCursorHover();
  }, [route]);
}
