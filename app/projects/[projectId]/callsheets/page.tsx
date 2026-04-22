"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Plus, Calendar, Clock, MapPin, Trash2, Pencil, X, Sparkles, FileText } from "lucide-react";
import { toast } from "react-toastify";
import { getCallSheets, createCallSheet, updateCallSheet, deleteCallSheet } from "@/services/project";
import { CallSheet } from "@/types/project";
import api from "@/services/api";

interface FormState {
  title: string;
  date: string;
  calltime: string;
  location: string;
  nearest_hospital_address: string;
  nearest_police_station: string;
  nearest_fire_station: string;
  additional_notes: string;
  production_notes: string;
}

const EMPTY_FORM: FormState = {
  title: "", date: "", calltime: "", location: "",
  nearest_hospital_address: "", nearest_police_station: "", nearest_fire_station: "",
  additional_notes: "", production_notes: "",
};

function CallSheetForm({
  initial,
  onSubmit,
  onCancel,
  saving,
}: {
  initial?: FormState;
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial ?? EMPTY_FORM);
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="p-5 rounded-lg border space-y-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Title <span className="text-red-400">*</span></label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Date</label>
          <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Call Time</label>
          <input type="time" value={form.calltime} onChange={(e) => set("calltime", e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Location</label>
          <input value={form.location} onChange={(e) => set("location", e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Nearest Hospital</label>
          <input value={form.nearest_hospital_address} onChange={(e) => set("nearest_hospital_address", e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Nearest Police Station</label>
          <input value={form.nearest_police_station} onChange={(e) => set("nearest_police_station", e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Nearest Fire Station</label>
          <input value={form.nearest_fire_station} onChange={(e) => set("nearest_fire_station", e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Additional Notes</label>
          <textarea value={form.additional_notes} onChange={(e) => set("additional_notes", e.target.value)} rows={3} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Production Notes</label>
          <textarea value={form.production_notes} onChange={(e) => set("production_notes", e.target.value)} rows={3} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm" style={{ color: "var(--text-secondary)" }}>Cancel</button>
        <button
          onClick={() => {
            if (!form.title.trim()) { toast.error("Title is required."); return; }
            onSubmit(form);
          }}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );
}

export default function CallsheetsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [callsheets, setCallsheets] = useState<CallSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [selected, setSelected] = useState<CallSheet | null>(null);
  const [editMode, setEditMode] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getCallSheets(projectId);
      setCallsheets(data);
    } catch {
      toast.error("Failed to load callsheets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const handleCreate = async (form: FormState) => {
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    setSaving(true);
    try {
      const cs = await createCallSheet(projectId, {
        title: form.title.trim(),
        date: form.date || null,
        calltime: form.calltime || null,
        location: form.location,
        nearest_hospital_address: form.nearest_hospital_address,
        nearest_police_station: form.nearest_police_station,
        nearest_fire_station: form.nearest_fire_station,
        additional_notes: form.additional_notes || null,
        production_notes: form.production_notes || null,
      });
      setCallsheets((prev) => [cs, ...prev]);
      setShowForm(false);
      toast.success("Callsheet created!");
    } catch (e: any) {
      const msg = Object.values(e?.response?.data || {}).flat().join(' ') || "Failed to create callsheet.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (form: FormState) => {
    if (!selected) return;
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    setSaving(true);
    try {
      const updated = await updateCallSheet(selected.id, {
        title: form.title.trim(),
        date: form.date || null,
        calltime: form.calltime || null,
        location: form.location,
        nearest_hospital_address: form.nearest_hospital_address,
        nearest_police_station: form.nearest_police_station,
        nearest_fire_station: form.nearest_fire_station,
        additional_notes: form.additional_notes || null,
        production_notes: form.production_notes || null,
      });
      setCallsheets((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      setSelected(updated);
      setEditMode(false);
      toast.success("Callsheet updated!");
    } catch (e: any) {
      const msg = Object.values(e?.response?.data || {}).flat().join(' ') || "Failed to update callsheet.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this callsheet?")) return;
    try {
      await deleteCallSheet(id);
      setCallsheets((prev) => prev.filter((c) => c.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success("Callsheet deleted.");
    } catch {
      toast.error("Failed to delete callsheet.");
    }
  };

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    try {
      const res = await api.post(`/api/callsheets/${projectId}/generate/`);
      toast.success(res?.data?.message ?? "Callsheet generated successfully!");
      await load();
    } catch (e: any) {
      const errData = e?.response?.data;
      const msg = errData?.error ?? errData?.detail ?? errData?.message ?? "AI generation failed.";
      toast.error(msg);
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin h-6 w-6" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Callsheets</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAiGenerate}
            disabled={aiGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 border text-sm font-medium rounded-md transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
            style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-secondary)" }}
          >
            {aiGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            AI Generate
          </button>
          <button
            onClick={() => { setShowForm(true); setSelected(null); setEditMode(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus size={13} /> New Callsheet
          </button>
        </div>
      </div>

      {showForm && (
        <CallSheetForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {callsheets.length === 0 && !showForm ? (
        <div className="flex flex-col items-center gap-2 py-16" style={{ color: "var(--text-muted)" }}>
          <Calendar size={36} className="opacity-40" />
          <p className="text-sm">No callsheets yet. Create one or use AI Generate.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {callsheets.map((cs) => (
            <div
              key={cs.id}
              onClick={() => { setSelected(cs); setEditMode(false); setShowForm(false); }}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${selected?.id === cs.id ? "border-emerald-500/40 bg-emerald-500/5" : "hover:border-[var(--border-hover)]"}`}
              style={selected?.id !== cs.id ? { borderColor: "var(--border)", background: "var(--surface)" } : undefined}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{cs.title}</h3>
                {cs.ai_generated && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <Sparkles size={10} /> AI
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                {cs.date && <span className="flex items-center gap-1"><Calendar size={11} />{cs.date}</span>}
                {cs.calltime && <span className="flex items-center gap-1"><Clock size={11} />{cs.calltime}</span>}
                {cs.location && <span className="flex items-center gap-1"><MapPin size={11} />{cs.location}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail view */}
      {selected && !showForm && (
        <div className="mt-6 p-6 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{selected.title}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditMode(!editMode)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm transition-colors hover:border-emerald-500/50"
                style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-secondary)" }}
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                onClick={() => handleDelete(selected.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm transition-colors hover:border-red-500/50 hover:text-red-400"
                style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-secondary)" }}
              >
                <Trash2 size={13} /> Delete
              </button>
              <button onClick={() => setSelected(null)} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
            </div>
          </div>

          {editMode ? (
            <CallSheetForm
              initial={{
                title: selected.title,
                date: selected.date ?? "",
                calltime: selected.calltime ?? "",
                location: selected.location ?? "",
                nearest_hospital_address: selected.nearest_hospital_address ?? "",
                nearest_police_station: selected.nearest_police_station ?? "",
                nearest_fire_station: selected.nearest_fire_station ?? "",
                additional_notes: selected.additional_notes ?? "",
                production_notes: selected.production_notes ?? "",
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditMode(false)}
              saving={saving}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[
                { label: "Date", value: selected.date, icon: Calendar },
                { label: "Call Time", value: selected.calltime, icon: Clock },
                { label: "Location", value: selected.location, icon: MapPin },
                { label: "Nearest Hospital", value: selected.nearest_hospital_address, icon: MapPin },
                { label: "Nearest Police", value: selected.nearest_police_station, icon: MapPin },
                { label: "Nearest Fire Station", value: selected.nearest_fire_station, icon: MapPin },
              ].map(({ label, value, icon: Icon }) => value ? (
                <div key={label}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                    <Icon size={11} />{label}
                  </p>
                  <p style={{ color: "var(--text-secondary)" }}>{value}</p>
                </div>
              ) : null)}
              {selected.additional_notes && (
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                    <FileText size={11} />Additional Notes
                  </p>
                  <p className="whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{selected.additional_notes}</p>
                </div>
              )}
              {selected.production_notes && (
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                    <FileText size={11} />Production Notes
                  </p>
                  <p className="whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{selected.production_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
