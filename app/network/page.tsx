"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import {
  getConnections,
  getConnectionRequests,
  sendConnectionRequest,
  manageConnection,
  profileSearch,
  getSuggestedProfiles,
  Connection,
  NetworkUser,
} from "@/services/network";
import { useUserInfo } from "@/hooks/useUserInfo";
import RequireAuth from "@/components/RequireAuth";

type Tab = "connections" | "requests" | "discover";
type ConnectState = "idle" | "sending" | "sent" | "error";

function Avatar({ src, name, size = 44 }: { src?: string | null; name?: string | null; size?: number }) {
  const initials = (name ?? "?").charAt(0).toUpperCase();
  if (src) {
    return (
      <img src={src} alt={name ?? ""} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function UserCard({ user, action }: { user: NetworkUser; action?: React.ReactNode }) {
  const pi = user.personal_info;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
      <Avatar src={pi?.image} name={pi?.full_name ?? user.email} size={56} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{pi?.full_name ?? user.email}</div>
        {pi?.job_title && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{pi.job_title}</div>}
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{user.email}</div>
      </div>
      {action}
    </div>
  );
}

export default function NetworkPage() {
  const [tab, setTab] = useState<Tab>("connections");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [requests, setRequests] = useState<Connection[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NetworkUser[]>([]);
  const [suggested, setSuggested] = useState<NetworkUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectEmail, setConnectEmail] = useState("");
  const [showConnectForm, setShowConnectForm] = useState<string | null>(null); // stores email pre-fill or ""
  const [connectStates, setConnectStates] = useState<Record<number | string, ConnectState>>({});
  const { profile: currentUser } = useUserInfo();
  const myId = currentUser?.id ?? 0;
  const otherParty = (c: Connection) => (c.requester.id === myId ? c.receiver : c.requester);

  useEffect(() => {
    loadConnections();
    loadRequests();
    getSuggestedProfiles().then(setSuggested).catch(() => setSuggested([]));
  }, []);

  const loadConnections = async () => {
    try {
      const data = await getConnections();
      setConnections(data);
    } catch {
      toast.error("Couldn't load your connections. Please refresh.");
    }
  };

  const loadRequests = async () => {
    try {
      const data = await getConnectionRequests();
      setRequests(data);
    } catch {
      toast.error("Couldn't load connection requests. Please refresh.");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const data = await profileSearch(searchQuery.trim());
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Search is unavailable right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!connectEmail.trim()) return;
    try {
      const res = await sendConnectionRequest(connectEmail.trim());
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Connection request sent!");
        setConnectEmail("");
        setShowConnectForm(null);
      }
    } catch {
      toast.error("Couldn't send the connection request. Please try again.");
    }
  };

  const handleConnect = async (user: NetworkUser) => {
    const key: number | string = user.id ?? user.email;
    const email = user.email;
    // Guard: missing email
    if (!email) return;
    // Guard: self-connection
    if (
      (user.id != null && currentUser?.id != null && user.id === currentUser.id) ||
      (currentUser?.email && email === currentUser.email)
    ) {
      return;
    }
    // Guard: already sending or already sent
    const current = connectStates[key];
    if (current === "sending" || current === "sent") return;

    setConnectStates((prev) => ({ ...prev, [key]: "sending" }));
    try {
      const res = await sendConnectionRequest(email);
      if (res && typeof res === "object" && "error" in res && (res as { error?: unknown }).error) {
        const msg = String((res as { error?: unknown }).error) || "Couldn't send connection request. Try again.";
        setConnectStates((prev) => ({ ...prev, [key]: "error" }));
        toast.error(msg);
        return;
      }
      setConnectStates((prev) => ({ ...prev, [key]: "sent" }));
      toast.success("Connection request sent");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string; detail?: string; message?: string } } })?.response?.data?.error ||
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Couldn't send the connection request. Please try again.";
      setConnectStates((prev) => ({ ...prev, [key]: "error" }));
      toast.error(String(msg));
    }
  };

  const renderConnectButton = (user: NetworkUser) => {
    const key: number | string = user.id ?? user.email;
    const state: ConnectState = connectStates[key] ?? "idle";
    const email = user.email;
    const isSelf =
      (user.id != null && currentUser?.id != null && user.id === currentUser.id) ||
      (!!currentUser?.email && !!email && email === currentUser.email);
    if (!email || isSelf) return null;

    const isSending = state === "sending";
    const isSent = state === "sent";
    const disabled = isSending || isSent;
    const label = isSending ? "Sending…" : isSent ? "Pending" : "Connect";
    return (
      <button
        type="button"
        onClick={() => handleConnect(user)}
        disabled={disabled}
        style={{
          fontSize: 12,
          padding: "4px 12px",
          borderRadius: 6,
          border: isSent ? "1px solid var(--border)" : "none",
          background: isSent ? "transparent" : "var(--accent)",
          color: isSent ? "var(--text-muted)" : "#fff",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: isSending ? 0.7 : 1,
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {isSending && <Loader2 size={12} className="animate-spin" />}
        {label}
      </button>
    );
  };

  const handleManage = async (requesterId: number, status: "accepted" | "rejected") => {
    try {
      await manageConnection(requesterId, status);
      toast.success(status === "accepted" ? "Connection accepted!" : "Request declined.");
      loadRequests();
      if (status === "accepted") loadConnections();
    } catch {
      toast.error(status === "accepted" ? "Couldn't accept the request. Please try again." : "Couldn't decline the request. Please try again.");
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "connections", label: "Connections" },
    { key: "requests", label: `Requests${requests.length ? ` (${requests.length})` : ""}` },
    { key: "discover", label: "Discover" },
  ];

  const tabStyle = (active: boolean) => ({
    padding: "8px 20px",
    border: "none",
    borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
    background: "transparent",
    color: active ? "var(--accent)" : "var(--text-muted)",
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    fontSize: 14,
  });

  return (
    <RequireAuth>
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 24 }}>Network</h1>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 28 }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={tabStyle(tab === t.key)}>{t.label}</button>
          ))}
        </div>

        {/* Connections tab */}
        {tab === "connections" && (
          <div>
            {connections.length === 0 ? (
              <div style={{ textAlign: "center", marginTop: 40 }}>
                <p style={{ color: "var(--text-muted)" }}>No connections yet.</p>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>Use the <strong>Discover</strong> tab to find and connect with crew.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                {connections.map((c) => (
                  <UserCard
                    key={c.id}
                    user={otherParty(c)}
                    action={
                      <span style={{ fontSize: 11, color: "var(--text-muted)", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)" }}>
                        Connected
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requests tab */}
        {tab === "requests" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {requests.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", marginTop: 40 }}>No pending requests.</p>
            ) : (
              requests.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <Avatar src={r.requester.personal_info?.image} name={r.requester.personal_info?.full_name ?? r.requester.email} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{r.requester.personal_info?.full_name ?? r.requester.email}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.requester.personal_info?.job_title ?? r.requester.email}</div>
                  </div>
                  <button
                    onClick={() => handleManage(r.requester.id, "accepted")}
                    style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleManage(r.requester.id, "rejected")}
                    style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}
                  >
                    Reject
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Discover tab */}
        {tab === "discover" && (
          <div>
            {/* Send connection request form */}
            <div style={{ marginBottom: 24 }}>
              {showConnectForm === null ? (
                <button
                  onClick={() => setShowConnectForm("")}
                  style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14 }}
                >
                  + Connect by Email
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="email"
                    value={connectEmail}
                    onChange={(e) => setConnectEmail(e.target.value)}
                    placeholder="Enter email to connect..."
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 14, outline: "none" }}
                  />
                  <button
                    onClick={handleSendRequest}
                    style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14 }}
                  >
                    Send
                  </button>
                  <button
                    onClick={() => { setShowConnectForm(null); setConnectEmail(""); }}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 14 }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Search */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search people by name or email..."
                style={{ flex: 1, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 14, outline: "none" }}
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "…" : "Search"}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Search Results</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                  {searchResults.map((u) => (
                    <UserCard
                      key={u.id}
                      user={u}
                      action={renderConnectButton(u)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Suggested */}
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Suggested Profiles</h3>
              {suggested.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No suggestions available right now.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                  {suggested.map((u) => (
                    <UserCard
                      key={u.id}
                      user={u}
                      action={renderConnectButton(u)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </RequireAuth>
  );
}
