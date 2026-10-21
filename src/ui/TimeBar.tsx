import { useEffect, useMemo, useState } from "react";

import { useModel, useT } from "../context";
import { Icon } from "../icons";
import { useApp } from "../store";

const DAY = 86_400_000;
const toDay = (iso: string) => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY);
const fromDay = (d: number) => new Date(d * DAY).toISOString().slice(0, 10);

/** The time slider's state: the data's date range in days, the chosen day, and playback. */
export function useTimeline() {
  const model = useModel();
  const time = useApp((s) => s.time);
  const set = useApp((s) => s.set);
  const [playing, setPlaying] = useState(false);
  const range = model.meta.dateRange;
  const [min, max] = useMemo(() => (range ? [toDay(range[0]), toDay(range[1])] : [0, 0]), [range]);

  const on = time !== null;
  useEffect(() => {
    if (!playing || !on) return;
    const id = setInterval(() => {
      const cur = useApp.getState().time;
      if (!cur) return;
      const next = toDay(cur) + 30;
      if (next >= max) {
        set({ time: fromDay(max) });
        setPlaying(false);
      } else {
        set({ time: fromDay(next) });
      }
    }, 220);
    return () => clearInterval(id);
  }, [playing, on, max, set]);

  return {
    range, min, max, time, playing,
    /** the slider position: the chosen day, or the last one while the slider is off */
    value: time ? toDay(time) : max,
    setDay: (day: number) => set({ time: fromDay(day) }),
    toggle: () => { setPlaying(false); set({ time: time || !range ? null : range[1] }); },
    togglePlay: () => {
      if (!playing && time && toDay(time) >= max) set({ time: fromDay(min) });
      setPlaying(!playing);
    },
  };
}

export function TimeBar() {
  const t = useT();
  const set = useApp((s) => s.set);
  const { range, min, max, time, playing, value, setDay, toggle, togglePlay } = useTimeline();
  const years = useMemo(() => {
    if (!range) return [];
    const out: { y: number; pct: number }[] = [];
    for (let y = Number(range[0].slice(0, 4)) + 1; y <= Number(range[1].slice(0, 4)); y++) {
      out.push({ y, pct: (100 * (toDay(`${y}-01-01`) - min)) / (max - min) });
    }
    return out;
  }, [range, min, max]);

  if (!range) return null;
  return (
    <div className={`timebar${time ? " on" : ""}`}>
      <label className="switch" title={t.timeHint}>
        <input type="checkbox" checked={!!time} onChange={toggle} />
        <span className="switch-track" aria-hidden="true" />
        <span>{t.timeOn}</span>
      </label>
      {time && (
        <>
          <button type="button" className="icon-btn" aria-label={playing ? t.pause : t.play} title={playing ? t.pause : t.play} onClick={togglePlay}>
            <Icon name={playing ? "pause" : "play"} />
          </button>
          <div className="time-slider">
            <input
              type="range" min={min} max={max} step={1} value={value} aria-label={t.time}
              aria-valuetext={time}
              onChange={(e) => setDay(Number(e.target.value))}
            />
            <div className="time-ticks" aria-hidden="true">
              {years.map(({ y, pct }) => <span key={y} style={{ left: `${pct}%` }}>{y % 2 === 0 || years.length < 8 ? y : ""}</span>)}
            </div>
          </div>
          <input
            type="date" className="date-input" value={time} min={range[0]} max={range[1]} aria-label={t.date}
            onChange={(e) => e.target.value && set({ time: e.target.value })}
          />
        </>
      )}
      {!time && <span className="hint inline">{t.timeHint}</span>}
    </div>
  );
}
