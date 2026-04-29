"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Sparkles, Plus, Trash2, Loader2, MessageSquare, Send,
  WifiOff, Square, Bot, User, Zap, Wrench, Brain,
  CheckCircle2, X,
} from "lucide-react";
import { toast } from "react-toastify";
import { getChatSessions, getChatHistory, deleteChatSession } from "@/services/project";
import { ChatSession, ChatMessage } from "@/types/project";
import { useUserInfo } from "@/hooks/useUserInfo";

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
  .replace(/^http/, "ws");

// ── Lightweight markdown renderer (bold, italic, inline code, paragraphs) ────
function renderMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];
  const inlineFormat = (s: string): React.ReactNode[] => {
    const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
      if (p.startsWith("`") && p.endsWith("`"))
        return <code key={i} style={{ background: "rgba(0,0,0,0.15)", borderRadius: 3, padding: "1px 4px", fontSize: "0.9em", fontFamily: "monospace" }}>{p.slice(1, -1)}</code>;
      if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
      return <span key={i}>{p}</span>;
    });
  };
  return text.split(/\n\n+/).map((para, i) => (
    <p key={i} style={{ margin: i === 0 ? 0 : "8px 0 0" }}>
      {para.split("\n").map((line, j, arr) => (
        <span key={j}>
          {inlineFormat(line)}
          {j < arr.length - 1 && <br />}
        </span>
      ))}
    </p>
  ));
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

// ── Agent status ──────────────────────────────────────────────────────────────
type AgentStatus = "routing" | "agent_working" | "tool_call" | "thinking" | "complete" | null;

const STATUS_META: Record<NonNullable<AgentStatus>, { icon: React.ReactNode; label: string; color: string }> = {
  routing:       { icon: <Zap size={12} />,         label: "Routing request…",   color: "#f97316" },
  agent_working: { icon: <Bot size={12} />,          label: "Agent working…",     color: "#6366f1" },
  tool_call:     { icon: <Wrench size={12} />,       label: "Using tool…",        color: "#0ea5e9" },
  thinking:      { icon: <Brain size={12} />,        label: "Thinking…",          color: "#8b5cf6" },
  complete:      { icon: <CheckCircle2 size={12} />, label: "Complete",           color: "#22c55e" },
};

interface ExtendedMessage extends ChatMessage {
  streaming?: boolean;
}

type WsState = "disconnected" | "connecting" | "connected" | "error";

export default function AIAssistantPage() {
  const params = useParams();
  const router = useRouter();
  // Refresh wallet after each AI turn — backend debits the V3 wallet up-front
  // and refunds on failure, so we need to re-read after every settle event.
  const { refreshCredits } = useUserInfo();
  const projectId = params?.projectId as string | undefined;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selected, setSelected] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [wsState, setWsState] = useState<WsState>("disconnected");
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>(null);
  const [statusDetail, setStatusDetail] = useState<string | undefined>();
  const [humanQuestion, setHumanQuestion] = useState<string | null>(null);
  const [humanInput, setHumanInput] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamingIdRef = useRef<number | null>(null);
  const selectedRef = useRef<ChatSession | null>(null);
  selectedRef.current = selected;

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Load sessions ─────────────────────────────────────────────────────────
  useEffect(() => {
    getChatSessions()
      .then(setSessions)
      .catch(() => toast.error("Failed to load sessions."))
      .finally(() => setLoadingSessions(false));
  }, []);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const connectWs = useCallback((session?: ChatSession | null) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) { setWsState("error"); return; }
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) wsRef.current.close();

    let url = `${WS_BASE}/ws/v2/ai_chat/?token=${token}`;
    if (projectId) url += `&project_id=${projectId}`;
    if (session?.session_id) url += `&session_id=${session.session_id}`;

    setWsState("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsState("connected");
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connection_established") {
          if (data.session_id && !selectedRef.current) {
            const newSession: ChatSession = { session_id: data.session_id, title: "New conversation", updated_at: new Date().toISOString() };
            setSelected(newSession);
            setSessions((prev) => [newSession, ...prev.filter((s) => s.session_id !== newSession.session_id)]);
          }
          return;
        }

        if (data.type === "status") {
          setAgentStatus(data.status as AgentStatus);
          setStatusDetail(data.detail);
          setIsTyping(true);
          setIsGenerating(true);
          return;
        }

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

        if (data.type === "done" || data.type === "response") {
          setIsTyping(false);
          setIsGenerating(false);
          setAgentStatus("complete");
          setTimeout(() => setAgentStatus(null), 2000);
          // V3 wallet was debited at turn start — pull the new balance.
          refreshCredits();

          if (streamingIdRef.current !== null) {
            const sid = streamingIdRef.current;
            streamingIdRef.current = null;
            setMessages((prev) => prev.map((m) => m.id === sid ? { ...m, streaming: false } : m));
          } else {
            const content = data.message ?? data.content ?? data.response ?? data.text ?? "";
            if (content) setMessages((prev) => [...prev, { id: Date.now(), role: "assistant", content, timestamp: new Date().toISOString() }]);
          }

          if (data.session_id) {
            setSessions((prev) => prev.map((s) => s.session_id === data.session_id ? { ...s, title: data.title || s.title, updated_at: new Date().toISOString() } : s));
          }
          return;
        }

        if (data.type === "stopped") {
          setIsTyping(false);
          setIsGenerating(false);
          setAgentStatus(null);
          streamingIdRef.current = null;
          refreshCredits();
          return;
        }

        if (data.type === "error") {
          setIsTyping(false);
          setIsGenerating(false);
          setAgentStatus(null);
          // Treat refund messages as info, not error.
          const errorMsg = data.error || data.message || "AI error.";
          if (typeof errorMsg === "string" && /refunded/i.test(errorMsg)) {
            toast.info(errorMsg);
          } else {
            toast.error(errorMsg);
          }
          // Refund / insufficient-credit checks may have changed the balance.
          refreshCredits();
          return;
        }

        if (data.type === "requires_human_input" || data.requires_human_input) {
          setIsTyping(false);
          setIsGenerating(false);
          setAgentStatus(null);
          setHumanQuestion(data.question || data.message || "The AI needs your input to continue.");
          return;
        }

        if (data.type === "navigate" && data.path) {
          router.push(data.path);
          return;
        }

        if (data.type === "typing") { setIsTyping(true); setIsGenerating(true); return; }

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
      } catch { /* ignore */ }
    };

    ws.onerror = () => { setWsState("error"); setIsTyping(false); setIsGenerating(false); };
    ws.onclose = (e) => {
      setWsState("disconnected");
      setIsTyping(false);
      setIsGenerating(false);
      if (e.code !== 1000) reconnectRef.current = setTimeout(() => connectWs(selectedRef.current), 4000);
    };
  }, [projectId, router, refreshCredits]);

  useEffect(() => {
    // intentionally runs once with the current selected (null on mount → new session)
    connectWs(selected);
    return () => { wsRef.current?.close(1000); if (reconnectRef.current) clearTimeout(reconnectRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────
  const sendText = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text || wsState !== "connected" || !wsRef.current || isGenerating) return;
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content: text, timestamp: new Date().toISOString() }]);
    setInput("");
    setIsTyping(true);
    setIsGenerating(true);
    streamingIdRef.current = null;
    wsRef.current.send(JSON.stringify({ message: text, type: "chat_message" }));
  }, [wsState, isGenerating]);

  const sendMessage = useCallback(() => {
    sendText(input);
  }, [input, sendText]);

  const stopGeneration = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: "stop" }));
    setIsTyping(false);
    setIsGenerating(false);
    setAgentStatus(null);
    streamingIdRef.current = null;
  }, []);

  const sendHumanFeedback = useCallback(() => {
    const text = humanInput.trim();
    if (!text || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "human_feedback", message: text }));
    setHumanQuestion(null);
    setHumanInput("");
    setIsTyping(true);
    setIsGenerating(true);
  }, [humanInput]);

  const selectSession = async (session: ChatSession) => {
    if (selected?.session_id === session.session_id) return;
    setSelected(session);
    setMessages([]);
    setHumanQuestion(null);
    setAgentStatus(null);
    setLoadingMessages(true);
    connectWs(session);
    try { setMessages(await getChatHistory(session.session_id)); }
    catch { toast.error("Failed to load history."); }
    finally { setLoadingMessages(false); }
  };

  const startNewChat = () => {
    setSelected(null);
    setMessages([]);
    setHumanQuestion(null);
    setAgentStatus(null);
    streamingIdRef.current = null;
    connectWs(null);
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this session?")) return;
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      if (selected?.session_id === sessionId) startNewChat();
      toast.success("Session deleted.");
    } catch { toast.error("Failed to delete session."); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const wsColor = { connected: "#22c55e", connecting: "#f97316", disconnected: "var(--text-muted)", error: "#ef4444" }[wsState];

  return (
    <>
      <style>{`
        @keyframes aiDot { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        @keyframes aiCursor { 0%,100%{opacity:1} 50%{opacity:0} }
        .ai-streaming::after { content:'▋'; animation:aiCursor 0.8s step-end infinite; font-size:0.75em; color:#22c55e; margin-left:1px; }
        .ai-msg-bubble { transition: background 0.15s; }
        .ai-session-item:hover .ai-session-delete { opacity:1; }
        .ai-session-delete { opacity:0; transition:opacity 0.15s; }
      `}</style>

      <div style={{ display: "flex", height: "100vh", background: "var(--background)", color: "var(--text-primary)", overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <div style={{ width: 260, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column" }}>

          {/* Sidebar header */}
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={13} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>AI Copilot</p>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: wsColor }} />
                  <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {{ connected: "Live", connecting: "Connecting", disconnected: "Offline", error: "Error" }[wsState]}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={startNewChat}
              style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-raised)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}
              title="New conversation"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Session list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
            {loadingSessions ? (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 32 }}>
                <Loader2 size={18} className="animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 48, color: "var(--text-muted)" }}>
                <MessageSquare size={28} style={{ margin: "0 auto 10px", opacity: 0.25 }} />
                <p style={{ fontSize: 12 }}>No conversations yet</p>
              </div>
            ) : sessions.map((s) => (
              <div
                key={s.session_id}
                className="ai-session-item"
                onClick={() => selectSession(s)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 10px",
                  borderRadius: 8, cursor: "pointer", marginBottom: 1,
                  background: selected?.session_id === s.session_id ? "rgba(34,197,94,0.08)" : "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { if (selected?.session_id !== s.session_id) e.currentTarget.style.background = "var(--surface-raised)"; }}
                onMouseLeave={(e) => { if (selected?.session_id !== s.session_id) e.currentTarget.style.background = "transparent"; }}
              >
                <MessageSquare size={13} style={{ marginTop: 2, flexShrink: 0, color: selected?.session_id === s.session_id ? "#22c55e" : "var(--text-muted)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: selected?.session_id === s.session_id ? "#22c55e" : "var(--text-secondary)" }}>
                    {s.title || "New conversation"}
                  </p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{relativeTime(s.updated_at)}</p>
                </div>
                <button
                  className="ai-session-delete"
                  onClick={(e) => handleDelete(s.session_id, e)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 3, color: "var(--text-muted)", borderRadius: 4, display: "flex" }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main chat area ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Chat header */}
          <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "var(--surface)" }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>
                {selected ? (selected.title || "New conversation") : "AI Copilot"}
              </h2>
              {agentStatus && agentStatus !== "complete" ? (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                  <span style={{ color: STATUS_META[agentStatus].color }}>{STATUS_META[agentStatus].icon}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{statusDetail || STATUS_META[agentStatus].label}</span>
                </div>
              ) : (
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {selected ? `Session · ${selected.session_id.slice(0, 8)}…` : "Start a new conversation"}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {isGenerating && (
                <button onClick={stopGeneration}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.07)", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  <Square size={12} /> Stop
                </button>
              )}
              {wsState === "error" && (
                <button onClick={() => connectWs(selected)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-raised)", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>
                  <WifiOff size={12} /> Reconnect
                </button>
              )}
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
            {!selected && !isGenerating ? (
              /* Empty state */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 60 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,rgba(34,197,94,0.15),rgba(99,102,241,0.1))", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={28} color="#22c55e" />
                </div>
                <div style={{ textAlign: "center", maxWidth: 420 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Your AI Copilot</h3>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7 }}>
                    Ask me to manage tasks, schedule crew, review scripts, generate reports, or answer questions about your project.
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  {[
                    "Show me all open tasks",
                    "Summarize today's callsheet",
                    "Who's available this week?",
                    "Create a task for the director",
                  ].map((suggestion) => (
                    <button key={suggestion} onClick={() => sendText(suggestion)}
                      style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-raised)", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", textAlign: "left", transition: "all 0.15s" }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = "#22c55e"}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : loadingMessages ? (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div key={msg.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    {msg.role === "assistant" && (
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                        <Sparkles size={13} color="#fff" />
                      </div>
                    )}
                    <div style={{
                      maxWidth: "70%", padding: "11px 16px",
                      borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      fontSize: 14, lineHeight: 1.6,
                      background: msg.role === "user" ? "linear-gradient(135deg,#22c55e,#16a34a)" : "var(--surface)",
                      color: msg.role === "user" ? "#fff" : "var(--text-primary)",
                      border: msg.role === "user" ? "none" : "1px solid var(--border)",
                      boxShadow: msg.role === "assistant" ? "0 1px 4px rgba(0,0,0,0.06)" : undefined,
                    }}>
                      {msg.role === "assistant" ? (
                        <div className={msg.streaming ? "ai-streaming" : ""} style={{ wordBreak: "break-word" }}>
                          {renderMarkdown(msg.content)}
                        </div>
                      ) : (
                        <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{msg.content}</p>
                      )}
                      {msg.timestamp && !msg.streaming && (
                        <p style={{ fontSize: 10, marginTop: 6, opacity: 0.5, margin: "6px 0 0" }}>{relativeTime(msg.timestamp)}</p>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface-raised)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                        <User size={13} color="var(--text-muted)" />
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && !streamingIdRef.current && (
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Sparkles size={13} color="#fff" />
                    </div>
                    <div style={{ padding: "12px 16px", borderRadius: "18px 18px 18px 4px", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 5 }}>
                      {agentStatus && agentStatus !== "complete" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, color: STATUS_META[agentStatus].color, fontSize: 12 }}>
                          {STATUS_META[agentStatus].icon}
                          <span>{statusDetail || STATUS_META[agentStatus].label}</span>
                        </div>
                      ) : (
                        [0, 1, 2].map((i) => (
                          <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)", display: "inline-block", animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                        ))
                      )}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Human-in-the-loop */}
          {humanQuestion && (
            <div style={{ padding: "12px 24px", borderTop: "1px solid rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.04)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, maxWidth: 700, margin: "0 auto" }}>
                <Brain size={16} color="#6366f1" style={{ marginTop: 3, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#6366f1", marginBottom: 4 }}>AI needs your input</p>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.5 }}>{humanQuestion}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={humanInput}
                      onChange={(e) => setHumanInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") sendHumanFeedback(); }}
                      placeholder="Your response…"
                      style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.3)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                      autoFocus
                    />
                    <button onClick={sendHumanFeedback} style={{ padding: "8px 16px", borderRadius: 8, background: "#6366f1", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                      Send
                    </button>
                    <button onClick={() => setHumanQuestion(null)} style={{ padding: "8px", borderRadius: 8, border: "1px solid var(--border)", background: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Input bar */}
          {!humanQuestion && (
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
              <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{
                  flex: 1, display: "flex", alignItems: "flex-end", gap: 8,
                  background: "var(--background)", borderRadius: 12, padding: "10px 14px",
                  border: `1.5px solid ${wsState === "connected" ? "var(--border)" : "rgba(239,68,68,0.3)"}`,
                  transition: "border-color 0.2s",
                }}
                  onFocus={() => {}}
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
                    onKeyDown={handleKeyDown}
                    disabled={wsState !== "connected" || isGenerating}
                    rows={1}
                    placeholder={
                      wsState !== "connected" ? (wsState === "connecting" ? "Connecting to AI…" : "Reconnecting…") :
                      isGenerating ? "Generating response…" : "Ask your AI Copilot anything…"
                    }
                    style={{
                      flex: 1, background: "none", border: "none", outline: "none",
                      fontSize: 14, color: "var(--text-primary)", resize: "none",
                      lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={wsState !== "connected" || !input.trim() || isGenerating}
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: "none", flexShrink: 0,
                    background: wsState === "connected" && input.trim() && !isGenerating ? "linear-gradient(135deg,#22c55e,#16a34a)" : "rgba(34,197,94,0.15)",
                    cursor: wsState === "connected" && input.trim() && !isGenerating ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.2s, transform 0.1s",
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.93)"}
                  onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  <Send size={16} color={wsState === "connected" && input.trim() && !isGenerating ? "#fff" : "#22c55e"} />
                </button>
              </div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
