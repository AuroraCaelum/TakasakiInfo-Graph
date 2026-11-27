/** The YouTube IFrame Player API: loaded once, on first use, with just the types the player needs. */

export interface YTPlayer {
  loadVideoById(id: string): void;
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

/** Player states (YT.PlayerState), usable before the API has loaded. */
export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2 } as const;
