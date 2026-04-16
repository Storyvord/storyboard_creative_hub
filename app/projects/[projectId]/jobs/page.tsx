"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Loader2, X, MapPin, DollarSign, Briefcase, Users, Calendar, Trash2, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-toastify";
import { getProjectJobs, createJob, deleteJob, getJobApplicants, ProjectJob, JobApplicant, JobType, JobMode } from "@/services/jobs";

// ── Constants ──────────────────────────────────────────────────────────────────

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
];

const JOB_MODES: { value: JobMode; label: string }[] = [
  { value: "onsite", label: "On Site" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
];

// ── New Job Modal ──────────────────────────────────────────────────────────────

function NewJobModal({ projectId, onCreated, onClose }: {
  projectId: string; onCreated: (j: ProjectJob) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    description: "", roles: "", rates: "", date: "", location: "",
    job_type: "freelance" as JobType, job_mode: "onsite" as JobMode, experience_required: 0,
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.description.trim() || !form.roles.trim() || !form.rates.trim() || !form.date || !form.location.trim()) {
      toast.error("Fill all required fields."); return;
    }
    setLoading(true);
    try {
      const job = await createJob({ ...form, project: projectId });
      onCreated(job);
      toast.success("Job posted!");
    } catch { toast.error("Failed to post job."); }
    finally { setLoading(false); }
  };

  const field = (label: string, key: string, type = "text", placeholder = "") => (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{label}</label>
      <input type={type} value={(form as any)[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box" }} />
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "min(560px, 96vw)", background: "var(--bg-primary)", borderRadius: 16, border: "1px solid var(--border)", padding: 24, display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Post a Job</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={18} /></button>
        </div>

        {field("Role / Position *", "roles", "text", "e.g. Camera Operator")}
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Description *</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Describe the job requirements…"
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {field("Rate / Compensation *", "rates", "text", "e.g. $500/day")}
          {field("Location *", "location", "text", "e.g. Mumbai")}
          {field("Date *", "date", "date")}
          {field("Experience (years)", "experience_required", "number")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Job Type</label>
            <select value={form.job_type} onChange={(e) => set("job_type", e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box" }}>
              {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Job Mode</label>
            <select value={form.job_mode} onChange={(e) => set("job_mode", e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box" }}>
              {JOB_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={submit} disabled={loading}
            style={{ padding: "8px 20px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : "Post Job"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Job Card ───────────────────────────────────────────────────────────────────

function JobCard({ job, onDelete }: { job: ProjectJob; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [applicants, setApplicants] = useState<JobApplicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  const toggleExpand = async () => {
    if (!expanded && applicants.length === 0) {
      setLoadingApplicants(true);
      getJobApplicants(job.id).then(setApplicants).catch(() => {}).finally(() => setLoadingApplicants(false));
    }
    setExpanded(!expanded);
  };

  const typeLabel = JOB_TYPES.find((t) => t.value === job.job_type)?.label ?? job.job_type;
  const modeLabel = JOB_MODES.find((m) => m.value === job.job_mode)?.label ?? job.job_mode;

  return (
    <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{job.roles}</h3>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>{typeLabel}</span>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>{modeLabel}</span>
              {!job.is_accepting && (
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "rgba(248,113,113,.12)", color: "#f87171" }}>Closed</span>
              )}
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{job.description}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "var(--text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} />{job.location}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><DollarSign size={12} />{job.rates}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} />{new Date(job.date).toLocaleDateString()}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={12} />{job.number_of_applicants} applicant{job.number_of_applicants !== 1 ? "s" : ""}</span>
              {job.experience_required > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Briefcase size={12} />{job.experience_required}yr exp</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginLeft: 12, flexShrink: 0 }}>
            <button onClick={toggleExpand}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Applicants
            </button>
            <button onClick={() => { if (confirm("Delete this job posting?")) onDelete(job.id); }}
              style={{ padding: 6, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "#f87171", cursor: "pointer" }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 20px", background: "var(--surface)" }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600 }}>Applicants ({applicants.length})</p>
          {loadingApplicants ? <Loader2 size={16} className="animate-spin" /> : applicants.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No applicants yet.</p>
          ) : applicants.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                {(a.user.full_name ?? a.user.email)[0].toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{a.user.full_name ?? a.user.email}</p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>{new Date(a.applied_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [jobs, setJobs] = useState<ProjectJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    getProjectJobs(projectId).then(setJobs).catch(() => toast.error("Failed to load jobs.")).finally(() => setLoading(false));
  }, [projectId]);

  const handleCreated = (job: ProjectJob) => {
    setJobs((prev) => [job, ...prev]);
    setShowModal(false);
  };

  const handleDelete = async (jobId: string) => {
    try {
      await deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      toast.success("Job deleted.");
    } catch { toast.error("Failed to delete job."); }
  };

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
              <Briefcase size={22} />Jobs
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{jobs.length} posting{jobs.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => setShowModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Plus size={15} />Post Job
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)" }}>
            <Briefcase size={40} style={{ opacity: 0.2, margin: "0 auto 16px" }} />
            <p style={{ fontSize: 15, fontWeight: 500 }}>No job postings yet.</p>
            <p style={{ fontSize: 13 }}>Post a job to find crew for your project.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {jobs.map((job) => <JobCard key={job.id} job={job} onDelete={handleDelete} />)}
          </div>
        )}
      </div>

      {showModal && <NewJobModal projectId={projectId} onCreated={handleCreated} onClose={() => setShowModal(false)} />}
    </div>
  );
}
