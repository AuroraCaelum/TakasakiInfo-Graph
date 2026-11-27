/**
 * The top bar's drop-downs (this day in Love Live!, the random player): a panel that hangs
 * under its button. One is open at a time; it stays open while the graph is used (that is what
 * its highlight is for) and closes with its button, its ✕ or Escape.
 */

import { useCallback, useEffect } from "react";

import { useApp, type AppState } from "../store";

type Name = NonNullable<AppState["popover"]>;

export function usePopover(name: Name) {
  const open = useApp((s) => s.popover === name);
  const close = useCallback(() => {
    if (useApp.getState().popover === name) useApp.getState().set({ popover: null });
  }, [name]);
  const toggle = useCallback(() => {
    const s = useApp.getState();
    s.set({ popover: s.popover === name ? null : name });
  }, [name]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "Escape" && !/input|textarea|select/i.test(target.tagName)) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return { open, close, toggle };
}

/** Points the graph's highlight at `keys` while `on`; lets go when it turns off or unmounts. */
export function useSpotlight(on: boolean, keys: string[] | null) {
  const sig = on && keys?.length ? keys.join("|") : "";
  useEffect(() => {
    if (!sig) return;
    useApp.getState().set({ spotlight: sig.split("|") });
    return () => {
      if (useApp.getState().spotlight?.join("|") === sig) useApp.getState().set({ spotlight: null });
    };
  }, [sig]);
}
