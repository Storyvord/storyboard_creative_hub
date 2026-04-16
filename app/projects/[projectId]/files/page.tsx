"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Plus, FolderOpen, Upload, FileText, Trash2, X, Download } from "lucide-react";
import { toast } from "react-toastify";
import { getFolders, createFolder, getFilesInFolder, uploadFile, deleteFile } from "@/services/project";
import { Folder, ProjectFile } from "@/types/project";

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
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [newFolderIcon, setNewFolderIcon] = useState("📁");
  const [creatingFolder, setCreatingFolder] = useState(false);

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
    try {
      const data = await getFilesInFolder(folder.id);
      setFiles(data);
    } catch {
      toast.error("Failed to load files.");
    } finally {
      setFilesLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) { toast.error("Folder name is required."); return; }
    setCreatingFolder(true);
    try {
      const folder = await createFolder(projectId, {
        name: newFolderName.trim(),
        description: newFolderDesc.trim() || undefined,
        icon: newFolderIcon,
      });
      setFolders((prev) => [...prev, folder]);
      setFolderModal(false);
      setNewFolderName("");
      setNewFolderDesc("");
      setNewFolderIcon("📁");
      toast.success("Folder created!");
    } catch (e: any) {
      const msg = Object.values(e?.response?.data || {}).flat().join(' ') || "Failed to create folder.";
      toast.error(msg);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFolder) return;
    setUploading(true);
    try {
      const uploaded = await uploadFile(selectedFolder.id, file);
      setFiles((prev) => [...prev, uploaded]);
      toast.success(`${file.name} uploaded!`);
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (fileId: number, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return;
    try {
      await deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success("File deleted.");
    } catch {
      toast.error("Failed to delete file.");
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
    <div style={{ display: "flex", position: "absolute", inset: 0 }}>
      {/* Left pane — folders */}
      <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Folders</h2>
          <button
            onClick={() => setFolderModal(true)}
            className="p-1 rounded text-emerald-400 hover:text-emerald-300 transition-colors"
            title="New folder"
          >
            <Plus size={16} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {folders.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>No folders yet.</p>
          ) : (
            folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => selectFolder(folder)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedFolder?.id === folder.id ? "bg-emerald-500/10 text-emerald-400" : "hover:bg-[var(--surface-hover)]"
                }`}
                style={selectedFolder?.id !== folder.id ? { color: "var(--text-secondary)" } : undefined}
              >
                <span className="text-base">{folder.icon || "📁"}</span>
                <span className="truncate flex-1">{folder.name}</span>
              </button>
            ))
          )}
        </nav>
      </div>

      {/* Right pane — files */}
      <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto", background: "var(--background)" }}>
        {!selectedFolder ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, color: "var(--text-muted)" }}>
            <FolderOpen size={40} className="opacity-40" />
            <p className="text-sm">Select a folder to view files</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedFolder.icon || "📁"}</span>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{selectedFolder.name}</h2>
                {selectedFolder.description && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{selectedFolder.description}</span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
              >
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                Upload File
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
            </div>

            {filesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin h-5 w-5" style={{ color: "var(--text-muted)" }} />
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12" style={{ color: "var(--text-muted)" }}>
                <FileText size={32} className="opacity-40" />
                <p className="text-sm">No files in this folder yet.</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  >
                    <FileText size={16} style={{ color: "var(--text-muted)" }} />
                    <span className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>{file.name}</span>
                    <div className="flex items-center gap-2">
                      {file.file && (
                        <a
                          href={file.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded transition-colors hover:text-emerald-400"
                          style={{ color: "var(--text-muted)" }}
                          title="Download"
                        >
                          <Download size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteFile(file.id, file.name)}
                        className="p-1.5 rounded transition-colors hover:text-red-400"
                        style={{ color: "var(--text-muted)" }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {folderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border p-6 shadow-2xl" style={{ borderColor: "var(--border)", background: "var(--surface)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>New Folder</h3>
              <button onClick={() => setFolderModal(false)} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Name <span className="text-red-400">*</span></label>
                <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Description</label>
                <input value={newFolderDesc} onChange={(e) => setNewFolderDesc(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Icon (emoji)</label>
                <input value={newFolderIcon} onChange={(e) => setNewFolderIcon(e.target.value)} maxLength={2} className="w-16 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-lg text-center focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setFolderModal(false)} className="px-4 py-2 text-sm" style={{ color: "var(--text-secondary)" }}>Cancel</button>
              <button onClick={handleCreateFolder} disabled={creatingFolder} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
                {creatingFolder && <Loader2 size={13} className="animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
