"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getDialogs, getMessages, sendMessage, Dialog, Message } from "@/services/inbox";
import { useUserInfo } from "@/hooks/useUserInfo";

function Avatar({ src, name, size = 40 }: { src?: string | null; name?: string | null; size?: number }) {
  const initials = (name ?? "?").charAt(0).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--accent)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.4,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function getOtherUser(dialog: Dialog, myId: number) {
  return dialog.user1.id === myId ? dialog.user2 : dialog.user1;
}

export default function InboxPage() {
  const { profile } = useUserInfo();
  const myId = profile?.id ?? 0;

  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [selectedDialog, setSelectedDialog] = useState<Dialog | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loadingDialogs, setLoadingDialogs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getDialogs();
        setDialogs(data);
      } catch {
        toast.error("Couldn't load your conversations. Please refresh.");
      } finally {
        setLoadingDialogs(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedDialog) return;
    const other = getOtherUser(selectedDialog, myId);
    setLoadingMessages(true);
    getMessages(other.id)
      .then(setMessages)
      .catch(() => toast.error("Couldn't load messages. Please try again."))
      .finally(() => setLoadingMessages(false));
  }, [selectedDialog, myId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !selectedDialog) return;
    const other = getOtherUser(selectedDialog, myId);
    setSending(true);
    try {
      const msg = await sendMessage(other.id, text.trim());
      setMessages((prev) => [...prev, msg]);
      setText("");
    } catch {
      toast.error("Message couldn't be sent. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Left panel */}
      <div
        style={{
          width: 300,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
        }}
      >
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 16 }}>
          Messages
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingDialogs ? (
            <div style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>Loading…</div>
          ) : dialogs.length === 0 ? (
            <div style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>No conversations yet</div>
          ) : (
            dialogs.map((dialog) => {
              const other = getOtherUser(dialog, myId);
              const isSelected = selectedDialog?.id === dialog.id;
              return (
                <button
                  key={dialog.id}
                  onClick={() => setSelectedDialog(dialog)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    background: isSelected ? "var(--accent)" + "22" : "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--text-primary)",
                  }}
                >
                  <Avatar src={other.personal_info?.image} name={other.personal_info?.full_name ?? other.email} />
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {other.personal_info?.full_name ?? other.email}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {other.personal_info?.job_title ?? other.email}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!selectedDialog ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            Select a conversation to start chatting
          </div>
        ) : (
          <>
            {/* Header */}
            {(() => {
              const other = getOtherUser(selectedDialog, myId);
              return (
                <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, background: "var(--surface)" }}>
                  <Avatar src={other.personal_info?.image} name={other.personal_info?.full_name ?? other.email} size={36} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{other.personal_info?.full_name ?? other.email}</div>
                    {other.personal_info?.job_title && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{other.personal_info.job_title}</div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {loadingMessages ? (
                <div style={{ color: "var(--text-muted)", textAlign: "center" }}>Loading…</div>
              ) : messages.length === 0 ? (
                <div style={{ color: "var(--text-muted)", textAlign: "center" }}>No messages yet. Say hello!</div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender.id === myId;
                  return (
                    <div key={msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                      <div
                        style={{
                          maxWidth: "65%",
                          padding: "8px 14px",
                          borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          background: isMine ? "var(--accent)" : "var(--surface)",
                          color: isMine ? "#fff" : "var(--text-primary)",
                          fontSize: 14,
                          border: isMine ? "none" : "1px solid var(--border)",
                        }}
                      >
                        {msg.text}
                        <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, textAlign: "right" }}>
                          {new Date(msg.created).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, background: "var(--surface)" }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send)"
                rows={1}
                style={{
                  flex: 1,
                  resize: "none",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !text.trim()}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent)",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: sending || !text.trim() ? "not-allowed" : "pointer",
                  opacity: sending || !text.trim() ? 0.6 : 1,
                  fontSize: 14,
                }}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
