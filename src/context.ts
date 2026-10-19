import { createContext, useContext, useEffect, useState } from "react";

import type { Detail, GNode } from "../shared/graph";
import { DICTS, type Dict } from "./i18n";
import { loadDetails, type Model } from "./model";
import { useApp } from "./store";
import type { Palette } from "./theme";

export const ModelContext = createContext<Model | null>(null);
export const PaletteContext = createContext<Palette | null>(null);

export function useModel(): Model {
  const m = useContext(ModelContext);
  if (!m) throw new Error("useModel outside ModelContext");
  return m;
}

export function usePalette(): Palette {
  const p = useContext(PaletteContext);
  if (!p) throw new Error("usePalette outside PaletteContext");
  return p;
}

export function useT(): Dict {
  return DICTS[useApp((s) => s.uiLang)];
}

export function useNode(key: string | null | undefined): GNode | undefined {
  const model = useModel();
  return key ? model.nodes.get(key) : undefined;
}

export function useDetail(key: string | null): { detail?: Detail; error?: string } {
  const model = useModel();
  const [state, setState] = useState<{ key: string | null; detail?: Detail; error?: string }>({ key: null });
  useEffect(() => {
    const node = key ? model.nodes.get(key) : undefined;
    if (!key || !node) return;
    let live = true;
    loadDetails(node.t)
      .then((file) => { if (live) setState({ key, detail: file[key] }); })
      .catch((e: unknown) => { if (live) setState({ key, error: String(e) }); });
    return () => { live = false; };
  }, [key, model]);
  return state.key === key ? { detail: state.detail, error: state.error } : {};
}
