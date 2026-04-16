"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "react-toastify";
import { getChatSessions, getChatHistory, deleteChatSession } from "@/services/project";
import { ChatSession, ChatMessage } from "@/types/project";

function relativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AIAssistantPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selected, setSelected] = useState<ChatSession | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    getChatSessions()
      .then(setSessions)
      .catch(() => toast.error("Failed to load sessions."))
      .finally(() => setLoadingSessions(false));
  }, []);

  const selectSession = async (session: ChatSession) => {
    setSelected(session);
    setLoadingMessages(true);
    try {
      const history = await getChatHistory(session.session_id);
      setMessages(history);
    } catch {
      toast.error("Failed to load chat history.");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this session?")) return;
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      if (selected?.session_id === sessionId) {
        setSelected(null);
        setMessages([]);
      }
      toast.success("Session deleted.");
    } catch {
      toast.error("Failed to delete session.");
    }
  };

  return (
    <div className="flex h-full" style={{ minHeight: "calc(100vh - 0px)" }}>
      {/* Session list */}
      <div className="w-64 flex-shrink-0 border-r flex flex-col" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-400" />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>AI Assistant</h2>
          </div>
          <button
            onClick={() => { setSelected(null); setMessages([]); }}
            className="p-1 rounded text-emerald-400 hover:text-emerald-300 transition-colors"
            title="New chat"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin h-4 w-4" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>No sessions yet.</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.session_id}
                onClick={() => selectSession(session)}
                className={`flex items-start gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-colors group ${
                  selected?.session_id === session.session_id ? "bg-emerald-500/10" : "hover:bg-[var(--surface-hover)]"
                }`}
              >
                <MessageSquare size={13} className="mt-0.5 flex-shrink-0" style={{ color: selected?.session_id === session.session_id ? "rgb(52,211,153)" : "var(--text-muted)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: selected?.session_id === session.session_id ? "rgb(52,211,153)" : "var(--text-secondary)" }}>
                    {session.title || "New conversation"}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{relativeTime(session.updated_at)}</p>
                </div>
                <button
                  onClick={(e) => handleDelete(session.session_id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all hover:text-red-400"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col" style={{ background: "var(--background)" }}>
        {!selected ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4" style={{ color: "var(--text-muted)" }}>
            <Sparkles size={40} className="opacity-40 text-emerald-400" />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Select a session or start a new conversation</p>
              <p className="text-xs max-w-xs text-center" style={{ color: "var(--text-muted)" }}>
                Real-time chat is powered by WebSocket. Connect to the AI via your WebSocket client.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 max-w-sm text-center">
              <p className="text-xs text-emerald-400 font-medium mb-1 flex items-center justify-center gap-1">
                <Sparkles size={11} /> WebSocket Endpoint
              </p>
              <code className="text-xs" style={{ color: "var(--text-muted)" }}>ws://[host]/ws/ai_chat/</code>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="p-4 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{selected.title || "New conversation"}</h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Session ID: {selected.session_id}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin h-5 w-5" style={{ color: "var(--text-muted)" }} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12" style={{ color: "var(--text-muted)" }}>
                  <MessageSquare size={28} className="opacity-40" />
                  <p className="text-sm">No messages yet in this session.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-emerald-600 text-white rounded-br-sm"
                          : "rounded-bl-sm"
                      }`}
                      style={msg.role !== "user" ? { background: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--border)" } : undefined}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.timestamp && (
                        <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-emerald-200" : ""}`} style={msg.role !== "user" ? { color: "var(--text-muted)" } : undefined}>
                          {relativeTime(msg.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* WebSocket notice */}
            <div className="p-4 border-t flex-shrink-0" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <Sparkles size={14} className="text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-400">
                  Sending messages requires a WebSocket connection to <code className="text-[10px]">ws://[host]/ws/ai_chat/</code>. View history above.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
