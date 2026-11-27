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
import { useToday } from "../lib/birthday";
import { eventsOn, keysOf, loadDays, parseTemplate, particle, shiftDate, type DayItem } from "../lib/days";
import { nameOf } from "../lib/names";
import type { Visible } from "../lib/visibility";
import { useApp } from "../store";
import { usePopover, useSpotlight } from "./Popover";

/** subjects listed before "and N more" */
const LIST_MAX = 6;

const monthDay = (date: string) => [Number(date.slice(5, 7)), Number(date.slice(8, 10))] as const;

export function TodayButton({ visible }: { visible: Visible }) {
  const t = useT();
  const today = useToday();
  const { open, close, toggle } = usePopover("today");
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

function TodayPanel({ visible, today, onClose }: { visible: Visible; today: string; onClose: () => void }) {
  const t = useT();
  const model = useModel();
  const nameLang = useApp((s) => s.nameLang);
  const [date, setDate] = useState(today);
  const [events, setEvents] = useState<DayEvent[] | null>(null);
  const [error, setError] = useState(false);
  const [hover, setHover] = useState<DayItem | null>(null);

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
    <div className="pop today-pop" role="dialog" aria-labelledby="today-title">
      <header className="pop-head">
        <button type="button" className="icon-btn small" title={t.dayPrev} aria-label={t.dayPrev} onClick={() => setDate(shiftDate(date, -1))}>
          <Icon name="back" size={16} />
        </button>
        <h2 id="today-title" title={t.dayHint}>{t.dayTitle(m, d)}</h2>
        <button type="button" className="icon-btn small" title={t.dayNext} aria-label={t.dayNext} onClick={() => setDate(shiftDate(date, 1))}>
          <Icon name="chevron" size={16} />
        </button>
        {!isToday && <button type="button" className="text-btn" onClick={() => setDate(today)}>{t.dayToday}</button>}
        <button type="button" className="icon-btn small pop-close" aria-label={t.close} onClick={onClose}><Icon name="close" size={16} /></button>
      </header>
      <div className="pop-body" onMouseLeave={() => setHover(null)}>
        {error ? <p className="pop-empty">{t.loadError}</p>
          : !events ? <p className="pop-empty"><span className="spinner small" aria-hidden="true" /></p>
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
