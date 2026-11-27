/**
 * A song's own video at the top of its overview: the YouTube player, cued but not started, so
 * nothing plays until the viewer presses play. Starting it pauses the random player (and the
 * random player starting again pauses this one).
 */

import { useEffect, useRef, useState } from "react";

import { useT } from "../../context";
import { loadYouTube, pauseIfReady, registerPlayer, YT_STATE, type YTPlayer } from "../../lib/youtube";

export function SongVideo({ videoId, title }: { videoId: string; title: string }) {
  const t = useT();
  const frame = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const ready = useRef(false);
  const want = useRef(videoId);
  const [failed, setFailed] = useState(false);
  want.current = videoId;

  useEffect(() => {
    let live = true;
    const focus = registerPlayer(() => pauseIfReady(player.current));
    loadYouTube().then((YT) => {
      if (!live || !frame.current) return;
      const el = document.createElement("div"); // the API swaps it for its iframe, out of React's way
      frame.current.replaceChildren(el);
      player.current = new YT.Player(el, {
        width: "100%", height: "100%", videoId: want.current, host: "https://www.youtube-nocookie.com",
        playerVars: { rel: 0, playsinline: 1 },
        events: {
          onReady: (e) => {
            ready.current = true;
            if (e.target !== player.current) return;
            // the song may have changed while the player was loading
            if (want.current !== videoId) e.target.cueVideoById(want.current);
          },
          onStateChange: (e) => { if (e.data === YT_STATE.PLAYING) focus.claim(); },
        },
      });
    }, () => { if (live) setFailed(true); });
    return () => {
      live = false;
      focus.dispose();
      if (typeof player.current?.destroy === "function") player.current.destroy();
      player.current = null;
      ready.current = false;
    };
    // one player for the panel's life; a new song is cued into it below
  }, []);

  // another song: cue it (never start it)
  useEffect(() => {
    if (ready.current) player.current?.cueVideoById(videoId);
  }, [videoId]);

  if (failed) return null;
  return <div className="yt-frame song-video" ref={frame} role="region" aria-label={`${t.listen} · ${title}`} />;
}
