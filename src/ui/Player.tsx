/**
 * The random player: plays songs that have a YouTube Music link one after another, in a shuffled
 * order, through the YouTube IFrame player. It draws from the songs the filters keep (project,
 * mood, BPM, date); BGM cues and drama tracks are left out.
 *
 * The top-bar button starts it and then shows what is playing. The drop-down under it holds the
 * video (the API wants the player visible), the controls and the next song; it hides when closed
 * but stays mounted, so the music keeps going.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { GNode, NodeType } from "../../shared/graph";
import { useModel, useT } from "../context";
import { Icon } from "../icons";
import { nameOf } from "../lib/names";
import { nodePasses } from "../lib/visibility";
import { loadYouTube, pauseIfReady, registerPlayer, YT_STATE, type YTPlayer } from "../lib/youtube";
import { useApp, useFilters } from "../store";
import { usePopover, useSpotlight } from "./Popover";

type Status = "idle" | "loading" | "playing" | "paused" | "error";

/** consecutive videos that won't play (removed, not embeddable) before the player gives up */
const MAX_ERRORS = 8;
const PERFORMER_ORDER: NodeType[] = ["artist", "character", "person"];

function shuffle<T>(xs: T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * `host`: on phones the drop-down lives in the pane under the graph instead of under the button;
 * it is drawn into that element (and still hidden, not unmounted, while closed).
 */
export function PlayerButton({ host }: { host?: HTMLElement | null } = {}) {
  const phone = host !== undefined;
  const t = useT();
  const model = useModel();
  const filters = useFilters();
  const nameLang = useApp((s) => s.nameLang);
  const select = useApp((s) => s.select);
  const { open, close, toggle } = usePopover("player");

  /** every song the player can play, and those the filters keep */
  const all = useMemo(() => model.list.filter((n) => n.t === "work" && n.s === "song" && n.yt).map((n) => n.k), [model]);
  const pool = useMemo(() => {
    const f = { ...filters, selected: null, focus: 0 };
    return new Set(all.filter((k) => nodePasses(model.nodes.get(k)!, f)));
  }, [all, model, filters]);

  const [current, setCurrent] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);

  // the YouTube callbacks are bound once; they read and move the queue through refs
  const frame = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const creating = useRef(false);
  const order = useRef<string[]>([]);
  const cursor = useRef(-1);
  const history = useRef<string[]>([]);
  const failed = useRef(new Set<string>());
  const errors = useRef(0);
  const now = useRef<string | null>(null);
  const poolRef = useRef(pool);
  poolRef.current = pool;
  /** another player (a song's own video) starting pauses this one, and this one starting pauses it */
  const focus = useRef<ReturnType<typeof registerPlayer> | null>(null);
  useEffect(() => {
    focus.current = registerPlayer(() => pauseIfReady(player.current));
    return () => focus.current?.dispose();
  }, []);

  const playable = (k: string) => poolRef.current.has(k) && !failed.current.has(k) && k !== now.current;

  /** The next song in the shuffled order that the filters keep; past the end, a new shuffle. */
  const advance = (): string | null => {
    for (let pass = 0; pass < 2; pass++) {
      for (let i = cursor.current + 1; i < order.current.length; i++) {
        if (playable(order.current[i])) {
          cursor.current = i;
          return order.current[i];
        }
      }
      order.current = shuffle(all);
      cursor.current = -1;
    }
    return null;
  };

  const load = (k: string) => {
    now.current = k;
    setCurrent(k);
    setProgress(0);
    const id = model.nodes.get(k)!.yt!;
    if (player.current) {
      player.current.loadVideoById(id);
      return;
    }
    if (creating.current) return; // onReady plays whatever is current by then
    creating.current = true;
    setStatus("loading");
    loadYouTube().then((YT) => {
      const el = document.createElement("div"); // the API replaces it with its iframe, out of React's way
      frame.current!.replaceChildren(el);
      player.current = new YT.Player(el, {
        width: "100%", height: "100%", videoId: id, host: "https://www.youtube-nocookie.com",
        playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: (e) => {
            creating.current = false;
            const want = model.nodes.get(now.current!)!.yt!;
            if (want !== id) e.target.loadVideoById(want);
            else e.target.playVideo();
          },
          onStateChange: (e) => {
            if (e.data === YT_STATE.ENDED) next();
            else if (e.data === YT_STATE.PLAYING) { errors.current = 0; setStatus("playing"); focus.current?.claim(); }
            else if (e.data === YT_STATE.PAUSED) setStatus("paused");
          },
          onError: () => {
            if (now.current) failed.current.add(now.current);
            if (++errors.current >= MAX_ERRORS) setStatus("error");
            else next();
          },
        },
      });
    }, () => {
      creating.current = false;
      setStatus("error");
    });
  };

  const next = () => {
    const k = advance();
    if (k) {
      history.current.push(k);
      load(k);
    } else {
      player.current?.pauseVideo();
    }
  };

  const prev = () => {
    const p = player.current;
    if (p && p.getCurrentTime() > 3) return p.seekTo(0, true);
    if (history.current.length < 2) return p?.seekTo(0, true);
    history.current.pop();
    load(history.current[history.current.length - 1]);
  };

  const playPause = () => {
    const p = player.current;
    if (!p) return;
    if (status === "playing") p.pauseVideo();
    else p.playVideo();
  };

  const onButton = () => {
    if (!now.current && pool.size) {
      order.current = shuffle(all);
      cursor.current = -1;
      errors.current = 0;
      next();
      if (!open) toggle();
      return;
    }
    toggle();
  };

  // progress, while it can be seen
  useEffect(() => {
    if (!open || status !== "playing") return;
    const id = setInterval(() => {
      const p = player.current;
      const dur = p?.getDuration() ?? 0;
      setProgress(dur > 0 ? Math.min(1, p!.getCurrentTime() / dur) : 0);
    }, 500);
    return () => clearInterval(id);
  }, [open, status]);

  useEffect(() => () => player.current?.destroy(), []);

  useSpotlight(open, current ? [current] : null);

  const upNext = useMemo(() => {
    for (let i = cursor.current + 1; i < order.current.length; i++) if (playable(order.current[i])) return order.current[i];
    return null;
    // reads the queue refs, which move with `current`
  }, [current, pool]);

  const node = current ? model.nodes.get(current) : undefined;
  const name = (n: GNode | undefined) => (n ? nameOf(n.n, nameLang, n.k) : "");
  const performers = useMemo(() => {
    if (!current) return [];
    const out: GNode[] = [];
    model.graph.forEachEdge(current, (_e, a, s, x) => {
      if (a.facts.some((f) => f.r === "performer")) out.push(model.nodes.get(s === current ? x : s)!);
    });
    return out.sort((a, b) => PERFORMER_ORDER.indexOf(a.t) - PERFORMER_ORDER.indexOf(b.t) || b.m.wdeg - a.m.wdeg);
  }, [current, model]);
  const sub = [
    performers.slice(0, 2).map(name).join(" · ") + (performers.length > 2 ? ` +${performers.length - 2}` : ""),
    node?.d?.slice(0, 4),
  ].filter(Boolean).join(" · ");
  const playing = status === "playing";
  const message = status === "error" ? t.loadError : status === "loading" ? t.playerLoading : !pool.size ? t.playerEmpty : null;

  // hidden, not unmounted, while closed: the video keeps playing
  const panel = (
    <div className={`pop player-pop${phone ? " pop-inline" : ""}${open ? "" : " pop-hidden"}`} role="dialog" aria-label={t.player} aria-hidden={!open}>
      <header className="pop-head">
        <h2>{t.player}</h2>
        <span className="pop-sub tabular" title={t.playerHint}>{t.playerPool(pool.size)}</span>
        <button type="button" className="icon-btn small pop-close" aria-label={t.close} onClick={close}><Icon name="close" size={16} /></button>
      </header>
      <div className={`yt-frame${node ? "" : " empty"}`} ref={frame} />
      <div className="player-progress" aria-hidden="true"><i style={{ width: `${progress * 100}%` }} /></div>
      <div className="player-now">
        <div className="player-meta">
          {node ? (
            <button type="button" className="player-title" title={t.playerShow} onClick={() => select(node.k)}>{name(node)}</button>
          ) : null}
          {node && sub && <span className="player-sub">{sub}</span>}
          {message && <span className="player-sub">{message}</span>}
        </div>
        <div className="transport" role="group">
          <button type="button" className="icon-btn small" title={t.playerPrev} aria-label={t.playerPrev} disabled={!node} onClick={prev}>
            <Icon name="prev" size={16} />
          </button>
          <button
            type="button" className="icon-btn play-btn" title={playing ? t.pause : t.play} aria-label={playing ? t.pause : t.play}
            disabled={!node && !pool.size} onClick={node ? playPause : onButton}
          >
            <Icon name={playing ? "pause" : "play"} size={18} />
          </button>
          <button type="button" className="icon-btn small" title={t.playerNext} aria-label={t.playerNext} disabled={!pool.size} onClick={next}>
            <Icon name="next" size={16} />
          </button>
        </div>
      </div>
      {upNext && (
        <div className="player-next">
          <span>{t.playerUpNext}</span>
          <button type="button" onClick={next}>{name(model.nodes.get(upNext))}</button>
        </div>
      )}
    </div>
  );
  if (phone) {
    return (
      <>
        <button
          type="button" className={`fab player-fab${open ? " on" : ""}`} aria-expanded={open} aria-label={node ? `${t.player} · ${name(node)}` : t.player}
          onClick={onButton}
        >
          {node ? <Eq playing={playing} /> : <Icon name="shuffle" size={20} />}
        </button>
        {host && createPortal(panel, host)}
      </>
    );
  }
  return (
    <div className="pop-anchor">
      <button
        type="button" className={`btn pop-btn player-btn${open ? " on" : ""}`} aria-expanded={open} aria-haspopup="dialog"
        title={node ? `${t.player} · ${name(node)}` : t.player} onClick={onButton}
      >
        {node ? <Eq playing={playing} /> : <Icon name="shuffle" size={16} />}
        <span className="pop-btn-label">{node ? name(node) : t.player}</span>
      </button>
      {panel}
    </div>
  );
}

/** Three bars that dance while music plays. */
function Eq({ playing }: { playing: boolean }) {
  return (
    <span className={`eq${playing ? " on" : ""}`} aria-hidden="true">
      <i /><i /><i />
    </span>
  );
}
