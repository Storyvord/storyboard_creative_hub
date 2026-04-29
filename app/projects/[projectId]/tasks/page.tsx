"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Plus, Loader2, X, CheckSquare, Calendar, Flag, User2, Circle,
  AlertCircle, Clock, CheckCircle2, PauseCircle, MessageSquare, Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getProjectTasks, createProjectTask, updateProjectTask, deleteProjectTask,
  getProjectTaskChecklists, createProjectTaskChecklist, updateProjectTaskChecklist, deleteProjectTaskChecklist,
  getProjectTaskComments, createProjectTaskComment,
  ProjectTask, ProjectTaskCheckList, ProjectTaskComment,
  TaskStatus, TaskPriority,
} from "@/services/tasks";
import { getProject } from "@/services/project";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useUserInfo } from "@/hooks/useUserInfo";
import type { ProjectMember } from "@/types/project";

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string; bar: string; icon: React.ReactNode }[] = [
  { value: "pending",     label: "Pending",     color: "text-gray-400",   bar: "#6b7280", icon: <Circle size={14} /> },
  { value: "in_progress", label: "In Progress", color: "text-blue-400",   bar: "#60a5fa", icon: <Clock size={14} /> },
  { value: "on_hold",     label: "On Hold",     color: "text-yellow-400", bar: "#facc15", icon: <PauseCircle size={14} /> },
  { value: "completed",   label: "Completed",   color: "text-green-400",  bar: "#4ade80", icon: <CheckCircle2 size={14} /> },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low",      label: "Low",      color: "text-gray-400" },
  { value: "medium",   label: "Medium",   color: "text-blue-400" },
  { value: "high",     label: "High",     color: "text-orange-400" },
  { value: "critical", label: "Critical", color: "text-red-400" },
];

const KANBAN_COLUMNS: { status: TaskStatus; label: string; color: string; dot: string }[] = [
  { status: "pending",     label: "To Do",       color: "var(--text-muted)", dot: "#6b7280" },
  { status: "in_progress", label: "In Progress", color: "#60a5fa",           dot: "#60a5fa" },
  { status: "on_hold",     label: "On Hold",     color: "#facc15",           dot: "#facc15" },
  { status: "completed",   label: "Done",        color: "#4ade80",           dot: "#4ade80" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusMeta(s: TaskStatus) { return STATUS_OPTIONS.find((o) => o.value === s) ?? STATUS_OPTIONS[0]; }
function priorityMeta(p: TaskPriority) { return PRIORITY_OPTIONS.find((o) => o.value === p) ?? PRIORITY_OPTIONS[0]; }
function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function KanbanSkeleton() {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "4px 0 16px" }}>
      {[1, 2, 3, 4].map((col) => (
        <div key={col} style={{ flex: "0 0 280px", minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div className="skeleton" style={{ width: 10, height: 10, borderRadius: "50%" }} />
            <div className="skeleton" style={{ width: 80, height: 14 }} />
            <div className="skeleton" style={{ width: 22, height: 14, borderRadius: 10 }} />
          </div>
          {[1, 2, 3].slice(0, col === 2 ? 3 : col === 1 ? 2 : 1).map((card) => (
            <div key={card} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="skeleton" style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                  <div className="skeleton" style={{ width: "75%", height: 14 }} />
                  <div className="skeleton" style={{ width: "55%", height: 11 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <div className="skeleton" style={{ width: 40, height: 11, borderRadius: 4 }} />
                    <div className="skeleton" style={{ width: 60, height: 11, borderRadius: 4 }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Task Card ──────────────────────────────────────────────────────────────────

function TaskCard({ task, onOpen, onStatusChange }: {
  task: ProjectTask;
  onOpen: (t: ProjectTask) => void;
  onStatusChange: (taskId: number, status: TaskStatus) => void;
}) {
  const sm = statusMeta(task.status);
  const pm = priorityMeta(task.priority);
  const isOverdue = task.duedate && new Date(task.duedate) < new Date() && task.status !== "completed";

  return (
    <div
      onClick={() => onOpen(task)}
      className="animate-fade-in-up"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "12px 14px",
        cursor: "pointer",
        marginBottom: 10,
        transition: "box-shadow .18s, transform .18s, border-color .18s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,.18)";
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.borderColor = "var(--border-hover, #3a3a3a)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const idx = STATUS_OPTIONS.findIndex((o) => o.value === task.status);
            const next = STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length].value;
            onStatusChange(task.taskid, next);
          }}
          style={{ marginTop: 2, background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", transition: "opacity .15s" }}
          title="Cycle status"
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <span className={sm.color}>{sm.icon}</span>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 500, fontSize: 14, wordBreak: "break-word" }}>{task.title}</p>
          {task.description && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {task.description}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600 }} className={pm.color}>
              <Flag size={11} style={{ display: "inline", marginRight: 3 }} />{pm.label}
            </span>
            {task.duedate && (
              <span style={{ fontSize: 11, color: isOverdue ? "#f87171" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                {isOverdue && <AlertCircle size={11} />}
                <Calendar size={11} />{formatDate(task.duedate)}
              </span>
            )}
            {task.AssignedTo.length > 0 && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                <User2 size={11} />{task.AssignedTo.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── New Task Inline Form ───────────────────────────────────────────────────────

function NewTaskInline({ projectId, status, defaultMembershipId, membershipLoading, notAMember, onCreated, onCancel }: {
  projectId: string; status: TaskStatus; defaultMembershipId: number | null;
  membershipLoading: boolean; notAMember: boolean;
  onCreated: (t: ProjectTask) => void; onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const disabled = membershipLoading || notAMember || !defaultMembershipId;

  const submit = async () => {
    if (!title.trim()) return;
    if (notAMember) { toast.error("You are not a member of this project. Contact an admin to join."); return; }
    if (membershipLoading) { toast.error("Your project membership hasn't loaded yet. Please wait a moment and try again."); return; }
    if (!defaultMembershipId) return; // disabled gate should prevent this; bail silently
    setLoading(true);
    try {
      const t = await createProjectTask({ title: title.trim(), ProjectId: projectId, status, priority: "medium", AssignedTo: [defaultMembershipId] });
      onCreated(t);
    } catch { toast.error("Couldn't create the task. Please try again."); } finally { setLoading(false); }
  };

  const borderColor = notAMember ? "#f87171" : "var(--accent, #22c55e)";
  const placeholder = notAMember
    ? "You are not a member of this project."
    : membershipLoading
    ? "Loading your membership…"
    : "Task title…";

  return (
    <div
      className="animate-slide-in-up"
      style={{ background: "var(--surface)", border: `1px solid ${borderColor}`, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}
    >
      <input
        ref={ref}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
        placeholder={placeholder}
        disabled={disabled}
        style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 14, color: "var(--text-primary)", opacity: disabled ? 0.6 : 1 }}
      />
      {notAMember && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#f87171" }}>
          You are not a member of this project. Contact an admin to join.
        </p>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button onClick={submit} disabled={loading || disabled}
          style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "var(--accent)", color: "#fff", border: "none", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "opacity .15s" }}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : "Add"}
        </button>
        <button onClick={onCancel}
          style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "var(--surface-raised)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-primary)" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Task Detail Drawer ─────────────────────────────────────────────────────────

function TaskDrawer({ task, projectId, onClose, onUpdate, onDelete }: {
  task: ProjectTask; projectId: string;
  onClose: () => void; onUpdate: (u: ProjectTask) => void; onDelete: (id: number) => void;
}) {
  const [checklists, setChecklists] = useState<ProjectTaskCheckList[]>([]);
  const [comments, setComments] = useState<ProjectTaskComment[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<"checklist" | "comments">("checklist");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
    setLoadingChecklist(true);
    getProjectTaskChecklists(task.taskid).then(setChecklists).catch(() => {}).finally(() => setLoadingChecklist(false));
    setLoadingComments(true);
    getProjectTaskComments(task.taskid).then(setComments).catch(() => {}).finally(() => setLoadingComments(false));
  }, [task.taskid]);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task?")) return;
    setDeleting(true);
    try {
      await deleteProjectTask(task.taskid);
      onDelete(task.taskid);
      close();
    } catch {
      toast.error("Couldn't delete the task. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateProjectTask(task.taskid, { title: editTitle, description: editDesc });
      onUpdate(updated); toast.success("Task updated.");
    } catch { toast.error("Couldn't save your changes. Please try again."); } finally { setSaving(false); }
  };

  const changeStatus = async (s: TaskStatus) => {
    try { const u = await updateProjectTask(task.taskid, { status: s }); onUpdate(u); }
    catch { toast.error("Couldn't update status. Please try again."); }
  };

  const changePriority = async (p: TaskPriority) => {
    try { const u = await updateProjectTask(task.taskid, { priority: p }); onUpdate(u); }
    catch { toast.error("Couldn't update priority. Please try again."); }
  };

  const addChecklist = async () => {
    if (!newItem.trim()) return;
    try { const item = await createProjectTaskChecklist({ taskid: task.taskid, item: newItem.trim() }); setChecklists((p) => [...p, item]); setNewItem(""); }
    catch { toast.error("Couldn't add checklist item. Please try again."); }
  };

  const toggleChecklist = async (cl: ProjectTaskCheckList) => {
    try { const u = await updateProjectTaskChecklist(cl.checklistID, { is_done: !cl.is_done }); setChecklists((prev) => prev.map((c) => c.checklistID === cl.checklistID ? u : c)); }
    catch { toast.error("Couldn't update checklist item. Please try again."); }
  };

  const removeChecklist = async (cl: ProjectTaskCheckList) => {
    try { await deleteProjectTaskChecklist(cl.checklistID); setChecklists((prev) => prev.filter((c) => c.checklistID !== cl.checklistID)); }
    catch { toast.error("Couldn't delete checklist item. Please try again."); }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try { const c = await createProjectTaskComment({ taskID: task.taskid, content: newComment.trim() }); setComments((p) => [...p, c]); setNewComment(""); }
    catch { toast.error("Couldn't post comment. Please try again."); } finally { setSubmittingComment(false); }
  };

  const done = checklists.filter((c) => c.is_done).length;
  const pct = checklists.length ? Math.round((done / checklists.length) * 100) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "stretch" }}>
      {/* Backdrop */}
      <div
        style={{ flex: 1, background: `rgba(0,0,0,${visible ? .45 : 0})`, transition: "background .3s" }}
        onClick={close}
      />
      {/* Drawer panel */}
      <div style={{
        width: "min(520px, 96vw)",
        background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform .32s cubic-bezier(0.32,0.72,0,1)",
        boxShadow: "-12px 0 40px rgba(0,0,0,.25)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Task Detail</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ background: "none", border: "none", cursor: deleting ? "not-allowed" : "pointer", color: "#f87171", padding: 4, borderRadius: 6, transition: "background .15s", opacity: deleting ? 0.6 : 1 }}
              onMouseEnter={(e) => { if (!deleting) e.currentTarget.style.background = "rgba(248,113,113,.1)"; }}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
            <button
              onClick={close}
              disabled={deleting}
              style={{ background: "none", border: "none", cursor: deleting ? "not-allowed" : "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6, transition: "background .15s", opacity: deleting ? 0.6 : 1 }}
              onMouseEnter={(e) => { if (!deleting) e.currentTarget.style.background = "var(--surface-raised)"; }}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
          {/* Status colour bar */}
          <div style={{ height: 3, borderRadius: 3, background: statusMeta(task.status).bar, transition: "background .3s" }} />

          {/* Title */}
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            style={{ fontSize: 18, fontWeight: 600, background: "none", border: "none", outline: "none", width: "100%", color: "var(--text-primary)", borderBottom: "1px solid transparent", transition: "border-color .2s", padding: "2px 0" }}
            onFocus={(e) => (e.currentTarget.style.borderBottomColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderBottomColor = "transparent")}
          />

          {/* Status + Priority row */}
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { value: task.status, options: STATUS_OPTIONS, onChange: (v: string) => changeStatus(v as TaskStatus) },
              { value: task.priority, options: PRIORITY_OPTIONS, onChange: (v: string) => changePriority(v as TaskPriority) },
            ].map((sel, i) => (
              <select key={i} value={sel.value} onChange={(e) => sel.onChange(e.target.value)}
                style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-raised)", color: "var(--text-primary)", fontSize: 13, cursor: "pointer", transition: "border-color .2s" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                {sel.options.map((o: { value: string; label: string }) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ))}
          </div>

          {/* Description */}
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Add description…"
            rows={3}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-raised)", color: "var(--text-primary)", fontSize: 13, resize: "vertical", boxSizing: "border-box", transition: "border-color .2s" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />

          {/* Meta */}
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
            {task.duedate && <span><Calendar size={12} style={{ display: "inline", marginRight: 4 }} />{formatDate(task.duedate)}</span>}
            {task.role && <span>{task.role.name}</span>}
            {task.AssignedTo.length > 0 && <span>{task.AssignedTo.map((a) => a.user.full_name ?? a.user.email).join(", ")}</span>}
          </div>

          <button onClick={save} disabled={saving}
            style={{ alignSelf: "flex-start", padding: "7px 18px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "opacity .15s, transform .15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : "Save changes"}
          </button>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)" }}>
            {(["checklist", "comments"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: "8px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === t ? 600 : 400,
                  borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                  color: tab === t ? "var(--text-primary)" : "var(--text-muted)", textTransform: "capitalize",
                  transition: "color .15s" }}>
                {t === "checklist"
                  ? <><CheckSquare size={13} style={{ display: "inline", marginRight: 5 }} />Checklist{checklists.length > 0 ? ` (${done}/${checklists.length})` : ""}</>
                  : <><MessageSquare size={13} style={{ display: "inline", marginRight: 5 }} />Comments{comments.length > 0 ? ` (${comments.length})` : ""}</>}
              </button>
            ))}
          </div>

          {/* Checklist tab */}
          {tab === "checklist" && (
            <div>
              {checklists.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                    <span>{done} of {checklists.length} done</span>
                    <span>{pct}%</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 4, background: "var(--border)", marginBottom: 12, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "#4ade80", borderRadius: 4, transition: "width .4s cubic-bezier(0.34,1.56,0.64,1)" }} />
                  </div>
                  {loadingChecklist ? <Loader2 size={16} className="animate-spin" /> : (
                    <div className="stagger">
                      {checklists.map((cl) => (
                        <div key={cl.checklistID} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--border)", transition: "opacity .2s" }}>
                          <button onClick={() => toggleChecklist(cl)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: cl.is_done ? "#4ade80" : "var(--text-muted)", padding: 0, flexShrink: 0, transition: "color .2s, transform .15s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                          >
                            {cl.is_done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                          </button>
                          <span style={{ flex: 1, fontSize: 13, textDecoration: cl.is_done ? "line-through" : "none", color: cl.is_done ? "var(--text-muted)" : "var(--text-primary)", transition: "color .2s" }}>
                            {cl.item}
                          </span>
                          <button onClick={() => removeChecklist(cl)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, flexShrink: 0, opacity: 0.5, transition: "opacity .15s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addChecklist()}
                  placeholder="Add checklist item…"
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-raised)", color: "var(--text-primary)", fontSize: 13, transition: "border-color .2s" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
                <button onClick={addChecklist}
                  style={{ padding: "7px 14px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, transition: "opacity .15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Comments tab */}
          {tab === "comments" && (
            <div>
              {loadingComments ? <Loader2 size={16} className="animate-spin" /> : (
                <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                  {comments.length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>No comments yet.</p>}
                  {comments.map((c) => (
                    <div key={c.commentID} style={{ padding: "10px 12px", background: "var(--surface-raised)", borderRadius: 10, border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{c.name ?? c.memberid?.user?.full_name ?? c.memberid?.user?.email ?? "User"}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13 }}>{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()}
                  placeholder="Add a comment…"
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-raised)", color: "var(--text-primary)", fontSize: 13, transition: "border-color .2s" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
                <button onClick={addComment} disabled={submittingComment}
                  style={{ padding: "7px 14px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, transition: "opacity .15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  {submittingComment ? <Loader2 size={12} className="animate-spin" /> : "Post"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [addingIn, setAddingIn] = useState<TaskStatus | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [myMembershipId, setMyMembershipId] = useState<number | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[] | null>(null);
  const { canDo } = useProjectPermissions(projectId);
  const canCreateTask = canDo("task:create");
  const { profile, loading: userLoading } = useUserInfo();
  const currentUserId = profile?.id ?? null;

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([getProjectTasks(projectId), getProject(projectId)])
      .then(([taskList, project]) => {
        setTasks(taskList);
        const members: ProjectMember[] = (project.members ?? []) as ProjectMember[];
        setProjectMembers(members);
      })
      .catch(() => toast.error("Couldn't load tasks. Please refresh."))
      .finally(() => setLoading(false));
  }, [projectId]);

  // Resolve the logged-in user's membership once both profile and members are loaded.
  useEffect(() => {
    if (currentUserId === null || projectMembers === null) {
      setMyMembershipId(null);
      return;
    }
    const currentUserIdStr = String(currentUserId);
    const mine = projectMembers.find(
      (m) => m.is_active && String(m.user?.id) === currentUserIdStr
    );
    setMyMembershipId(mine?.id ?? null);
  }, [currentUserId, projectMembers]);

  const membershipLoading = userLoading || projectMembers === null;
  const isProjectMember = myMembershipId !== null;
  const notAMember = !membershipLoading && !isProjectMember;

  const handleCreate = (t: ProjectTask) => { setTasks((p) => [t, ...p]); setAddingIn(null); };
  const handleUpdate = (u: ProjectTask) => { setTasks((p) => p.map((t) => t.taskid === u.taskid ? u : t)); setSelectedTask(u); };
  const handleDelete = (id: number) => { setTasks((p) => p.filter((t) => t.taskid !== id)); };
  const handleStatusChange = async (taskId: number, status: TaskStatus) => {
    try {
      const u = await updateProjectTask(taskId, { status });
      setTasks((p) => p.map((t) => t.taskid === taskId ? u : t));
      if (selectedTask?.taskid === taskId) setSelectedTask(u);
    } catch { toast.error("Couldn't update task status. Please try again."); }
  };

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const renderKanban = () => (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", overflowX: "auto", padding: "4px 0 16px" }}>
      {KANBAN_COLUMNS.map((col) => {
        const colTasks = filtered.filter((t) => t.status === col.status);
        return (
          <div key={col.status} style={{ flex: "0 0 280px", minWidth: 280 }}>
            {/* Column header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: col.dot, display: "inline-block", boxShadow: `0 0 6px ${col.dot}80` }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{col.label}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--surface-raised)", borderRadius: 10, padding: "1px 7px" }}>{colTasks.length}</span>
              </div>
              {canCreateTask && (
                <button
                  onClick={() => setAddingIn(col.status)}
                  disabled={membershipLoading || notAMember}
                  style={{ background: "none", border: "none", cursor: (membershipLoading || notAMember) ? "not-allowed" : "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6, opacity: (membershipLoading || notAMember) ? 0.4 : 1, transition: "color .15s, background .15s" }}
                  onMouseEnter={(e) => { if (!membershipLoading && !notAMember) { e.currentTarget.style.color = col.color; e.currentTarget.style.background = "var(--surface-raised)"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "none"; }}
                  title={notAMember ? "You are not a member of this project" : membershipLoading ? "Loading your membership…" : "Add task"}
                >
                  <Plus size={15} />
                </button>
              )}
            </div>

            {addingIn === col.status && (
              <NewTaskInline
                projectId={projectId}
                status={col.status}
                defaultMembershipId={myMembershipId}
                membershipLoading={membershipLoading}
                notAMember={notAMember}
                onCreated={handleCreate}
                onCancel={() => setAddingIn(null)}
              />
            )}

            {colTasks.map((t) => (
              <TaskCard key={t.taskid} task={t} onOpen={setSelectedTask} onStatusChange={handleStatusChange} />
            ))}

            {colTasks.length === 0 && addingIn !== col.status && (
              <div style={{ border: "2px dashed var(--border)", borderRadius: 10, padding: "28px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13, transition: "border-color .2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = col.dot + "60")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                No tasks
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderList = () => (
    <div className="animate-fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 100px 110px", gap: 12, padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
        <span>Title</span><span>Status</span><span>Priority</span><span>Due Date</span>
      </div>
      {filtered.length === 0 && (
        <div style={{ padding: "48px 16px", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No tasks yet.</p>
          {canCreateTask && <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>Use the <strong>New Task</strong> button above to get started.</p>}
        </div>
      )}
      <div className="stagger">
        {filtered.map((t) => {
          const sm = statusMeta(t.status);
          const pm = priorityMeta(t.priority);
          return (
            <div key={t.taskid} onClick={() => setSelectedTask(t)}
              style={{ display: "grid", gridTemplateColumns: "1fr 110px 100px 110px", gap: 12, padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid var(--border)", alignItems: "center", transition: "background .15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{t.title}</span>
              <span style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }} className={sm.color}>{sm.icon}{sm.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }} className={pm.color}>{pm.label}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDate(t.duedate) ?? "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Toolbar */}
      <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px 12px", flexShrink: 0, borderBottom: "1px solid var(--border)" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Tasks</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            {loading ? "Loading…" : `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, cursor: "pointer" }}>
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {(["kanban", "list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: "6px 12px", fontSize: 12, background: view === v ? "var(--accent)" : "var(--surface)", color: view === v ? "#fff" : "var(--text-muted)", border: "none", cursor: "pointer", textTransform: "capitalize", transition: "background .2s, color .2s" }}>
                {v}
              </button>
            ))}
          </div>
          {canCreateTask && (
            <button
              data-tour="tasks-add-btn"
              onClick={() => setAddingIn(filter === "all" ? "pending" : filter)}
              disabled={membershipLoading || notAMember}
              title={notAMember ? "You are not a member of this project" : membershipLoading ? "Loading your membership…" : "Add a new task"}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", cursor: (membershipLoading || notAMember) ? "not-allowed" : "pointer", opacity: (membershipLoading || notAMember) ? 0.5 : 1, fontSize: 13, fontWeight: 500, transition: "opacity .15s, transform .15s" }}
              onMouseEnter={(e) => { if (!membershipLoading && !notAMember) e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={(e) => { if (!membershipLoading && !notAMember) e.currentTarget.style.opacity = "1"; }}
            >
              <Plus size={15} />New Task
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div data-tour="tasks-board" style={{ flex: 1, overflow: "auto", padding: "0 24px" }}>
        {loading ? <KanbanSkeleton /> : view === "kanban" ? renderKanban() : renderList()}
      </div>

      {selectedTask && (
        <TaskDrawer task={selectedTask} projectId={projectId} onClose={() => setSelectedTask(null)} onUpdate={handleUpdate} onDelete={handleDelete} />
      )}
    </div>
  );
}
