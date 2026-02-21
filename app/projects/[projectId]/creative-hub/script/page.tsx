"use client";

import { useState, useEffect, useRef } from "react";
import { uploadScript, getScripts, deleteScript } from "@/services/creative-hub";
import { Script } from "@/types/creative-hub";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useParams } from "next/navigation";

export default function ScriptPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (projectId) {
        fetchScript();
    }
  }, [projectId]);

  const fetchScript = async () => {
    try {
      const scripts = await getScripts(projectId);
      if (scripts && scripts.length > 0) {
        setScript(scripts[0]); 
      } else {
        setScript(null);
      }
    } catch (error) {
      console.error("Failed to fetch script", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.fdx', '.pdf', '.docx', '.txt'];
    const fileExt = "." + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      toast.error(`Unsupported file type. Allowed: ${allowedExtensions.join(', ')}`);
      return;
    }

    setUploading(true);
    try {
      const newScript = await uploadScript(projectId, file);
      setScript(newScript);
      toast.success("Script uploaded successfully!");
      // Refresh to ensure any async processing status is captured if needed
      fetchScript();
    } catch (error: any) {
      console.error("Upload failed", error);
      toast.error("Failed to upload script. " + (error.response?.data?.message || ""));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!script || !confirm("Are you sure you want to delete this script? This action cannot be undone.")) return;

    setDeleting(true);
    try {
        await deleteScript(script.id);
        setScript(null);
        toast.success("Script deleted successfully");
    } catch (error) {
        console.error("Delete failed", error);
        toast.error("Failed to delete script");
    } finally {
        setDeleting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Script Management</h1>
        <p className="text-gray-400">Upload and analyze your screenplay (.fdx, .pdf, .docx)</p>
      </header>

      {/* Upload Section - Only show if no script exists */}
      {!script && !loading && (
        <div className="mb-12">
            <div className="border-2 border-dashed border-gray-700 rounded-xl p-10 flex flex-col items-center justify-center bg-gray-900/50 hover:bg-gray-900 transition-colors">
            <Upload className="h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Upload Script</h3>
            <p className="text-gray-500 mb-6 text-sm">Supported formats: .fdx, .pdf, .docx, .txt</p>
            
            <input
                type="file"
                accept=".fdx,.pdf,.docx,.txt"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
            />
            
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
                {uploading ? <Loader2 className="animate-spin h-5 w-5" /> : "Select File"}
            </button>
            </div>
        </div>
      )}

      {/* Script Display */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
        </div>
      ) : script ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <FileText className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold">{script.title || "Untitled Script"}</h2>
                    <p className="text-xs text-gray-500">Uploaded {new Date(script.uploaded_at).toLocaleDateString()}</p>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>Parsed</span>
                </div>
                <button 
                    onClick={handleDelete}
                    disabled={deleting}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete Script"
                >
                    {deleting ? <Loader2 className="animate-spin h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
                </button>
             </div>
          </div>
          
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Content Preview</h3>
            <div className="bg-gray-950 p-6 rounded-lg font-mono text-sm leading-relaxed text-gray-300 whitespace-pre-wrap border border-gray-800 h-96 overflow-y-auto">
                {script.content ? (
                    script.content.substring(0, 2000) + (script.content.length > 2000 ? "\n..." : "")
                ) : (
                    <span className="text-gray-600 italic">No content preview available.</span>
                )}
            </div>
          </div>
          
          {script.analysis && (
              <div className="p-6 border-t border-gray-800">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Analysis</h3>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-800/50 rounded-lg">
                          <span className="text-gray-400 text-xs">Scenes</span>
                          <p className="text-2xl font-bold">{script.analysis.scene_count || "N/A"}</p>
                      </div>
                      <div className="p-4 bg-gray-800/50 rounded-lg">
                          <span className="text-gray-400 text-xs">Characters</span>
                          <p className="text-2xl font-bold">{script.analysis.character_count || "N/A"}</p>
                      </div>
                  </div>
              </div>
          )}
        </div>
      ) : (
        !uploading && (
            <div className="text-center py-10 opacity-50">
                <AlertCircle className="h-10 w-10 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-500">No script uploaded yet.</p>
            </div>
        )
      )}
    </div>
  );
}
