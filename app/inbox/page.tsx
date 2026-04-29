"use client";

// TODO(BUG-038): no real-time updates on inbox. Either subscribe to a
// /ws/inbox/ WebSocket or poll getMessages on an interval. Deferred for a
// dedicated architectural pass — see .bug-fixes/DEFERRED.md.

import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Search, X, Loader2 } from "lucide-react";
import { getDialogs, getMessages, sendMessage, Dialog, DialogUser, Message } from "@/services/inbox";
import { profileSearch, NetworkUser } from "@/services/network";
import { useUserInfo } from "@/hooks/useUserInfo";
import RequireAuth from "@/components/RequireAuth";

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

// Local marker: placeholder dialogs have negative ids so they never collide with real ones.
const PLACEHOLDER_ID_BASE = -1;
const isPlaceholderDialog = (d: Dialog | null) => !!d && d.id <= PLACEHOLDER_ID_BASE;

function networkUserToDialogUser(u: NetworkUser): DialogUser {
  return {
    id: u.id,
    email: u.email,
    personal_info: {
      full_name: u.personal_info?.full_name ?? null,
      job_title: u.personal_info?.job_title ?? null,
      image: u.personal_info?.image ?? null,
    },
  };
}

function NewMessagePicker({
  isOpen,
  onClose,
  onSelect,
  currentUserId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (user: NetworkUser) => void;
  currentUserId: number;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NetworkUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  // Focus input when opened; reset state when closed.
  useEffect(() => {
    if (isOpen) {
      // Defer so the input is mounted.
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    }
  }, [isOpen]);

  const runSearch = async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setHasSearched(false);
      return;
    }
    const mySeq = ++requestSeq.current;
    setLoading(true);
    try {
      const data = await profileSearch(trimmed);
      if (mySeq !== requestSeq.current) return; // stale
      const filtered = (data ?? []).filter((u) => u.id !== currentUserId);
      setResults(filtered);
      setHasSearched(true);
    } catch {
      if (mySeq !== requestSeq.current) return;
      toast.error("Search failed. Please try again.");
    } finally {
      if (mySeq === requestSeq.current) setLoading(false);
    }
  };

  // Debounced search on query change.
  useEffect(() => {
    if (!isOpen) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (query.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }
    debounceTimer.current = setTimeout(() => {
      runSearch(query);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      runSearch(query);
    }
  };

  if (!isOpen) return null;

  const trimmed = query.trim();

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "10vh",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 92vw)",
          maxHeight: "70vh",
          background: "var(--surface)",
          color: "var(--text-primary)",
          borderRadius: 12,
          border: "1px solid var(--border)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15 }}>New Message</div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search input */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Search size={16} color="var(--text-muted)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name or email…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: 14,
              padding: "6px 4px",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 120 }}>
          {trimmed.length < 2 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              Start typing to find someone.
            </div>
          ) : loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              Searching…
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              No matches.
            </div>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                onClick={() => onSelect(u)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--text-primary)",
                }}
              >
                <Avatar src={u.personal_info?.image} name={u.personal_info?.full_name ?? u.email} />
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {u.personal_info?.full_name ?? u.email}
                  </div>
                  {u.personal_info?.job_title && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {u.personal_info.job_title}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {u.email}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const { profile, loading: profileLoading } = useUserInfo();
  const myId = profile?.id ?? 0;

  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [selectedDialog, setSelectedDialog] = useState<Dialog | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loadingDialogs, setLoadingDialogs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const placeholderCounter = useRef(PLACEHOLDER_ID_BASE);

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

  // Load messages when switching dialogs. Placeholder dialogs have no server-side
  // history yet — skip the fetch and render an empty thread.
  useEffect(() => {
    if (!selectedDialog) return;
    if (myId === 0) return; // wait until profile resolves
    if (isPlaceholderDialog(selectedDialog)) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }
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

  const handleSelectUser = (user: NetworkUser) => {
    setPickerOpen(false);
    if (user.id === myId) {
      toast.info("You can't message yourself.");
      return;
    }
    // If a dialog with this user already exists, switch to it.
    const existing = dialogs.find((d) => {
      const other = getOtherUser(d, myId);
      return other.id === user.id;
    });
    if (existing) {
      setSelectedDialog(existing);
      return;
    }
    // Otherwise, synthesize a placeholder dialog. Keep getOtherUser() correct
    // by putting the current user as user1 and the target as user2.
    const selfUser: DialogUser = {
      id: myId,
      email: profile?.email ?? "",
      personal_info: {
        full_name: profile?.full_name ?? null,
        job_title: profile?.job_title ?? null,
        image: profile?.image ?? null,
      },
    };
    const placeholder: Dialog = {
      id: placeholderCounter.current--,
      user1: selfUser,
      user2: networkUserToDialogUser(user),
    };
    setSelectedDialog(placeholder);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!text.trim() || !selectedDialog) return;
    const other = getOtherUser(selectedDialog, myId);
    const wasPlaceholder = isPlaceholderDialog(selectedDialog);
    setSending(true);
    try {
      const msg = await sendMessage(other.id, text.trim());
      setMessages((prev) => [...prev, msg]);
      setText("");
      // First message on a placeholder creates a real Dialog server-side.
      // Refresh the list so the real dialog replaces our placeholder.
      if (wasPlaceholder) {
        try {
          const fresh = await getDialogs();
          setDialogs(fresh);
          const real = fresh.find((d) => {
            const o = getOtherUser(d, myId);
            return o.id === other.id;
          });
          if (real) setSelectedDialog(real);
        } catch {
          // Non-fatal: the message sent; the list will refresh on next page load.
        }
      }
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
    <RequireAuth>
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
        <div
          style={{
            padding: "14px 16px 12px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16 }}>Messages</div>
          <button
            onClick={() => setPickerOpen(true)}
            aria-label="New message"
            title="New message"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--accent)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Plus size={14} />
            New
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingDialogs ? (
            <div style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>Loading…</div>
          ) : dialogs.length === 0 && !selectedDialog ? (
            <div style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>No conversations yet</div>
          ) : (
            <>
              {/* Render placeholder first so the user can see the in-progress conversation in the sidebar. */}
              {selectedDialog && isPlaceholderDialog(selectedDialog) && (() => {
                const other = getOtherUser(selectedDialog, myId);
                return (
                  <button
                    key={selectedDialog.id}
                    onClick={() => setSelectedDialog(selectedDialog)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      background: "var(--accent)" + "22",
                      border: "none",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      textAlign: "left",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Avatar src={other.personal_info?.image} name={other.personal_info?.full_name ?? other.email} />
                    <div style={{ overflow: "hidden" }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {other.personal_info?.full_name ?? other.email}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontStyle: "italic",
                        }}
                      >
                        New conversation
                      </div>
                    </div>
                  </button>
                );
              })()}
              {dialogs.map((dialog) => {
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
              })}
            </>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {profileLoading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : !selectedDialog ? (
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

      <NewMessagePicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectUser}
        currentUserId={myId}
      />
    </div>
    </RequireAuth>
  );
}
