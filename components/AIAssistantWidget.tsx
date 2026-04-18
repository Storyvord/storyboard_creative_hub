"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Sparkles, X, Plus, ChevronLeft, Trash2, Loader2,
  MessageSquare, Send, WifiOff, Square, Bot, User,
  Zap, Wrench, Brain, CheckCircle2,
} from "lucide-react";
import { toast } from "react-toastify";
import { getChatSessions, getChatHistory, deleteChatSession } from "@/services/project";
import { ChatSession, ChatMessage } from "@/types/project";

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
  .replace(/^http/, "ws");

// ── Lightweight markdown renderer ─────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let key = 0;

  const inlineFormat = (s: string): React.ReactNode => {
    // bold **text** or __text__
    const parts = s.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g);
    return parts.map((p, i) => {
      if ((p.startsWith("**") && p.endsWith("**")) || (p.startsWith("__") && p.endsWith("__")))
        return <strong key={i}>{p.slice(2, -2)}</strong>;
      if ((p.startsWith("*") && p.endsWith("*")) || (p.startsWith("_") && p.endsWith("_")))
        return <em key={i}>{p.slice(1, -1)}</em>;
      if (p.startsWith("`") && p.endsWith("`"))
        return <code key={i} style={{ background: "rgba(0,0,0,0.15)", borderRadius: 3, padding: "1px 4px", fontSize: "0.85em", fontFamily: "monospace" }}>{p.slice(1, -1)}</code>;
      return p;
    });
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) { nodes.push(<br key={key++} />); i++; continue; }

    // Headings
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    if (h1) { nodes.push(<p key={key++} style={{ fontWeight: 700, fontSize: "1.05em", marginTop: 10, marginBottom: 2 }}>{inlineFormat(h1[1])}</p>); i++; continue; }
    if (h2) { nodes.push(<p key={key++} style={{ fontWeight: 700, fontSize: "1em", marginTop: 8, marginBottom: 2 }}>{inlineFormat(h2[1])}</p>); i++; continue; }
    if (h3) { nodes.push(<p key={key++} style={{ fontWeight: 600, fontSize: "0.95em", marginTop: 6, marginBottom: 2 }}>{inlineFormat(h3[1])}</p>); i++; continue; }

    // Bullet list
    if (/^[-*•]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(<li key={i} style={{ marginBottom: 2 }}>{inlineFormat(lines[i].replace(/^[-*•]\s/, ""))}</li>);
        i++;
      }
      nodes.push(<ul key={key++} style={{ paddingLeft: 16, margin: "4px 0", listStyleType: "disc" }}>{items}</ul>);
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i} style={{ marginBottom: 2 }}>{inlineFormat(lines[i].replace(/^\d+\.\s/, ""))}</li>);
        i++;
      }
      nodes.push(<ol key={key++} style={{ paddingLeft: 16, margin: "4px 0" }}>{items}</ol>);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) { nodes.push(<hr key={key++} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "6px 0" }} />); i++; continue; }

    // Regular paragraph
    nodes.push(<p key={key++} style={{ margin: "2px 0" }}>{inlineFormat(line)}</p>);
    i++;
  }
  return nodes;
}

function MarkdownMessage({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className={streaming ? "ai-streaming" : ""} style={{ fontSize: 13, lineHeight: 1.6, wordBreak: "break-word" }}>
      {renderMarkdown(content)}
    </div>
  );
}

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

// ── Status strip ──────────────────────────────────────────────────────────────
type AgentStatus = "routing" | "agent_working" | "tool_call" | "thinking" | "complete" | null;

const STATUS_META: Record<NonNullable<AgentStatus>, { icon: React.ReactNode; label: string; color: string }> = {
  routing:      { icon: <Zap size={10} />,         label: "Routing…",         color: "#f97316" },
  agent_working:{ icon: <Bot size={10} />,          label: "Working…",         color: "#6366f1" },
  tool_call:    { icon: <Wrench size={10} />,       label: "Using tool…",      color: "#0ea5e9" },
  thinking:     { icon: <Brain size={10} />,        label: "Thinking…",        color: "#8b5cf6" },
  complete:     { icon: <CheckCircle2 size={10} />, label: "Done",             color: "#22c55e" },
};

function StatusBadge({ status, detail }: { status: AgentStatus; detail?: string }) {
  if (!status || status === "complete") return null;
  const meta = STATUS_META[status];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px", borderRadius: 99,
      background: `${meta.color}18`, color: meta.color,
      fontSize: 10, fontWeight: 600, border: `1px solid ${meta.color}30`,
    }}>
      {meta.icon}
      {detail || meta.label}
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "4px 2px" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-muted)", display: "inline-block", animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
  );
}

type WsStatus = "disconnected" | "connecting" | "connected" | "error";

interface ExtendedMessage extends ChatMessage {
  streaming?: boolean;
  humanQuestion?: string;
}

export default function AIAssistantWidget() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string | undefined;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"sessions" | "chat">("chat");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [selected, setSelected] = useState<ChatSession | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>(null);
  const [statusDetail, setStatusDetail] = useState<string | undefined>();
  const [humanQuestion, setHumanQuestion] = useState<string | null>(null);
  const [humanInput, setHumanInput] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamingIdRef = useRef<number | null>(null);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    if (open && view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, open, view]);

  // ── Load sessions (background, for history panel) ─────────────────────────
  useEffect(() => {
    if (!open) return;
    getChatSessions()
      .then(setSessions)
      .catch(() => {});
  }, [open]);

  // ── WebSocket lifecycle ───────────────────────────────────────────────────
  const connectWs = useCallback((sessionId?: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) { setWsStatus("error"); return; }

    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      wsRef.current.close();
    }

    let url = `${WS_BASE}/ws/v2/ai_chat/?token=${token}`;
    if (projectId) url += `&project_id=${projectId}`;
    if (sessionId) url += `&session_id=${sessionId}`;

    setWsStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connection_established") {
          if (data.session_id && !sessionId) {
            setSelected((prev) => prev ?? { session_id: data.session_id, title: "New conversation", updated_at: new Date().toISOString() });
          }
          return;
        }

        // ── Greeting (new session) ──
        if (data.type === "greeting") {
          setMessages((prev) => [...prev, { id: Date.now(), role: "assistant", content: data.content, timestamp: new Date().toISOString() }]);
          return;
        }

        // ── Status update ──
        if (data.type === "status") {
          setAgentStatus(data.status as AgentStatus);
          setStatusDetail(data.detail);
          setIsTyping(true);
          setIsGenerating(true);
          return;
        }

        // ── Token streaming ──
        if (data.type === "token") {
          const chunk = data.content ?? "";
          if (!chunk) return;
          setIsTyping(false);
          if (streamingIdRef.current === null) {
            const id = Date.now();
            streamingIdRef.current = id;
            setMessages((prev) => [...prev, { id, role: "assistant", content: chunk, streaming: true, timestamp: new Date().toISOString() }]);
          } else {
            const sid = streamingIdRef.current;
            setMessages((prev) => prev.map((m) => m.id === sid ? { ...m, content: m.content + chunk } : m));
          }
          return;
        }

        // ── Done / final message ──
        if (data.type === "done" || data.type === "response") {
          setIsTyping(false);
          setIsGenerating(false);
          setAgentStatus("complete");
          setTimeout(() => setAgentStatus(null), 1500);

          if (streamingIdRef.current !== null) {
            const sid = streamingIdRef.current;
            streamingIdRef.current = null;
            setMessages((prev) => prev.map((m) => m.id === sid ? { ...m, streaming: false } : m));
          } else {
            const content = data.message ?? data.content ?? data.response ?? data.text ?? "";
            if (content) {
              setMessages((prev) => [...prev, { id: Date.now(), role: "assistant", content, timestamp: new Date().toISOString() }]);
            }
          }

          if (data.session_id && data.title) {
            setSessions((prev) => prev.map((s) => s.session_id === data.session_id ? { ...s, title: data.title, updated_at: new Date().toISOString() } : s));
            setSelected((prev) => prev && prev.session_id === data.session_id ? { ...prev, title: data.title } : prev);
          }
          return;
        }

        // ── Stopped ──
        if (data.type === "stopped") {
          setIsTyping(false);
          setIsGenerating(false);
          setAgentStatus(null);
          streamingIdRef.current = null;
          return;
        }

        // ── Error ──
        if (data.type === "error") {
          setIsTyping(false);
          setIsGenerating(false);
          setAgentStatus(null);
          toast.error(data.message || "AI error occurred.");
          return;
        }

        // ── Human-in-the-loop ──
        if (data.type === "requires_human_input" || data.requires_human_input) {
          setIsTyping(false);
          setIsGenerating(false);
          setAgentStatus(null);
          setHumanQuestion(data.question || data.message || "The AI needs your input to continue.");
          return;
        }

        // ── Navigate ──
        if (data.type === "navigate" && data.path) {
          router.push(data.path);
          return;
        }

        // ── Typing indicator (legacy) ──
        if (data.type === "typing") {
          setIsTyping(true);
          setIsGenerating(true);
          return;
        }

        // ── Fallback: plain message ──
        const content = data.message ?? data.content ?? data.response ?? data.text ?? "";
        if (!content) return;
        setIsTyping(false);
        setIsGenerating(false);
        setAgentStatus(null);
        streamingIdRef.current = null;
        setMessages((prev) => [...prev, { id: Date.now(), role: "assistant", content, timestamp: new Date().toISOString() }]);
        if (data.session_id) {
          setSessions((prev) => prev.map((s) => s.session_id === data.session_id ? { ...s, title: data.title || s.title, updated_at: new Date().toISOString() } : s));
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => { setWsStatus("error"); setIsTyping(false); setIsGenerating(false); };

    ws.onclose = (e) => {
      setWsStatus("disconnected");
      setIsTyping(false);
      setIsGenerating(false);
      if (e.code !== 1000 && view === "chat") {
        reconnectTimer.current = setTimeout(() => connectWs(sessionId), 3000);
      }
    };
  }, [projectId, router, view]);

  useEffect(() => {
    if (view === "chat" && open) {
      // When opening a new chat (no selected session), reset messages so greeting appears fresh
      if (!selected) setMessages([]);
      connectWs(selected?.session_id);
    } else {
      wsRef.current?.close(1000);
      wsRef.current = null;
      setWsStatus("disconnected");
    }
    return () => { if (reconnectTimer.current) clearTimeout(reconnectTimer.current); };
  }, [view, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || wsStatus !== "connected" || !wsRef.current) return;
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content: text, timestamp: new Date().toISOString() }]);
    setInput("");
    setIsTyping(true);
    setIsGenerating(true);
    streamingIdRef.current = null;
    wsRef.current.send(JSON.stringify({ message: text, type: "chat_message" }));
  }, [input, wsStatus]);

  // ── Stop generation ───────────────────────────────────────────────────────
  const stopGeneration = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
    }
    setIsTyping(false);
    setIsGenerating(false);
    setAgentStatus(null);
    streamingIdRef.current = null;
  }, []);

  // ── Human feedback ────────────────────────────────────────────────────────
  const sendHumanFeedback = useCallback(() => {
    const text = humanInput.trim();
    if (!text || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "human_feedback", message: text }));
    setHumanQuestion(null);
    setHumanInput("");
    setIsTyping(true);
    setIsGenerating(true);
  }, [humanInput]);

  // ── Session actions ───────────────────────────────────────────────────────
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

  const startNewChat = () => { setSelected(null); setMessages([]); setView("chat"); };

  const goToSessions = () => {
    wsRef.current?.close(1000);
    setView("sessions");
    setSelected(null);
    setMessages([]);
    setIsTyping(false);
    setIsGenerating(false);
    setAgentStatus(null);
    setHumanQuestion(null);
    getChatSessions().then(setSessions).catch(() => {});
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this session?")) return;
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      if (selected?.session_id === sessionId) goToSessions();
      toast.success("Session deleted.");
    } catch { toast.error("Failed to delete session."); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const statusDot = {
    connected:    { color: "#22c55e", label: "Connected" },
    connecting:   { color: "#f97316", label: "Connecting…" },
    disconnected: { color: "var(--text-muted)", label: "Disconnected" },
    error:        { color: "#ef4444", label: "Connection error" },
  }[wsStatus];

  return (
    <>
      <style>{`
        @keyframes aiDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes aiSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes aiCursor {
          0%, 100% { opacity: 1; } 50% { opacity: 0; }
        }
        .ai-streaming::after {
          content: '▋';
          animation: aiCursor 0.8s step-end infinite;
          font-size: 0.75em;
          color: #22c55e;
          margin-left: 1px;
        }
      `}</style>

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI Assistant"
        style={{
          position: "fixed", bottom: 28, right: 28, width: 56, height: 56,
          borderRadius: "50%",
          background: open ? "var(--surface-raised)" : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
          border: open ? "1px solid var(--border)" : "none",
          boxShadow: open ? "0 4px 20px rgba(0,0,0,0.2)" : "0 8px 32px rgba(34,197,94,0.45)",
          cursor: "pointer", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 1,
          zIndex: 9000, transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        className="hover:scale-105 active:scale-95"
      >
        {open ? <X size={20} color="var(--text-secondary)" /> : (
          <><Sparkles size={14} color="#fff" /><span style={{ fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>AI</span></>
        )}
      </button>

      {/* Chat popup */}
      {open && (
        <div style={{
          position: "fixed", bottom: 96, right: 28, width: 400, height: 560,
          borderRadius: 18, border: "1px solid var(--border)", background: "var(--surface)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.15)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          zIndex: 8999, animation: "aiSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}>

          {/* Header */}
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
            background: "linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(99,102,241,0.04) 100%)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {view === "chat" && (
                <button onClick={goToSessions} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--text-muted)", display: "flex" }}>
                  <ChevronLeft size={16} />
                </button>
              )}
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #22c55e, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={13} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.2 }}>
                  {view === "chat" && selected ? (selected.title || "New conversation") : "AI Copilot"}
                </p>
                {view === "chat" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusDot.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {agentStatus && agentStatus !== "complete" ? STATUS_META[agentStatus].label : statusDot.label}
                    </span>
                  </div>
                ) : (
                  <p style={{ fontSize: 10, color: "var(--text-muted)" }}>Your conversations</p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {view === "chat" && (
                <>
                  <button
                    onClick={startNewChat}
                    title="New chat"
                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}
                  >
                    <Plus size={12} /> New
                  </button>
                  <button
                    onClick={goToSessions}
                    title="Chat history"
                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}
                  >
                    <MessageSquare size={12} /> History
                  </button>
                </>
              )}
              {view === "sessions" && (
                <button onClick={startNewChat} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
                  <Plus size={12} /> New
                </button>
              )}
              {view === "chat" && wsStatus === "error" && (
                <button onClick={() => connectWs(selected?.session_id)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
                  <WifiOff size={11} /> Retry
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-muted)", display: "flex", borderRadius: 6 }}>
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
                  <p style={{ fontSize: 11, marginTop: 4 }}>Click New to start chatting.</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session.session_id} onClick={() => selectSession(session)}
                    style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer", transition: "background 0.15s", marginBottom: 2 }}
                    className="group hover:bg-[var(--surface-raised)]"
                  >
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <MessageSquare size={14} color="#22c55e" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {session.title || "New conversation"}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{relativeTime(session.updated_at)}</p>
                    </div>
                    <button onClick={(e) => handleDelete(session.session_id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-muted)", display: "flex", borderRadius: 4 }}>
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
              {/* Status bar */}
              {agentStatus && agentStatus !== "complete" && (
                <div style={{ padding: "6px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6, background: "var(--surface-raised)", flexShrink: 0 }}>
                  <StatusBadge status={agentStatus} detail={statusDetail} />
                </div>
              )}

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
                {loadingMessages ? (
                  <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
                    <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                  </div>
                ) : messages.length === 0 && !isTyping ? (
                  <div style={{ textAlign: "center", paddingTop: 40, color: "var(--text-muted)" }}>
                    <Sparkles size={32} style={{ margin: "0 auto 12px", opacity: 0.3, color: "#22c55e" }} />
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Ask me anything about your project</p>
                    <p style={{ fontSize: 11, marginTop: 6, lineHeight: 1.6 }}>Manage tasks, crew, calendar, scripts and more.</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 6 }}>
                        {msg.role === "assistant" && (
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 }}>
                            <Sparkles size={10} color="#fff" />
                          </div>
                        )}
                        <div style={{
                          maxWidth: "78%", padding: "9px 13px",
                          borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                          fontSize: 13, lineHeight: 1.55,
                          background: msg.role === "user" ? "linear-gradient(135deg,#22c55e,#16a34a)" : "var(--surface-raised)",
                          color: msg.role === "user" ? "#fff" : "var(--text-primary)",
                          border: msg.role === "user" ? "none" : "1px solid var(--border)",
                        }}>
                          {msg.role === "user"
                            ? <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{msg.content}</p>
                            : <MarkdownMessage content={msg.content} streaming={msg.streaming} />
                          }
                          {msg.timestamp && !msg.streaming && (
                            <p style={{ fontSize: 10, marginTop: 4, opacity: 0.55 }}>{relativeTime(msg.timestamp)}</p>
                          )}
                        </div>
                        {msg.role === "user" && (
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--surface-raised)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 }}>
                            <User size={10} color="var(--text-muted)" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isTyping && !streamingIdRef.current && (
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Sparkles size={10} color="#fff" />
                        </div>
                        <div style={{ padding: "8px 13px", borderRadius: "14px 14px 14px 4px", background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
                          <TypingDots />
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Human-in-the-loop panel */}
              {humanQuestion && (
                <div style={{ padding: "10px 12px", background: "rgba(99,102,241,0.06)", borderTop: "1px solid rgba(99,102,241,0.2)", flexShrink: 0 }}>
                  <p style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <Brain size={11} /> AI needs your input
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.5 }}>{humanQuestion}</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={humanInput}
                      onChange={(e) => setHumanInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") sendHumanFeedback(); }}
                      placeholder="Your response…"
                      style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.3)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 12, outline: "none" }}
                    />
                    <button onClick={sendHumanFeedback} style={{ padding: "6px 12px", borderRadius: 8, background: "#6366f1", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      Send
                    </button>
                  </div>
                </div>
              )}

              {/* Input bar */}
              {!humanQuestion && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "10px 12px", flexShrink: 0 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "var(--surface-raised)", borderRadius: 11, padding: "7px 10px",
                    border: `1px solid ${wsStatus === "connected" ? "var(--border)" : "rgba(239,68,68,0.3)"}`,
                    transition: "border-color 0.2s",
                  }}>
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={wsStatus !== "connected" || isGenerating}
                      placeholder={
                        wsStatus !== "connected" ? (wsStatus === "connecting" ? "Connecting…" : "Reconnecting…") :
                        isGenerating ? "Generating…" : "Message AI Copilot…"
                      }
                      style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "var(--text-primary)" }}
                    />
                    {isGenerating ? (
                      <button
                        onClick={stopGeneration}
                        title="Stop generation"
                        style={{
                          background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                          borderRadius: 8, padding: "6px 8px", cursor: "pointer", display: "flex",
                          transition: "background 0.2s", alignItems: "center", gap: 4,
                        }}
                      >
                        <Square size={13} color="#ef4444" />
                      </button>
                    ) : (
                      <button
                        onClick={sendMessage}
                        disabled={wsStatus !== "connected" || !input.trim()}
                        style={{
                          background: wsStatus === "connected" && input.trim() ? "linear-gradient(135deg,#22c55e,#16a34a)" : "rgba(34,197,94,0.15)",
                          border: "none", borderRadius: 8, padding: "6px 8px",
                          cursor: wsStatus === "connected" && input.trim() ? "pointer" : "not-allowed",
                          display: "flex", transition: "background 0.2s",
                        }}
                      >
                        <Send size={13} color={wsStatus === "connected" && input.trim() ? "#fff" : "#22c55e"} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
