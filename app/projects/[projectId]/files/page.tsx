"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Loader2, Plus, FolderOpen, Upload, FileText, Trash2, X, Download,
  Eye, ZoomIn, FileImage, FileVideo, Music, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";
import { getFolders, createFolder, getFilesInFolder, uploadFile, deleteFile } from "@/services/project";
import { Folder, ProjectFile } from "@/types/project";

// ── Predefined folder icons (film-making + common) ─────────────────────────────
const PRESET_ICONS: { label: string; svg: string }[] = [
  {
    label: "Clapperboard",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 3.9"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>`,
  },
  {
    label: "Film Strip",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>`,
  },
  {
    label: "Camera",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  },
  {
    label: "Video",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`,
  },
  {
    label: "Microphone",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  },
  {
    label: "Headphones",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`,
  },
  {
    label: "Script / FileText",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
  },
  {
    label: "Storyboard",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>`,
  },
  {
    label: "Costume / Shirt",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg>`,
  },
  {
    label: "Map Pin / Location",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  },
  {
    label: "Calendar",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  },
  {
    label: "Music",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  },
  {
    label: "Contract / Book",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/><path d="M6 8h2"/><path d="M6 12h2"/><path d="M16 8h2"/><path d="M16 12h2"/></svg>`,
  },
  {
    label: "Images",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
  },
  {
    label: "Users / Crew",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  },
  {
    label: "Star / VFX",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  },
  {
    label: "Folder",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`,
  },
  {
    label: "Archive",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>`,
  },
];

// ── File type helpers ─────────────────────────────────────────────────────────
function getFileExt(name: string) { return name.split(".").pop()?.toLowerCase() ?? ""; }
function isImage(name: string) { return ["jpg","jpeg","png","gif","webp","svg","bmp"].includes(getFileExt(name)); }
function isVideo(name: string) { return ["mp4","mov","avi","mkv","webm","m4v"].includes(getFileExt(name)); }
function isAudio(name: string) { return ["mp3","wav","aac","ogg","flac","m4a"].includes(getFileExt(name)); }
function isPdf(name: string) { return getFileExt(name) === "pdf"; }

function FileTypeIcon({ name, size = 16 }: { name: string; size?: number }) {
  const col = isImage(name) ? "#3b82f6" : isVideo(name) ? "#a855f7" : isAudio(name) ? "#f97316" : isPdf(name) ? "#ef4444" : "var(--text-muted)";
  if (isImage(name)) return <FileImage size={size} color={col} />;
  if (isVideo(name)) return <FileVideo size={size} color={col} />;
  if (isAudio(name)) return <Music size={size} color={col} />;
  return <FileText size={size} color={col} />;
}

// ── FolderIcon renderer ────────────────────────────────────────────────────────
function FolderIcon({ icon, size = 18 }: { icon?: string | null; size?: number }) {
  const isSvg = icon && icon.trim().startsWith("<");
  if (isSvg) {
    return (
      <span
        style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        dangerouslySetInnerHTML={{ __html: icon }}
      />
    );
  }
  return <span style={{ fontSize: size, lineHeight: 1, flexShrink: 0 }}>{icon || "📁"}</span>;
}

// ── File Preview Modal ─────────────────────────────────────────────────────────
function FilePreviewModal({ file, files, onClose }: { file: ProjectFile; files: ProjectFile[]; onClose: () => void }) {
  const [current, setCurrent] = useState(file);
  const idx = files.indexOf(current);

  const prev = () => { if (idx > 0) setCurrent(files[idx - 1]); };
  const next = () => { if (idx < files.length - 1) setCurrent(files[idx + 1]); };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const renderPreview = () => {
    if (!current.file) return <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No preview available.</p>;
    if (isImage(current.name)) {
      return <img src={current.file} alt={current.name} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 8 }} />;
    }
    if (isVideo(current.name)) {
      return <video src={current.file} controls style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 8 }} />;
    }
    if (isAudio(current.name)) {
      return (
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <Music size={48} color="#f97316" style={{ margin: "0 auto 20px" }} />
          <p style={{ fontSize: 14, color: "var(--text-primary)", marginBottom: 16 }}>{current.name}</p>
          <audio src={current.file} controls style={{ width: "100%" }} />
        </div>
      );
    }
    if (isPdf(current.name)) {
      return <iframe src={current.file} style={{ width: "100%", height: "70vh", border: "none", borderRadius: 8 }} title={current.name} />;
    }
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <FileText size={48} style={{ margin: "0 auto 20px", color: "var(--text-muted)" }} />
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>No preview available for this file type.</p>
        {current.file && (
          <a href={current.file} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            <Download size={14} /> Download
          </a>
        )}
      </div>
    );
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 860, background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Modal header */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileTypeIcon name={current.name} size={18} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current.name}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{idx + 1} / {files.length}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {current.file && (
              <a href={current.file} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-raised)", color: "var(--text-secondary)", fontSize: 12, textDecoration: "none" }}>
                <Download size={12} /> Download
              </a>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 4 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", background: "var(--background)", minHeight: 300 }}>
          {idx > 0 && (
            <button onClick={prev} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}>
              <ChevronLeft size={16} />
            </button>
          )}
          {renderPreview()}
          {idx < files.length - 1 && (
            <button onClick={next} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}>
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── New Folder Modal ───────────────────────────────────────────────────────────
function NewFolderModal({ onCreate, onClose }: { onCreate: (name: string, desc: string, icon: string) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(PRESET_ICONS[0].svg);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Folder name is required."); return; }
    setSaving(true);
    try { await onCreate(name.trim(), desc.trim(), selectedIcon); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 480, borderRadius: 16, border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "0 24px 80px rgba(0,0,0,0.4)", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>New Folder</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}><X size={16} /></button>
        </div>

        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Name + description */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 5 }}>Name <span style={{ color: "#ef4444" }}>*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Raw Footage"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 5 }}>Description</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional description"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
          </div>

          {/* Icon picker */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Icon</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 6 }}>
              {PRESET_ICONS.map((ic) => (
                <button
                  key={ic.label}
                  title={ic.label}
                  onClick={() => setSelectedIcon(ic.svg)}
                  style={{
                    padding: 8, borderRadius: 8, border: `1px solid ${selectedIcon === ic.svg ? "#22c55e" : "var(--border)"}`,
                    background: selectedIcon === ic.svg ? "rgba(34,197,94,0.12)" : "var(--surface-raised)",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    color: selectedIcon === ic.svg ? "#22c55e" : "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}
                  dangerouslySetInnerHTML={{ __html: ic.svg }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-raised)" }}>
            <span style={{ color: "var(--text-secondary)", display: "flex" }} dangerouslySetInnerHTML={{ __html: selectedIcon }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{name || "Folder name"}</span>
            {desc && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>— {desc}</span>}
          </div>
        </div>

        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-raised)", fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving} style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#22c55e,#16a34a)", fontSize: 13, fontWeight: 600, color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
            {saving && <Loader2 size={12} className="animate-spin" />} Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function FilesPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [folderModal, setFolderModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getFolders(projectId)
      .then(setFolders)
      .catch(() => toast.error("Failed to load folders."))
      .finally(() => setLoading(false));
  }, [projectId]);

  const selectFolder = async (folder: Folder) => {
    setSelectedFolder(folder);
    setFilesLoading(true);
    try { const data = await getFilesInFolder(folder.id); setFiles(data); }
    catch { toast.error("Failed to load files."); }
    finally { setFilesLoading(false); }
  };

  const handleCreateFolder = async (name: string, desc: string, icon: string) => {
    const folder = await createFolder(projectId, { name, description: desc || undefined, icon });
    setFolders((prev) => [...prev, folder]);
    setFolderModal(false);
    toast.success("Folder created!");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFolder) return;
    setUploading(true);
    try {
      const uploaded = await uploadFile(selectedFolder.id, file);
      setFiles((prev) => [...prev, uploaded]);
      toast.success(`${file.name} uploaded!`);
    } catch { toast.error("Upload failed."); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleDeleteFile = async (fileId: number, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return;
    try {
      await deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      if (previewFile?.id === fileId) setPreviewFile(null);
      toast.success("File deleted.");
    } catch { toast.error("Failed to delete file."); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <Loader2 className="animate-spin" size={24} style={{ color: "var(--text-muted)" }} />
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", position: "absolute", inset: 0 }}>
        {/* ── Left: folder list ─────────────────────────────────────────────── */}
        <div style={{ width: 230, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Folders</span>
            <button onClick={() => setFolderModal(true)} title="New folder"
              style={{ padding: 4, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-raised)", color: "var(--text-secondary)", cursor: "pointer", display: "flex" }}>
              <Plus size={13} />
            </button>
          </div>
          <nav style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
            {folders.length === 0 ? (
              <p style={{ fontSize: 12, textAlign: "center", paddingTop: 32, color: "var(--text-muted)" }}>No folders yet.</p>
            ) : folders.map((folder) => {
              const active = selectedFolder?.id === folder.id;
              return (
                <button key={folder.id} onClick={() => selectFolder(folder)}
                  style={{
                    width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 10px", borderRadius: 8, border: "1px solid transparent",
                    background: active ? "rgba(34,197,94,0.08)" : "none",
                    borderColor: active ? "rgba(34,197,94,0.25)" : "transparent",
                    color: active ? "#22c55e" : "var(--text-secondary)",
                    cursor: "pointer", transition: "all 0.15s", marginBottom: 2, fontSize: 13,
                  }}
                  className={!active ? "hover:bg-[var(--surface-hover)]" : ""}
                >
                  {folder.icon?.trim().startsWith("<")
                    ? <span style={{ display: "flex", flexShrink: 0, opacity: active ? 1 : 0.7 }} dangerouslySetInnerHTML={{ __html: folder.icon }} />
                    : <span style={{ display: "flex", flexShrink: 0, opacity: active ? 1 : 0.7 }}>{folder.icon || "📁"}</span>
                  }
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</span>
                  {folder.default && (
                    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(34,197,94,0.12)", color: "#22c55e", flexShrink: 0 }}>DEFAULT</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Right: file list ──────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--background)" }}>
          {!selectedFolder ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: "var(--text-muted)" }}>
              <FolderOpen size={44} style={{ opacity: 0.2 }} />
              <p style={{ fontSize: 13 }}>Select a folder to view files</p>
            </div>
          ) : (
            <>
              {/* Folder header bar */}
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {selectedFolder.icon?.trim().startsWith("<")
                    ? <span style={{ display: "flex", color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: selectedFolder.icon }} />
                    : <span style={{ display: "flex", color: "var(--text-secondary)" }}>{selectedFolder.icon || "📁"}</span>
                  }
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{selectedFolder.name}</span>
                  {selectedFolder.description && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{selectedFolder.description}</span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--surface-raised)", padding: "2px 7px", borderRadius: 10, border: "1px solid var(--border)" }}>
                    {files.length} file{files.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.7 : 1 }}>
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload
                </button>
                <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleUpload} />
              </div>

              {/* Files list */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                {filesLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", paddingTop: 48 }}>
                    <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                  </div>
                ) : files.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 64, gap: 10, color: "var(--text-muted)" }}>
                    <Upload size={36} style={{ opacity: 0.2 }} />
                    <p style={{ fontSize: 13 }}>No files yet — upload one above</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {files.map((file) => (
                      <div key={file.id}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", transition: "border-color 0.15s" }}
                        className="hover:border-emerald-500/30"
                      >
                        <FileTypeIcon name={file.name} size={18} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{getFileExt(file.name) || "file"}</p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button onClick={() => setPreviewFile(file)} title="Preview"
                            style={{ padding: 6, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-raised)", cursor: "pointer", display: "flex", color: "var(--text-secondary)", transition: "color 0.15s" }}
                            className="hover:text-emerald-400">
                            <Eye size={13} />
                          </button>
                          {file.file && (
                            <a href={file.file} target="_blank" rel="noopener noreferrer" title="Download"
                              style={{ padding: 6, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-raised)", display: "flex", color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.15s" }}
                              className="hover:text-emerald-400">
                              <Download size={13} />
                            </a>
                          )}
                          <button onClick={() => handleDeleteFile(file.id, file.name)} title="Delete"
                            style={{ padding: 6, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-raised)", cursor: "pointer", display: "flex", color: "var(--text-muted)", transition: "color 0.15s" }}
                            className="hover:text-red-400">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {folderModal && (
        <NewFolderModal
          onCreate={handleCreateFolder}
          onClose={() => setFolderModal(false)}
        />
      )}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          files={files}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}
