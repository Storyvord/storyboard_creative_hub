"use client";

import { useState, useEffect, useRef } from "react";
import { uploadScript, getScripts, deleteScript, getScenes, getCharacters } from "@/services/creative-hub";
import { Script, Scene, Character } from "@/types/creative-hub";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Trash2, BarChart2 } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from "react-toastify";
import { useParams } from "next/navigation";

export default function ScriptPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [script, setScript] = useState<Script | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (projectId) fetchScript(); }, [projectId]);

  const fetchScript = async () => {
    try {
      const scripts = await getScripts(projectId);
      if (scripts && scripts.length > 0) {
        setScript(scripts[0]); 
        try { const scenesData = await getScenes(scripts[0].id); if (scenesData) setScenes(scenesData); } catch (e) { console.error(e); }
        try { const charsData = await getCharacters(scripts[0].id); if (charsData) setCharacters(charsData); } catch (e) { console.error(e); }
      } else { setScript(null); setScenes([]); setCharacters([]); }
    } catch (error) { console.error("Failed to fetch script", error); }
    finally { setLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedExtensions = ['.fdx', '.pdf', '.docx', '.txt'];
    const fileExt = "." + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExt)) { toast.error(`Unsupported file type. Allowed: ${allowedExtensions.join(', ')}`); return; }
    setUploading(true);
    try {
      const newScript = await uploadScript(projectId, file);
      setScript(newScript);
      toast.success("Script uploaded successfully!");
      fetchScript();
    } catch (error: any) { console.error("Upload failed", error); toast.error("Failed to upload script. " + (error.response?.data?.message || "")); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleDelete = async () => {
    if (!script || !confirm("Are you sure you want to delete this script?")) return;
    setDeleting(true);
    try { await deleteScript(script.id); setScript(null); toast.success("Script deleted"); }
    catch (error) { console.error("Delete failed", error); toast.error("Failed to delete script"); }
    finally { setDeleting(false); }
  };

  const getIntExtData = () => {
      let intFound = 0, extFound = 0, empty = 0;
      scenes.forEach(s => { const val = (s.int_ext || "").toUpperCase(); if (val.includes("INT")) intFound++; else if (val.includes("EXT")) extFound++; else empty++; });
      const data = [];
      if (intFound > 0) data.push({ name: 'INT', value: intFound });
      if (extFound > 0) data.push({ name: 'EXT', value: extFound });
      if (empty > 0) data.push({ name: 'N/A', value: empty });
      return data;
  };

  const getLocationData = () => {
      const locCounts: Record<string, number> = {};
      scenes.forEach(s => { const loc = (s.location || "Unknown").toUpperCase(); if (loc !== "UNKNOWN") locCounts[loc] = (locCounts[loc] || 0) + 1; });
      return Object.entries(locCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  };

  const COLORS = ['#22c55e', '#10b981', '#059669', '#047857', '#6ee7b7'];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-bold mb-1 text-white">Script</h1>
        <p className="text-[#555] text-xs">Upload and analyze your screenplay (.fdx, .pdf, .docx)</p>
      </header>

      {!script && !loading && (
        <div className="mb-10">
            <div className="border border-dashed border-[#222] rounded-md p-10 flex flex-col items-center justify-center bg-[#0d0d0d] hover:bg-[#111] transition-colors">
            <Upload className="h-10 w-10 text-[#333] mb-3" />
            <h3 className="text-sm font-medium mb-1 text-white">Upload Script</h3>
            <p className="text-[#555] mb-5 text-xs">Supported: .fdx, .pdf, .docx, .txt</p>
            <input type="file" accept=".fdx,.pdf,.docx,.txt" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                {uploading ? <Loader2 className="animate-spin h-4 w-4" /> : "Select File"}
            </button>
            </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin h-6 w-6 text-[#333]" /></div>
      ) : script ? (
        <div className="bg-[#0d0d0d] rounded-md border border-[#1a1a1a] overflow-hidden">
          <div className="p-5 border-b border-[#1a1a1a] flex justify-between items-center">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-md">
                    <FileText className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-white">{script.title || "Untitled Script"}</h2>
                    <p className="text-[10px] text-[#555]">Uploaded {new Date(script.uploaded_at).toLocaleDateString()}</p>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Parsed</span>
                </div>
                <button onClick={handleDelete} disabled={deleting}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors" title="Delete Script">
                    {deleting ? <Loader2 className="animate-spin h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                </button>
             </div>
          </div>
          
          <div className="p-5">
            <h3 className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-3">Content Preview</h3>
            <div className="bg-[#0a0a0a] p-5 rounded-md font-mono text-xs leading-relaxed text-[#888] whitespace-pre-wrap border border-[#1a1a1a] h-80 overflow-y-auto">
                {script.content ? (script.content.substring(0, 2000) + (script.content.length > 2000 ? "\n..." : "")) : (
                    <span className="text-[#444] italic">No content preview available.</span>
                )}
            </div>
          </div>
          
          {script.analysis && (
              <div className="p-5 border-t border-[#1a1a1a]">
                  <h3 className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-5 flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                      Script Analysis
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      <div className="p-3 bg-[#111] rounded-md border border-[#1a1a1a] flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] text-[#555] mb-1 uppercase tracking-wider">Scenes</span>
                          <p className="text-2xl font-bold text-emerald-400">{script.analysis.scene_count || scenes.length || "0"}</p>
                      </div>
                      <div className="p-3 bg-[#111] rounded-md border border-[#1a1a1a] flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] text-[#555] mb-1 uppercase tracking-wider">Characters</span>
                          <p className="text-2xl font-bold text-emerald-400">{characters.length > 0 ? characters.length : (script.analysis?.character_count || "0")}</p>
                      </div>
                  </div>

                  {scenes.length > 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="bg-[#111] p-4 rounded-md border border-[#1a1a1a]">
                                <h4 className="text-xs font-semibold text-[#999] mb-3 text-center">INT / EXT Breakdown</h4>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={getIntExtData()} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                                                {getIntExtData().map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#222', borderRadius: '6px', fontSize: '12px' }} itemStyle={{ color: '#fff' }}/>
                                            <Legend verticalAlign="bottom" height={36}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-[#111] p-4 rounded-md border border-[#1a1a1a]">
                                <h4 className="text-xs font-semibold text-[#999] mb-3 text-center">Top Locations</h4>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={getLocationData()} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                            <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 9 }} axisLine={{ stroke: '#222' }} tickLine={false} tickFormatter={(v) => v.length > 8 ? v.substring(0, 8) + '..' : v}/>
                                            <YAxis tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false}/>
                                            <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#222', borderRadius: '6px', fontSize: '12px' }} cursor={{ fill: '#1a1a1a', opacity: 0.6 }}/>
                                            <Bar dataKey="count" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={35}>
                                                 {getLocationData().map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                      </div>
                  )}
              </div>
          )}
        </div>
      ) : (
        !uploading && (
            <div className="text-center py-10 opacity-50">
                <AlertCircle className="h-8 w-8 mx-auto text-[#444] mb-2" />
                <p className="text-[#555] text-sm">No script uploaded yet.</p>
            </div>
        )
      )}
    </div>
  );
}
