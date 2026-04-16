"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Plus, Loader2, X, ChevronDown, ChevronUp, Check, Trash2,
  MessageSquare, CheckSquare, Calendar, Flag, User2, Circle,
  AlertCircle, Clock, CheckCircle2, PauseCircle,
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

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { value: "pending",     label: "Pending",     color: "text-gray-400",   icon: <Circle size={14} /> },
  { value: "in_progress", label: "In Progress", color: "text-blue-400",   icon: <Clock size={14} /> },
  { value: "on_hold",     label: "On Hold",     color: "text-yellow-400", icon: <PauseCircle size={14} /> },
  { value: "completed",   label: "Completed",   color: "text-green-400",  icon: <CheckCircle2 size={14} /> },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low",      label: "Low",      color: "text-gray-400" },
  { value: "medium",   label: "Medium",   color: "text-blue-400" },
  { value: "high",     label: "High",     color: "text-orange-400" },
  { value: "critical", label: "Critical", color: "text-red-400" },
];

const KANBAN_COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "pending",     label: "To Do",       color: "var(--text-muted)" },
  { status: "in_progress", label: "In Progress", color: "#60a5fa" },
  { status: "on_hold",     label: "On Hold",     color: "#facc15" },
  { status: "completed",   label: "Done",        color: "#4ade80" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusMeta(s: TaskStatus) {
  return STATUS_OPTIONS.find((o) => o.value === s) ?? STATUS_OPTIONS[0];
}

function priorityMeta(p: TaskPriority) {
  return PRIORITY_OPTIONS.find((o) => o.value === p) ?? PRIORITY_OPTIONS[0];
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ── Task Card ──────────────────────────────────────────────────────────────────

function TaskCard({
  task, onOpen, onStatusChange,
}: {
  task: ProjectTask;
  onOpen: (t: ProjectTask) => void;
  onStatusChange: (taskId: number, status: TaskStatus) => void;
}) {
  const sm = statusMeta(task.status);
  const pm = priorityMeta(task.priority);

  return (
    <div
      onClick={() => onOpen(task)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "box-shadow .15s",
        marginBottom: 10,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.15)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        {/* Status toggle dot */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const idx = STATUS_OPTIONS.findIndex((o) => o.value === task.status);
            const next = STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length].value;
            onStatusChange(task.taskid, next);
          }}
          style={{ marginTop: 2, background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit" }}
          title="Cycle status"
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
              <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
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

// ── New Task Form (inline) ─────────────────────────────────────────────────────

function NewTaskInline({ projectId, status, defaultMembershipId, onCreated, onCancel }: {
  projectId: string; status: TaskStatus; defaultMembershipId: number | null;
  onCreated: (t: ProjectTask) => void; onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const submit = async () => {
    if (!title.trim()) return;
    if (!defaultMembershipId) { toast.error("Project membership not loaded yet."); return; }
    setLoading(true);
    try {
      const t = await createProjectTask({
        title: title.trim(), ProjectId: projectId, status,
        priority: "medium", AssignedTo: [defaultMembershipId],
      });
      onCreated(t);
    } catch {
      toast.error("Failed to create task.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
      <input
        ref={ref}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
        placeholder="Task title…"
        style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 14, color: "var(--text-primary)" }}
      />
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button onClick={submit} disabled={loading} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer" }}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : "Add"}
        </button>
        <button onClick={onCancel} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "var(--bg-secondary)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-primary)" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Task Detail Drawer ─────────────────────────────────────────────────────────

function TaskDrawer({ task, projectId, onClose, onUpdate, onDelete }: {
  task: ProjectTask;
  projectId: string;
  onClose: () => void;
  onUpdate: (updated: ProjectTask) => void;
  onDelete: (taskId: number) => void;
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
  const [tab, setTab] = useState<"checklist" | "comments">("checklist");

  useEffect(() => {
    setLoadingChecklist(true);
    getProjectTaskChecklists(task.taskid).then(setChecklists).catch(() => {}).finally(() => setLoadingChecklist(false));
    setLoadingComments(true);
    getProjectTaskComments(task.taskid).then(setComments).catch(() => {}).finally(() => setLoadingComments(false));
  }, [task.taskid]);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateProjectTask(task.taskid, { title: editTitle, description: editDesc });
      onUpdate(updated);
      toast.success("Task saved.");
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (s: TaskStatus) => {
    try {
      const updated = await updateProjectTask(task.taskid, { status: s });
      onUpdate(updated);
    } catch { toast.error("Failed to update status."); }
  };

  const changePriority = async (p: TaskPriority) => {
    try {
      const updated = await updateProjectTask(task.taskid, { priority: p });
      onUpdate(updated);
    } catch { toast.error("Failed to update priority."); }
  };

  const addChecklist = async () => {
    if (!newItem.trim()) return;
    try {
      const item = await createProjectTaskChecklist({ taskid: task.taskid, item: newItem.trim() });
      setChecklists((p) => [...p, item]);
      setNewItem("");
    } catch { toast.error("Failed to add checklist item."); }
  };

  const toggleChecklist = async (cl: ProjectTaskCheckList) => {
    try {
      const updated = await updateProjectTaskChecklist(cl.checklistID, { is_done: !cl.is_done });
      setChecklists((prev) => prev.map((c) => c.checklistID === cl.checklistID ? updated : c));
    } catch { toast.error("Failed to update."); }
  };

  const removeChecklist = async (cl: ProjectTaskCheckList) => {
    try {
      await deleteProjectTaskChecklist(cl.checklistID);
      setChecklists((prev) => prev.filter((c) => c.checklistID !== cl.checklistID));
    } catch { toast.error("Failed to delete."); }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const comment = await createProjectTaskComment({ taskID: task.taskid, content: newComment.trim() });
      setComments((p) => [...p, comment]);
      setNewComment("");
    } catch { toast.error("Failed to add comment."); } finally { setSubmittingComment(false); }
  };

  const done = checklists.filter((c) => c.is_done).length;
  const pct = checklists.length ? Math.round((done / checklists.length) * 100) : 0;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "stretch",
    }}>
      {/* Backdrop */}
      <div style={{ flex: 1, background: "rgba(0,0,0,.4)" }} onClick={onClose} />
      {/* Drawer */}
      <div style={{
        width: "min(520px, 96vw)",
        background: "var(--bg-primary)",
        borderLeft: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Task Detail</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { if (confirm("Delete this task?")) { deleteProjectTask(task.taskid); onDelete(task.taskid); onClose(); } }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: 4 }}>
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Title */}
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            style={{ fontSize: 18, fontWeight: 600, background: "none", border: "none", outline: "none", width: "100%", color: "var(--text-primary)" }}
          />

          {/* Status + Priority row */}
          <div style={{ display: "flex", gap: 10 }}>
            <select value={task.status} onChange={(e) => changeStatus(e.target.value as TaskStatus)}
              style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, cursor: "pointer" }}>
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={task.priority} onChange={(e) => changePriority(e.target.value as TaskPriority)}
              style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, cursor: "pointer" }}>
              {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {/* Description */}
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Add description…"
            rows={3}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
          />

          {/* Meta row */}
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)" }}>
            {task.duedate && <span><Calendar size={12} style={{ display: "inline", marginRight: 4 }} />{formatDate(task.duedate)}</span>}
            {task.role && <span>{task.role.name}</span>}
            {task.AssignedTo.length > 0 && (
              <span>{task.AssignedTo.map((a) => a.user.full_name ?? a.user.email).join(", ")}</span>
            )}
          </div>

          <button onClick={save} disabled={saving}
            style={{ alignSelf: "flex-start", padding: "6px 16px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13 }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : "Save changes"}
          </button>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)" }}>
            {(["checklist", "comments"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: "8px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === t ? 600 : 400,
                  borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                  color: tab === t ? "var(--text-primary)" : "var(--text-muted)", textTransform: "capitalize" }}>
                {t === "checklist" ? <><CheckSquare size={13} style={{ display: "inline", marginRight: 5 }} />Checklist{checklists.length > 0 ? ` (${done}/${checklists.length})` : ""}</>
                  : <><MessageSquare size={13} style={{ display: "inline", marginRight: 5 }} />Comments{comments.length > 0 ? ` (${comments.length})` : ""}</>}
              </button>
            ))}
          </div>

          {/* Checklist tab */}
          {tab === "checklist" && (
            <div>
              {checklists.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ height: 4, borderRadius: 4, background: "var(--border)", marginBottom: 10 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "#4ade80", borderRadius: 4, transition: "width .3s" }} />
                  </div>
                  {loadingChecklist ? <Loader2 size={16} className="animate-spin" /> : checklists.map((cl) => (
                    <div key={cl.checklistID} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <button onClick={() => toggleChecklist(cl)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: cl.is_done ? "#4ade80" : "var(--text-muted)", padding: 0, flexShrink: 0 }}>
                        {cl.is_done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      </button>
                      <span style={{ flex: 1, fontSize: 13, textDecoration: cl.is_done ? "line-through" : "none", color: cl.is_done ? "var(--text-muted)" : "var(--text-primary)" }}>
                        {cl.item}
                      </span>
                      <button onClick={() => removeChecklist(cl)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, flexShrink: 0 }}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input value={newItem} onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addChecklist()}
                  placeholder="Add checklist item…"
                  style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13 }} />
                <button onClick={addChecklist}
                  style={{ padding: "6px 12px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13 }}>
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Comments tab */}
          {tab === "comments" && (
            <div>
              {loadingComments ? <Loader2 size={16} className="animate-spin" /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                  {comments.length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>No comments yet.</p>}
                  {comments.map((c) => (
                    <div key={c.commentID} style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
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
                <input value={newComment} onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addComment()}
                  placeholder="Add a comment…"
                  style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13 }} />
                <button onClick={addComment} disabled={submittingComment}
                  style={{ padding: "6px 12px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13 }}>
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

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      getProjectTasks(projectId),
      getProject(projectId),
    ]).then(([taskList, project]) => {
      setTasks(taskList);
      // Extract current user's membership ID from project members
      const members: any[] = project.members ?? [];
      if (members.length > 0) {
        // members[].membership_id is the ID we need for AssignedTo
        const firstMember = members[0];
        const mid = firstMember.membership_id ?? firstMember.id ?? null;
        if (mid) setMyMembershipId(mid);
      }
    }).catch(() => toast.error("Failed to load tasks.")).finally(() => setLoading(false));
  }, [projectId]);

  const handleCreate = (t: ProjectTask) => {
    setTasks((prev) => [t, ...prev]);
    setAddingIn(null);
  };

  const handleUpdate = (updated: ProjectTask) => {
    setTasks((prev) => prev.map((t) => t.taskid === updated.taskid ? updated : t));
    setSelectedTask(updated);
  };

  const handleDelete = (taskId: number) => {
    setTasks((prev) => prev.filter((t) => t.taskid !== taskId));
  };

  const handleStatusChange = async (taskId: number, status: TaskStatus) => {
    try {
      const updated = await updateProjectTask(taskId, { status });
      setTasks((prev) => prev.map((t) => t.taskid === taskId ? updated : t));
      if (selectedTask?.taskid === taskId) setSelectedTask(updated);
    } catch { toast.error("Failed to update status."); }
  };

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  // ── Kanban View ──
  const renderKanban = () => (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", overflowX: "auto", padding: "4px 0 16px" }}>
      {KANBAN_COLUMNS.map((col) => {
        const colTasks = filtered.filter((t) => t.status === col.status);
        return (
          <div key={col.status} style={{ flex: "0 0 280px", minWidth: 280 }}>
            {/* Column header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: col.color, display: "inline-block" }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{col.label}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--surface)", borderRadius: 10, padding: "1px 7px" }}>{colTasks.length}</span>
              </div>
              <button onClick={() => setAddingIn(col.status)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, borderRadius: 4 }}
                title="Add task">
                <Plus size={15} />
              </button>
            </div>
            {/* Inline add */}
            {addingIn === col.status && (
              <NewTaskInline projectId={projectId} status={col.status} defaultMembershipId={myMembershipId} onCreated={handleCreate} onCancel={() => setAddingIn(null)} />
            )}
            {/* Cards */}
            {colTasks.map((t) => (
              <TaskCard key={t.taskid} task={t} onOpen={setSelectedTask} onStatusChange={handleStatusChange} />
            ))}
            {colTasks.length === 0 && addingIn !== col.status && (
              <div style={{ border: "2px dashed var(--border)", borderRadius: 10, padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                No tasks
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── List View ──
  const renderList = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 100px 110px", gap: 12, padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
        <span>Title</span><span>Status</span><span>Priority</span><span>Due Date</span>
      </div>
      {filtered.length === 0 && <p style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No tasks yet.</p>}
      {filtered.map((t) => {
        const sm = statusMeta(t.status);
        const pm = priorityMeta(t.priority);
        return (
          <div key={t.taskid} onClick={() => setSelectedTask(t)}
            style={{ display: "grid", gridTemplateColumns: "1fr 110px 100px 110px", gap: 12, padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid var(--border)", alignItems: "center" }}
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
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px 12px", flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Tasks</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Filter */}
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, cursor: "pointer" }}>
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {/* View toggle */}
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {(["kanban", "list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: "6px 12px", fontSize: 12, background: view === v ? "var(--accent)" : "var(--surface)", color: view === v ? "#fff" : "var(--text-muted)", border: "none", cursor: "pointer", textTransform: "capitalize" }}>
                {v}
              </button>
            ))}
          </div>
          {/* Add task */}
          <button onClick={() => setAddingIn("pending")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            <Plus size={15} />New Task
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 24px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : view === "kanban" ? renderKanban() : renderList()}
      </div>

      {/* Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          projectId={projectId}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
