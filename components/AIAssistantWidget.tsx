"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Sparkles, X, Plus, ChevronLeft, Trash2, Loader2, MessageSquare, Send } from "lucide-react";
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

// ── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 14px" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--text-muted)",
            display: "inline-block",
            animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function AIAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"sessions" | "chat">("sessions");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selected, setSelected] = useState<ChatSession | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions when popup opens
  useEffect(() => {
    if (!open) return;
    setLoadingSessions(true);
    getChatSessions()
      .then(setSessions)
      .catch(() => toast.error("Failed to load sessions."))
      .finally(() => setLoadingSessions(false));
  }, [open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open && view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, view]);

  const selectSession = useCallback(async (session: ChatSession) => {
    setSelected(session);
    setView("chat");
    setLoadingMessages(true);
    try {
      const history = await getChatHistory(session.session_id);
      setMessages(history);
    } catch {
      toast.error("Failed to load chat history.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this session?")) return;
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      if (selected?.session_id === sessionId) {
        setSelected(null);
        setMessages([]);
        setView("sessions");
      }
      toast.success("Session deleted.");
    } catch {
      toast.error("Failed to delete session.");
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {/* CSS keyframes for typing dots */}
      <style>{`
        @keyframes aiDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes aiSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes aiSlideDown {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(16px) scale(0.97); }
        }
      `}</style>

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI Assistant"
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: open
            ? "var(--surface-raised)"
            : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
          border: open ? "1px solid var(--border)" : "none",
          boxShadow: open
            ? "0 4px 20px rgba(0,0,0,0.2)"
            : "0 8px 32px rgba(34,197,94,0.45)",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          zIndex: 9000,
          transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          transform: open ? "scale(1)" : "scale(1)",
        }}
        className="hover:scale-105 active:scale-95"
      >
        {open ? (
          <X size={20} color="var(--text-secondary)" />
        ) : (
          <>
            <Sparkles size={14} color="#fff" />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>AI</span>
          </>
        )}
      </button>

      {/* Chat popup */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 96,
            right: 28,
            width: 380,
            height: 520,
            borderRadius: 16,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 8999,
            animation: "aiSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
              background: "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, transparent 100%)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {view === "chat" && (
                <button
                  onClick={() => { setView("sessions"); setSelected(null); setMessages([]); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--text-muted)", display: "flex" }}
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={13} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.2 }}>
                  {view === "chat" && selected ? (selected.title || "New conversation") : "AI Assistant"}
                </p>
                <p style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {view === "chat" ? "Chat history" : "Your conversations"}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {view === "sessions" && (
                <button
                  onClick={() => { setSelected(null); setMessages([]); setView("chat"); }}
                  title="New conversation"
                  style={{
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    color: "var(--text-secondary)",
                  }}
                >
                  <Plus size={12} /> New
                </button>
              )}
              <button
                onClick={handleClose}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-muted)", display: "flex", borderRadius: 6 }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Sessions list */}
          {view === "sessions" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
              {loadingSessions ? (
                <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
                  <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                </div>
              ) : sessions.length === 0 ? (
                <div style={{ textAlign: "center", paddingTop: 60, color: "var(--text-muted)" }}>
                  <MessageSquare size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                  <p style={{ fontSize: 13 }}>No conversations yet.</p>
                  <p style={{ fontSize: 11, marginTop: 4 }}>Start a new one above.</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.session_id}
                    onClick={() => selectSession(session)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      transition: "background 0.15s",
                      marginBottom: 2,
                    }}
                    className="group hover:bg-[var(--surface-raised)]"
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "rgba(34,197,94,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <MessageSquare size={14} color="#22c55e" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {session.title || "New conversation"}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{relativeTime(session.updated_at)}</p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(session.session_id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-muted)", display: "flex", borderRadius: 4 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Chat view */}
          {view === "chat" && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {loadingMessages ? (
                  <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
                    <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                  </div>
                ) : !selected ? (
                  <div style={{ textAlign: "center", paddingTop: 40, color: "var(--text-muted)" }}>
                    <Sparkles size={32} style={{ margin: "0 auto 12px", opacity: 0.3, color: "#22c55e" }} />
                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>New conversation</p>
                    <p style={{ fontSize: 11, marginTop: 4 }}>Messages are sent via WebSocket.</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: "center", paddingTop: 40, color: "var(--text-muted)" }}>
                    <p style={{ fontSize: 13 }}>No messages in this session.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                      {msg.role === "assistant" && (
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg,#22c55e,#16a34a)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginRight: 8,
                            marginTop: 2,
                          }}
                        >
                          <Sparkles size={11} color="#fff" />
                        </div>
                      )}
                      <div
                        style={{
                          maxWidth: "75%",
                          padding: "8px 12px",
                          borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                          fontSize: 13,
                          lineHeight: 1.5,
                          background: msg.role === "user" ? "linear-gradient(135deg,#22c55e,#16a34a)" : "var(--surface-raised)",
                          color: msg.role === "user" ? "#fff" : "var(--text-primary)",
                          border: msg.role === "user" ? "none" : "1px solid var(--border)",
                        }}
                      >
                        <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                        {msg.timestamp && (
                          <p style={{ fontSize: 10, marginTop: 4, opacity: 0.6 }}>{relativeTime(msg.timestamp)}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* WS notice + input stub */}
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  padding: "10px 12px",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "var(--surface-raised)",
                    borderRadius: 10,
                    padding: "8px 12px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <input
                    disabled
                    placeholder="Connect via WebSocket to chat…"
                    style={{
                      flex: 1,
                      background: "none",
                      border: "none",
                      outline: "none",
                      fontSize: 12,
                      color: "var(--text-muted)",
                      cursor: "not-allowed",
                    }}
                  />
                  <button
                    disabled
                    style={{
                      background: "rgba(34,197,94,0.2)",
                      border: "none",
                      borderRadius: 7,
                      padding: "5px 8px",
                      cursor: "not-allowed",
                      display: "flex",
                      opacity: 0.5,
                    }}
                  >
                    <Send size={13} color="#22c55e" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
