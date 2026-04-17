"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera, ChevronLeft, Loader2, Save, User, Mail, Briefcase,
  MapPin, Globe, Phone, FileText, CheckCircle, AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "@/services/api";
import { useTheme } from "@/context/ThemeContext";

interface ProfileData {
  full_name: string;
  contact_number: string;
  location: string;
  languages: string;
  job_title: string;
  bio: string;
  image: string | null;  // base64 or URL
}

const EMPTY: ProfileData = {
  full_name: "", contact_number: "", location: "",
  languages: "", job_title: "", bio: "", image: null,
};

export default function ProfilePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProfileData>(EMPTY);
  const [email, setEmail] = useState("");
  const [tierName, setTierName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [profileRes, tierRes] = await Promise.allSettled([
          api.get("/api/accounts/v2/getprofile/"),
          api.get("/api/accounts/tiers/info/"),
        ]);

        if (profileRes.status === "fulfilled") {
          const data = profileRes.value.data?.data ?? profileRes.value.data;
          const pi = data?.personal_info ?? {};
          const user = data?.user ?? {};
          setEmail(user.email ?? "");
          setForm({
            full_name: pi.full_name ?? "",
            contact_number: pi.contact_number ?? "",
            location: pi.location ?? "",
            languages: pi.languages ?? "",
            job_title: pi.job_title ?? "",
            bio: pi.bio ?? "",
            image: pi.image ?? null,
          });
          if (pi.image) setImagePreview(pi.image);
        }

        if (tierRes.status === "fulfilled") {
          const td = tierRes.value.data?.data ?? tierRes.value.data;
          setTierName(td?.current_tier?.name ?? null);
        }
      } catch (e) {
        toast.error("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Image picker ────────────────────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB."); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setForm(f => ({ ...f, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!form.full_name.trim()) { toast.error("Full name is required."); return; }
    setSaving(true);
    try {
      const payload: { personal_info: Partial<ProfileData> } = {
        personal_info: {
          full_name: form.full_name,
          contact_number: form.contact_number,
          location: form.location,
          languages: form.languages,
          job_title: form.job_title,
          bio: form.bio,
        },
      };
      // Only include image if it was changed (base64 data URL)
      if (imageFile && form.image?.startsWith("data:")) {
        (payload.personal_info as any).image = form.image;
      }
      await api.put("/api/accounts/v2/saveprofile/", payload);
      toast.success("Profile updated!");
      // Update localStorage user cache if present
      try {
        const cached = localStorage.getItem("user");
        if (cached) {
          const u = JSON.parse(cached);
          u.full_name = form.full_name;
          if (imagePreview) u.image = imagePreview;
          localStorage.setItem("user", JSON.stringify(u));
        }
      } catch {}
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.detail ?? "Failed to save profile.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof ProfileData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const initials = form.full_name
    ? form.full_name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : email[0]?.toUpperCase() ?? "?";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <Loader2 size={28} className="animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 9,
    border: "1px solid var(--border)", background: "var(--surface)",
    color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box",
    outline: "none", transition: "border-color .15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--text-primary)" }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "0 24px", height: 52,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, padding: "4px 6px", borderRadius: 6 }}>
          <ChevronLeft size={16} />
          <span style={{ fontSize: 13 }}>Back</span>
        </button>
        <span style={{ color: "var(--border)" }}>|</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Edit Profile</span>

        <div style={{ marginLeft: "auto" }}>
          <button onClick={save} disabled={saving} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
            borderRadius: 9, background: "#10b981", color: "#000", border: "none",
            cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13,
            opacity: saving ? .7 : 1,
          }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 64px" }}>

        {/* Avatar section */}
        <div style={{
          background: "var(--surface-raised)", border: "1px solid var(--border)",
          borderRadius: 16, padding: "28px 28px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 24,
        }}>
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 88, height: 88, borderRadius: "50%",
              background: imagePreview ? "transparent" : "#10b98120",
              border: "3px solid var(--border)",
              overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 28, fontWeight: 700, color: "#10b981" }}>{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                position: "absolute", bottom: 2, right: 2,
                width: 26, height: 26, borderRadius: "50%",
                background: "#10b981", border: "2px solid var(--surface-raised)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Camera size={12} style={{ color: "#000" }} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageChange}
            />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 700 }}>{form.full_name || "Your Name"}</p>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-muted)" }}>{email}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tierName && (
                <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, border: "1px solid var(--border)", color: "var(--text-muted)", background: "var(--surface)" }}>
                  {tierName}
                </span>
              )}
              {form.job_title && (
                <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, border: "1px solid var(--border)", color: "var(--text-muted)", background: "var(--surface)" }}>
                  {form.job_title}
                </span>
              )}
            </div>
          </div>

          <button onClick={() => fileRef.current?.click()} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
            borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)",
            color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 500,
          }}>
            <Camera size={14} /> Change Photo
          </button>
        </div>

        {/* Form grid */}
        <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 28px", marginBottom: 16 }}>
          <p style={{ margin: "0 0 20px", fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 7 }}>
            <User size={14} /> Personal Info
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input value={form.full_name} onChange={set("full_name")} placeholder="Your full name" style={inputStyle}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = "#10b981"; }}
                onBlur={e => { (e.target as HTMLElement).style.borderColor = "var(--border)"; }} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <div style={{ ...inputStyle, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8, cursor: "not-allowed" }}>
                <Mail size={13} style={{ flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Job Title</label>
              <input value={form.job_title} onChange={set("job_title")} placeholder="e.g. Director, Producer" style={inputStyle}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = "#10b981"; }}
                onBlur={e => { (e.target as HTMLElement).style.borderColor = "var(--border)"; }} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input value={form.contact_number} onChange={set("contact_number")} placeholder="+1 234 567 8900" style={inputStyle}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = "#10b981"; }}
                onBlur={e => { (e.target as HTMLElement).style.borderColor = "var(--border)"; }} />
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input value={form.location} onChange={set("location")} placeholder="City, Country" style={inputStyle}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = "#10b981"; }}
                onBlur={e => { (e.target as HTMLElement).style.borderColor = "var(--border)"; }} />
            </div>
            <div>
              <label style={labelStyle}>Languages</label>
              <input value={form.languages} onChange={set("languages")} placeholder="e.g. English, Hindi" style={inputStyle}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = "#10b981"; }}
                onBlur={e => { (e.target as HTMLElement).style.borderColor = "var(--border)"; }} />
            </div>
          </div>
        </div>

        <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px 28px", marginBottom: 16 }}>
          <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 7 }}>
            <FileText size={14} /> Bio
          </p>
          <textarea
            value={form.bio}
            onChange={set("bio")}
            rows={4}
            placeholder="Write a short bio about yourself — your background, specialties, and what drives your work."
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            onFocus={e => { (e.target as HTMLElement).style.borderColor = "#10b981"; }}
            onBlur={e => { (e.target as HTMLElement).style.borderColor = "var(--border)"; }}
          />
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-muted)" }}>{form.bio.length} / 500 characters</p>
        </div>

        {/* Account info read-only */}
        <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 28px" }}>
          <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>Account</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Email address</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{email}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Plan</span>
              <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 99, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)" }}>
                {tierName ?? "Free"}
              </span>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", gap: 12 }}>
              <Link href="/login?mode=change-password" style={{ fontSize: 12, color: "#10b981", textDecoration: "none" }}>
                Change password
              </Link>
            </div>
          </div>
        </div>

        {/* Save button bottom */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
          <button onClick={save} disabled={saving} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "11px 28px",
            borderRadius: 10, background: "#10b981", color: "#000", border: "none",
            cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14,
            opacity: saving ? .7 : 1,
          }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
