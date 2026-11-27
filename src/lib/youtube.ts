/** The YouTube IFrame Player API: loaded once, on first use, with just the types the player needs. */

export interface YTPlayer {
  loadVideoById(id: string): void;
  cueVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

export interface YTNamespace {
  Player: new (el: HTMLElement, opts: {
    width?: number | string;
    height?: number | string;
    videoId?: string;
    host?: string;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: (e: { target: YTPlayer }) => void;
      onStateChange?: (e: { data: number; target: YTPlayer }) => void;
      onError?: (e: { data: number; target: YTPlayer }) => void;
    };
  }) => YTPlayer;
  PlayerState: { ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let api: Promise<YTNamespace> | null = null;

export function loadYouTube(): Promise<YTNamespace> {
  if (!api) {
    api = new Promise<YTNamespace>((resolve, reject) => {
      if (window.YT?.Player) return resolve(window.YT);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT!);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => reject(new Error("YouTube IFrame API failed to load"));
      document.head.appendChild(s);
    });
    api.catch(() => { api = null; });
  }
  return api;
}

/** Pauses a player, if it has got far enough to have its methods (they arrive with `onReady`). */
export function pauseIfReady(p: YTPlayer | null | undefined): void {
  if (p && typeof p.pauseVideo === "function") p.pauseVideo();
}

/** Player states (YT.PlayerState), usable before the API has loaded. */
export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2 } as const;

// --- one player at a time ---------------------------------------------------------------------

const players = new Map<symbol, () => void>();

/**
 * Registers a player that should give way to the others: when one of them starts playing it
 * calls `claim()`, and every other registered player is paused (`pause`). `dispose()` on unmount.
 */
export function registerPlayer(pause: () => void): { claim: () => void; dispose: () => void } {
  const id = Symbol("player");
  players.set(id, pause);
  return {
    claim: () => { for (const [k, p] of players) if (k !== id) p(); },
    dispose: () => { players.delete(id); },
  };
}
