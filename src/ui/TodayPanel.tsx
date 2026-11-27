/**
 * "This day in Love Live!": a drop-down under its top-bar button listing what happened on
 * today's month and day in past years (and what is coming), by section, in plain sentences.
 * While it is open the graph highlights every node it names; pointing at a line narrows the
 * highlight to that line.
 */

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";

import type { DayEvent } from "../../shared/graph";
import { useModel, usePalette, useT } from "../context";
import { DAY_SECTIONS, type Dict } from "../i18n";
import { Icon, TypeIcon } from "../icons";
import { birthdaysOn, useToday } from "../lib/birthday";
import { countsByDay, eventsOn, keysOf, loadDays, parseTemplate, particle, shiftDate, type DayItem } from "../lib/days";
import { nameOf } from "../lib/names";
import type { Visible } from "../lib/visibility";
import { useApp } from "../store";
import { usePopover, useSpotlight } from "./Popover";

/** subjects listed before "and N more" */
const LIST_MAX = 6;

const monthDay = (date: string) => [Number(date.slice(5, 7)), Number(date.slice(8, 10))] as const;

/** `phone`: a round button only; the phone shell shows the list in the pane under the graph. */
export function TodayButton({ visible, phone = false }: { visible: Visible; phone?: boolean }) {
  const t = useT();
  const today = useToday();
  const { open, close, toggle } = usePopover("today");
  if (phone) {
    return (
      <button type="button" className={`fab${open ? " on" : ""}`} aria-expanded={open} aria-label={t.dayOpen} onClick={toggle}>
        <Icon name="calendar" size={20} />
      </button>
    );
  }
  return (
    <div className="pop-anchor">
      <button
        type="button" className={`btn pop-btn${open ? " on" : ""}`} aria-expanded={open} aria-haspopup="dialog"
        title={t.dayOpen} onClick={toggle}
      >
        <Icon name="calendar" size={16} />
        <span>{t.dayButton(...monthDay(today))}</span>
      </button>
      {open && <TodayPanel visible={visible} today={today} onClose={close} />}
    </div>
  );
}

/** The list on its own, in the pane under the graph on phones. */
export function TodayPane({ visible }: { visible: Visible }) {
  const today = useToday();
  const { close } = usePopover("today");
  return <TodayPanel visible={visible} today={today} onClose={close} inline />;
}

function TodayPanel({ visible, today, onClose, inline = false }: { visible: Visible; today: string; onClose: () => void; inline?: boolean }) {
  const t = useT();
  const model = useModel();
  const nameLang = useApp((s) => s.nameLang);
  const [date, setDate] = useState(today);
  const [events, setEvents] = useState<DayEvent[] | null>(null);
  const [error, setError] = useState(false);
  const [hover, setHover] = useState<DayItem | null>(null);
  /** the month calendar shows instead of the list */
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    let live = true;
    loadDays().then((e) => { if (live) setEvents(e); }, () => { if (live) setError(true); });
    return () => { live = false; };
  }, []);

  const name = (k: string) => nameOf(model.nodes.get(k)?.n, nameLang, k);
  const items = useMemo(
    () => (events ? eventsOn(date, today, events, model.nodes, visible.nodes, (a, b) => name(a) === name(b)) : []),
    [events, date, today, model, visible, nameLang],
  );
  const everything = useMemo(
    () => (events ? eventsOn(date, today, events, model.nodes, model.nodes, () => false).length : 0),
    [events, date, today, model],
  );
  useSpotlight(true, hover ? keysOf([hover]) : keysOf(items));

  const isToday = date === today;
  const [m, d] = monthDay(date);
  return (
    <div className={`pop today-pop${inline ? " pop-inline" : ""}`} role="dialog" aria-labelledby="today-title">
      <header className="pop-head">
        <button type="button" className="icon-btn small" title={t.dayPrev} aria-label={t.dayPrev} onClick={() => { setDate(shiftDate(date, -1)); setPicking(false); }}>
          <Icon name="back" size={16} />
        </button>
        <h2 id="today-title">
          <button
            type="button" className={`day-title-btn${picking ? " on" : ""}`} aria-expanded={picking}
            title={`${t.dayPick} · ${t.dayHint}`} onClick={() => setPicking(!picking)}
          >
            {t.dayTitle(m, d)}
            <Icon name="calendar" size={14} />
          </button>
        </h2>
        <button type="button" className="icon-btn small" title={t.dayNext} aria-label={t.dayNext} onClick={() => { setDate(shiftDate(date, 1)); setPicking(false); }}>
          <Icon name="chevron" size={16} />
        </button>
        {!isToday && <button type="button" className="text-btn" onClick={() => { setDate(today); setPicking(false); }}>{t.dayToday}</button>}
        <button type="button" className="icon-btn small pop-close" aria-label={t.close} onClick={onClose}><Icon name="close" size={16} /></button>
      </header>
      <div className="pop-body" onMouseLeave={() => setHover(null)}>
        {error ? <p className="pop-empty">{t.loadError}</p>
          : !events ? <p className="pop-empty"><span className="spinner small" aria-hidden="true" /></p>
          : picking ? (
            <DayCalendar
              date={date} today={today} counts={countsByDay(events, model.nodes, visible.nodes)}
              onPick={(x) => { setDate(x); setPicking(false); }}
            />
          )
          : !items.length ? <p className="pop-empty">{everything ? t.dayEmptyFiltered : t.dayEmpty}</p>
          : DAY_SECTIONS.map((sec) => {
            const rows = items.filter((i) => i.section === sec);
            if (!rows.length) return null;
            return (
              <section key={sec} className="day-sec">
                <h3>{t.daySections[sec]}<span className="count">{rows.length}</span></h3>
                <ul>
                  {rows.map((it, i) => (
                    <li
                      key={`${it.date}|${it.template}|${it.s.join()}|${i}`} className={it.future ? "upcoming" : undefined}
                      onMouseEnter={() => setHover(it)}
                    >
                      <p><Sentence item={it} t={t} isToday={isToday} name={name} /></p>
                      {it.future ? <span className="day-chip">{t.dayUpcoming}</span>
                        : it.years > 0 ? <span className="day-chip">{t.dayYears(it.years)}</span> : null}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
      </div>
    </div>
  );
}

/**
 * A month of the year being looked at, to jump to a day. Only the month and day matter to the
 * list; the year sets the weekdays. Days with something on them carry a dot.
 */
function DayCalendar({ date, today, counts, onPick }: {
  date: string; today: string; counts: Map<string, number>; onPick: (date: string) => void;
}) {
  const t = useT();
  const [month, setMonth] = useState(() => ({ y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)) }));
  const move = (by: number) => setMonth(({ y, m }) => {
    const i = y * 12 + (m - 1) + by;
    return { y: Math.floor(i / 12), m: (i % 12) + 1 };
  });
  const pad = (n: number) => String(n).padStart(2, "0");
  const first = new Date(Date.UTC(month.y, month.m - 1, 1)).getUTCDay();
  const length = new Date(Date.UTC(month.y, month.m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array<null>(first).fill(null)];
  for (let d = 1; d <= length; d++) cells.push(`${month.y}-${pad(month.m)}-${pad(d)}`);
  const countOn = (x: string) => [...birthdaysOn(x)].reduce((n, md) => n + (counts.get(md) ?? 0), 0);
  const max = Math.max(1, ...cells.map((x) => (x ? countOn(x) : 0)));

  return (
    <div className="day-cal">
      <div className="day-cal-head">
        <button type="button" className="icon-btn small" title={t.dayPrevMonth} aria-label={t.dayPrevMonth} onClick={() => move(-1)}>
          <Icon name="back" size={16} />
        </button>
        <span>{t.dayMonth(month.m)}</span>
        <button type="button" className="icon-btn small" title={t.dayNextMonth} aria-label={t.dayNextMonth} onClick={() => move(1)}>
          <Icon name="chevron" size={16} />
        </button>
      </div>
      <div className="day-cal-grid" role="grid">
        {t.weekdays.map((w, i) => <span key={`w${i}`} className="day-cal-wd" aria-hidden="true">{w}</span>)}
        {cells.map((x, i) => {
          if (!x) return <span key={`e${i}`} />;
          const n = countOn(x);
          const cls = ["day-cal-day", x === date ? "on" : "", x === today ? "today" : "", n ? "" : "none"].filter(Boolean).join(" ");
          return (
            <button
              key={x} type="button" className={cls} aria-pressed={x === date} title={n ? t.dayCount(n) : undefined}
              onClick={() => onPick(x)}
            >
              {Number(x.slice(8))}
              {/* the dot grows a little with how much happened that day */}
              {n > 0 && <i style={{ opacity: 0.45 + (0.55 * n) / max }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A template with its slots filled: names are buttons that select the node. */
function Sentence({ item, t, isToday, name }: { item: DayItem; t: Dict; isToday: boolean; name: (k: string) => string }) {
  const [open, setOpen] = useState(false);
  const tpl = t.dayTpl[item.template][item.section === "birthday" ? (isToday ? 0 : 1) : item.future ? 1 : 0];
  let lastText = "";
  const list = (keys: string[], more: boolean): ReactNode => {
    const shown = more && !open && keys.length > LIST_MAX + 1 ? keys.slice(0, LIST_MAX) : keys;
    const rest = keys.length - shown.length;
    const parts: ReactNode[] = shown.map((k, i) => (
      <Fragment key={k}>
        {i > 0 && (i === shown.length - 1 && !rest ? t.listLast : t.listSep)}
        <DayName k={k} />
      </Fragment>
    ));
    if (rest) {
      lastText = t.dayMore(rest);
      parts.push(<Fragment key="more">{t.listSep}<span role="button" tabIndex={0} className="day-more" onClick={() => setOpen(true)} onKeyDown={(e) => { if (e.key === "Enter") setOpen(true); }}>{lastText}</span></Fragment>);
    } else {
      lastText = name(shown[shown.length - 1]);
    }
    return parts;
  };
  return (
    <>
      {parseTemplate(tpl).map((tok, i) => {
        if (tok.kind === "text") return <Fragment key={i}>{tok.text}</Fragment>;
        if (tok.kind === "particle") return <Fragment key={i}>{particle(lastText, tok.pair)}</Fragment>;
        if (tok.slot === "w") {
          lastText = t.dayWhen(Number(item.date.slice(0, 4)), isToday);
          return <Fragment key={i}>{lastText}</Fragment>;
        }
        return <Fragment key={i}>{list(tok.slot === "s" ? item.s : item.c, tok.slot === "s")}</Fragment>;
      })}
    </>
  );
}

function DayName({ k }: { k: string }) {
  const model = useModel();
  const p = usePalette();
  const t = useT();
  const lang = useApp((s) => s.nameLang);
  const select = useApp((s) => s.select);
  const node = model.nodes.get(k);
  if (!node) return <>{k}</>;
  return (
    // a span, not a button: a button is an inline block, and a long name would break the sentence's flow
    <span
      role="button" tabIndex={0} className="day-name" title={t.types[node.t]} onClick={() => select(k)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(k); } }}
    >
      <TypeIcon type={node.t} sub={node.s} size={12} style={{ color: p.type[node.t] }} />
      {nameOf(node.n, lang, k)}
    </span>
  );
}
