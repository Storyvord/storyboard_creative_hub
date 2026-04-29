"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Loader2, X, MapPin, Clock, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  getProjectCalendar, createProjectCalendarEvent, updateProjectCalendarEvent, deleteProjectCalendarEvent,
  CalendarEvent,
} from "@/services/calendar";

// ── Helpers ────────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function fmtDateInput(iso: string) {
  return iso.slice(0, 16); // "YYYY-MM-DDTHH:MM"
}

// ── Event Modal ────────────────────────────────────────────────────────────────

function EventModal({ event, onClose, onSave, onDelete }: {
  event: Partial<CalendarEvent> & { start: string; end: string };
  onClose: () => void;
  onSave: (data: { title: string; start: string; end: string; description?: string; location?: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [title, setTitle] = useState(event.title ?? "");
  const [start, setStart] = useState(fmtDateInput(event.start));
  const [end, setEnd] = useState(fmtDateInput(event.end));
  const [description, setDescription] = useState(event.description ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [loading, setLoading] = useState(false);
  const isNew = !event.id;

  const submit = async () => {
    if (!title.trim()) { toast.error("Title is required."); return; }
    if (new Date(end).getTime() <= new Date(start).getTime()) { toast.error("End time must be after start time."); return; }
    setLoading(true);
    try {
      await onSave({ title: title.trim(), start: new Date(start).toISOString(), end: new Date(end).toISOString(), description: description || undefined, location: location || undefined });
    } catch { toast.error("Couldn't save the event. Please try again."); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!onDelete || !confirm("Delete this event?")) return;
    setLoading(true);
    try { await onDelete(); }
    catch { toast.error("Couldn't delete the event. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "min(480px, 96vw)", background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{isNew ? "New Event" : "Edit Event"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={18} /></button>
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title"
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 14 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Start</label>
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>End</label>
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box" }} />
          </div>
        </div>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)"
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13 }} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={3}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, resize: "vertical" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {!isNew && onDelete ? (
            <button onClick={handleDelete} disabled={loading} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
              <Trash2 size={14} />Delete
            </button>
          ) : <div />}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button onClick={submit} disabled={loading}
              style={{ padding: "8px 20px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : (isNew ? "Create" : "Save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Calendar Grid ──────────────────────────────────────────────────────────────

function MonthGrid({ year, month, events, today, onDayClick, onEventClick }: {
  year: number; month: number; events: CalendarEvent[];
  today: Date; onDayClick: (date: Date) => void; onEventClick: (e: CalendarEvent) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsOnDay = (day: number) => events.filter((e) => {
    const d = new Date(e.start);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, flex: 1, minHeight: 0 }}>
      {DAY_NAMES.map((d) => (
        <div key={d} style={{ padding: "8px 6px", textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", background: "var(--surface)" }}>{d}</div>
      ))}
      {cells.map((day, i) => {
        const isToday = day !== null && sameDay(new Date(year, month, day), today);
        const dayEvents = day !== null ? eventsOnDay(day) : [];
        return (
          <div key={i} onClick={() => day && onDayClick(new Date(year, month, day))}
            style={{
              minHeight: 90, padding: "6px 8px", background: "var(--bg-primary)",
              cursor: day ? "pointer" : "default", position: "relative",
              opacity: day ? 1 : 0.3, borderTop: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => { if (day) e.currentTarget.style.background = "var(--surface)"; }}
            onMouseLeave={(e) => { if (day) e.currentTarget.style.background = "var(--bg-primary)"; }}
          >
            {day && (
              <>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26, borderRadius: "50%", fontSize: 13, fontWeight: isToday ? 700 : 400,
                  background: isToday ? "var(--accent)" : "transparent",
                  color: isToday ? "#fff" : "var(--text-primary)",
                }}>
                  {day}
                </span>
                <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div key={ev.id} onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                      style={{
                        fontSize: 11, padding: "2px 5px", borderRadius: 4,
                        background: "var(--accent)", color: "#fff",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span style={{ fontSize: 10, color: "var(--text-muted)", paddingLeft: 2 }}>+{dayEvents.length - 3} more</span>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalEvent, setModalEvent] = useState<(Partial<CalendarEvent> & { start: string; end: string }) | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    getProjectCalendar(projectId)
      .then((cal: any) => {
        // CalendarSerializer returns { id, name, project, events } — events is source='calendar_events'
        const evts = cal?.events ?? cal?.calendar_events ?? [];
        setEvents(evts);
      })
      .catch(() => toast.error("Couldn't load calendar. Please refresh."))
      .finally(() => setLoading(false));
  }, [projectId]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const openNewEvent = (date: Date) => {
    const start = new Date(date); start.setHours(9, 0, 0, 0);
    const end = new Date(date); end.setHours(10, 0, 0, 0);
    setModalEvent({ start: start.toISOString(), end: end.toISOString() });
  };

  const handleSave = async (data: { title: string; start: string; end: string; description?: string; location?: string }) => {
    if (modalEvent?.id && typeof modalEvent.id === "number") {
      const updated = await updateProjectCalendarEvent(projectId, modalEvent.id, data);
      setEvents((prev) => prev.map((e) => e.id === updated.id ? updated : e));
      toast.success("Event updated.");
    } else {
      const created = await createProjectCalendarEvent(projectId, data);
      setEvents((prev) => [...prev, created]);
      toast.success("Event created.");
    }
    setModalEvent(null);
  };

  const handleDelete = async () => {
    if (!modalEvent?.id || typeof modalEvent.id === "string") return;
    await deleteProjectCalendarEvent(projectId, modalEvent.id);
    setEvents((prev) => prev.filter((e) => e.id !== modalEvent.id));
    toast.success("Event deleted.");
    setModalEvent(null);
  };

  // upcoming events for side panel
  const upcomingEvents = [...events]
    .filter((e) => new Date(e.start) >= today)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 8);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px 12px", flexShrink: 0, borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={prevMonth} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 8px", cursor: "pointer", color: "var(--text-primary)" }}>
            <ChevronLeft size={16} />
          </button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, minWidth: 180, textAlign: "center" }}>
            {MONTH_NAMES[month]} {year}
          </h1>
          <button onClick={nextMonth} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 8px", cursor: "pointer", color: "var(--text-primary)" }}>
            <ChevronRight size={16} />
          </button>
          <button onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}
            style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", cursor: "pointer", fontSize: 12 }}>
            Today
          </button>
        </div>
        <button onClick={() => openNewEvent(today)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} />New Event
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Calendar grid */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", padding: "0 0 0 0" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
              <Loader2 size={28} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : (
            <MonthGrid year={year} month={month} events={events} today={today} onDayClick={openNewEvent} onEventClick={(e) => setModalEvent(e)} />
          )}
        </div>

        {/* Upcoming sidebar */}
        <div style={{ width: 220, borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
            Upcoming
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
            {upcomingEvents.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", paddingTop: 24 }}>No upcoming events.</p>
            ) : upcomingEvents.map((ev) => (
              <div key={ev.id} onClick={() => setModalEvent(ev)} style={{ padding: "8px 10px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={10} />{new Date(ev.start).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {fmtTime(ev.start)}
                </p>
                {ev.location && (
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={10} />{ev.location}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {modalEvent && (
        <EventModal
          event={modalEvent}
          onClose={() => setModalEvent(null)}
          onSave={handleSave}
          onDelete={modalEvent.id && typeof modalEvent.id === "number" ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
