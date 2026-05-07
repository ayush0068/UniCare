"use client";

/**
 * /aftercare/session/[token]/page.tsx  (UniCare)
 *
 * The Temporary Recovery Session snapshot page.
 * Users arrive here from HelpLink after clicking "Continue to Aftercare".
 *
 * Three actions:
 *   1. Consult a Doctor
 *   2. Save Recovery Session (OTP flow)
 *   3. Download Case Snapshot
 *
 * No UniCare account required.
 */

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────
interface RecoverySession {
  sessionToken:     string;
  source:           string;
  isGuest:          boolean;
  status:           string;
  expiresAt:        string;
  hasPersisted:     boolean;
  createdAt:        string;
  incidentSnapshot: {
    incidentType: string;
    severity:     string;
    timestamp:    string;
    userNotes:    string;
    location:     { coordinates?: number[] } | null;
  };
  consultations: {
    doctorName:    string;
    consultedAt:   string;
    notes:         string;
    prescriptions: string[];
    followUpDate:  string | null;
  }[];
}

type View = "snapshot" | "save" | "saved" | "consult";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ── Status label map ──────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  active:  { label: "Recovery Active",       color: "#15803d", bg: "#f0fdf4" },
  saved:   { label: "Session Saved",         color: "#1d4ed8", bg: "#eff6ff" },
  expired: { label: "Session Expired",       color: "#9ca3af", bg: "#f8fafc" },
};

const INCIDENT_LABEL: Record<string, string> = {
  medical:   "Medical Emergency",
  accident:  "Accident",
  critical:  "Critical Incident",
  danger:    "Safety Concern",
  emergency: "Emergency",
  unknown:   "Emergency Incident",
};

const formatDate = (iso: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) : "—";

const timeUntil = (iso: string) => {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} day${d > 1 ? "s" : ""} remaining`;
  return `${h} hour${h !== 1 ? "s" : ""} remaining`;
};

// ─────────────────────────────────────────────────────────────────────────────
// INNER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function SessionContent({ token }: { token: string }) {
  const [session,  setSession]  = useState<RecoverySession | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [view,     setView]     = useState<View>("snapshot");

  // Save flow state
  const [contact,     setContact]     = useState("");
  const [contactType, setContactType] = useState<"phone" | "email">("phone");
  const [otp,         setOtp]         = useState("");
  const [otpSent,     setOtpSent]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState("");

  // Download state
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/recovery/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setSession(d.session);
        else setError(d.message || "Session not found");
      })
      .catch(() => setError("Failed to load recovery session."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSendOtp = async () => {
    if (!contact.trim()) return;
    setSaving(true); setSaveMsg("");
    try {
      const r = await fetch(`${API_BASE}/recovery/${token}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: contact.trim(), type: contactType }),
      });
      const d = await r.json();
      if (d.success) { setOtpSent(true); setSaveMsg("OTP sent! Check your " + contactType + "."); }
      else setSaveMsg(d.message || "Failed to send OTP.");
    } catch { setSaveMsg("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setSaving(true); setSaveMsg("");
    try {
      const r = await fetch(`${API_BASE}/recovery/${token}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otp.trim() }),
      });
      const d = await r.json();
      if (d.success) {
        setView("saved");
        setSession(prev => prev ? { ...prev, status: "saved", hasPersisted: true } : prev);
      } else setSaveMsg(d.message || "Invalid OTP.");
    } catch { setSaveMsg("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const r = await fetch(`${API_BASE}/recovery/${token}/snapshot`);
      const d = await r.json();
      if (d.success) {
        const blob = new Blob([JSON.stringify(d.snapshot, null, 2)], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `recovery-snapshot-${token.slice(0, 8)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* silent */ }
    finally { setDownloading(false); }
  };

  if (loading) return (
    <div style={s.centeredFull}>
      <div style={s.spinner} />
      <p style={s.mutedSm}>Preparing your recovery session…</p>
    </div>
  );

  if (error) return (
    <div style={s.centeredFull}>
      <span style={{ fontSize: "2.5rem" }}>🔒</span>
      <p style={{ color: "#dc2626", fontWeight: 600, textAlign: "center", maxWidth: 320, marginTop: "0.75rem" }}>{error}</p>
      <p style={s.mutedSm}>This session may have expired or the link is invalid.</p>
    </div>
  );

  if (!session) return null;

  const st    = STATUS_LABEL[session.status] ?? STATUS_LABEL.active;
  const snap  = session.incidentSnapshot;
  const ttl   = timeUntil(session.expiresAt);

  // ── SAVED CONFIRMATION ────────────────────────────────────────────────────
  if (view === "saved") return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={s.h2}>Recovery session saved</h2>
          <p style={s.bodyText}>
            Your emergency aftercare records are now secured. Access them anytime
            using your {contactType} + a new OTP — no password needed.
          </p>
          <button style={s.btnPrimary} onClick={() => setView("snapshot")}>
            Back to snapshot
          </button>
        </div>
      </div>
    </div>
  );

  // ── SAVE RECOVERY FLOW ────────────────────────────────────────────────────
  if (view === "save") return (
    <div style={s.page}>
      <Banner />
      <div style={s.card}>
        <button onClick={() => setView("snapshot")} style={s.backBtn}>← Back</button>
        <h2 style={s.h2}>Save your recovery session</h2>
        <p style={s.bodyText}>
          No password. No full account. Just verify your {contactType} and your
          records are secured for 30 days.
        </p>

        {/* Contact type toggle */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          {(["phone", "email"] as const).map(t => (
            <button key={t} onClick={() => setContactType(t)}
              style={{ ...s.toggleBtn, ...(contactType === t ? s.toggleActive : {}) }}>
              {t === "phone" ? "📱 Phone OTP" : "✉️ Email Link"}
            </button>
          ))}
        </div>

        {/* Contact input */}
        <input
          type={contactType === "phone" ? "tel" : "email"}
          placeholder={contactType === "phone" ? "+91 9876543210" : "you@example.com"}
          value={contact}
          onChange={e => setContact(e.target.value)}
          style={s.input}
        />

        {!otpSent ? (
          <button style={s.btnPrimary} onClick={handleSendOtp} disabled={saving || !contact.trim()}>
            {saving ? "Sending…" : `Send OTP to my ${contactType}`}
          </button>
        ) : (
          <>
            <p style={{ ...s.mutedSm, marginBottom: "0.5rem" }}>Enter the 6-digit OTP sent to your {contactType}</p>
            <input
              type="text"
              placeholder="123456"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              maxLength={6}
              style={{ ...s.input, letterSpacing: "0.3em", textAlign: "center", fontSize: "1.1rem" }}
            />
            <button style={s.btnPrimary} onClick={handleVerifyOtp} disabled={saving || otp.length < 6}>
              {saving ? "Verifying…" : "Verify & Save Session"}
            </button>
            <button style={s.btnGhost} onClick={() => { setOtpSent(false); setOtp(""); setSaveMsg(""); }}>
              Resend OTP
            </button>
          </>
        )}

        {saveMsg && (
          <p style={{ fontSize: "0.78rem", color: saveMsg.includes("sent") ? "#15803d" : "#dc2626",
            marginTop: "0.75rem", textAlign: "center" }}>{saveMsg}</p>
        )}

        <div style={s.privacyNote}>
          🔒 We only store your contact to let you access this session later.
          No marketing. No spam. No UniCare account created.
        </div>
      </div>
    </div>
  );

  // ── CONSULT A DOCTOR (placeholder — integrates with existing doctor flow) ─
  if (view === "consult") return (
    <div style={s.page}>
      <Banner />
      <div style={s.card}>
        <button onClick={() => setView("snapshot")} style={s.backBtn}>← Back</button>
        <h2 style={s.h2}>Consult a doctor</h2>
        <p style={s.bodyText}>
          Browse available doctors and book a consultation — no UniCare account required.
          Your emergency context will only be shared with your doctor's explicit consent.
        </p>

        {/* Consent level picker */}
        <div style={s.sectionLabel}>What to share with your doctor?</div>
        {[
          { val: "summary_only",    label: "Summary only",       sub: "Incident type, severity and timestamp" },
          { val: "notes_and_media", label: "Notes + context",    sub: "Summary + your personal notes" },
          { val: "none",            label: "Do not share",       sub: "Doctor sees only your booking" },
        ].map(opt => (
          <label key={opt.val} style={s.consentRow}>
            <input type="radio" name="shareLevel" value={opt.val} defaultChecked={opt.val === "summary_only"}
              style={{ accentColor: "#2563eb" }} />
            <div>
              <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", margin: 0 }}>{opt.label}</p>
              <p style={{ fontSize: "0.72rem", color: "#64748b", margin: "2px 0 0" }}>{opt.sub}</p>
            </div>
          </label>
        ))}

        <button
          style={s.btnPrimary}
          onClick={() => {
            const unicareUrl = process.env.NEXT_PUBLIC_APP_URL || "";
            window.location.href = `${unicareUrl}/doctor-list?recoveryToken=${token}`;
          }}
        >
          Browse Doctors →
        </button>

        <div style={s.privacyNote}>
          🔒 Doctor access to your emergency context expires automatically after the consultation.
          Helper identities, tracking data and moderation logs are never shared.
        </div>
      </div>
    </div>
  );

  // ── MAIN SNAPSHOT PAGE ────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <Banner />

      {/* Session header card */}
      <div style={s.card}>

        {/* Status row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <span style={{ ...s.statusPill, background: st.bg, color: st.color }}>
            ● {st.label}
          </span>
          <span style={s.mutedSm}>{ttl}</span>
        </div>

        {/* Incident summary */}
        <div style={s.incidentBlock}>
          <p style={s.sectionLabel}>Incident</p>
          <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.25rem" }}>
            {INCIDENT_LABEL[snap.incidentType] ?? snap.incidentType}
          </p>
          <p style={s.mutedSm}>
            {snap.timestamp ? formatDate(snap.timestamp) : "—"}
            {snap.location?.coordinates
              ? `  ·  ${snap.location.coordinates[1]?.toFixed(4)}, ${snap.location.coordinates[0]?.toFixed(4)}`
              : ""}
          </p>
          {snap.userNotes && (
            <p style={{ fontSize: "0.82rem", color: "#475569", marginTop: "0.5rem", lineHeight: 1.6 }}>
              📝 {snap.userNotes}
            </p>
          )}
        </div>

        {/* Consultations (if any) */}
        {session.consultations.length > 0 && (
          <div style={{ marginTop: "1.25rem" }}>
            <p style={s.sectionLabel}>Consultations</p>
            {session.consultations.map((c, i) => (
              <div key={i} style={s.consultCard}>
                <p style={{ fontWeight: 600, color: "#0f172a", margin: 0 }}>{c.doctorName}</p>
                <p style={s.mutedSm}>{formatDate(c.consultedAt)}</p>
                {c.notes && <p style={{ fontSize: "0.8rem", color: "#475569", marginTop: "0.35rem" }}>{c.notes}</p>}
                {c.prescriptions?.length > 0 && (
                  <p style={{ fontSize: "0.75rem", color: "#15803d", marginTop: "0.25rem" }}>
                    💊 {c.prescriptions.join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 3 action buttons */}
        <div style={s.actionGrid}>
          <ActionCard
            icon="🩺"
            title="Consult a Doctor"
            sub="Book a consultation without creating an account"
            onClick={() => setView("consult")}
            accent="#2563eb"
          />
          <ActionCard
            icon="💾"
            title="Save Recovery Session"
            sub={session.hasPersisted ? "Already saved — access anytime with OTP" : "Secure your records with phone or email"}
            onClick={() => setView("save")}
            accent="#15803d"
            done={session.hasPersisted}
          />
          <ActionCard
            icon="⬇️"
            title="Download Case Snapshot"
            sub="Privacy-filtered summary of your emergency and care"
            onClick={handleDownload}
            accent="#7c3aed"
            loading={downloading}
          />
        </div>

        {/* Privacy footer */}
        <p style={{ ...s.mutedSm, textAlign: "center", marginTop: "1.5rem", lineHeight: 1.6 }}>
          🔒 This session is private to you. No helper identities, tracking history
          or platform metadata are stored here. Session token: <code style={{ fontSize: "0.65rem" }}>{token.slice(0, 12)}…</code>
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Banner() {
  return (
    <div style={{
      background:   "linear-gradient(135deg, #eff6ff, #f0fdf4)",
      border:       "1px solid rgba(37,99,235,0.15)",
      borderRadius: "0.75rem",
      padding:      "0.75rem 1.25rem",
      marginBottom: "1.25rem",
      display:      "flex",
      alignItems:   "center",
      gap:          "0.65rem",
    }}>
      <span style={{ fontSize: "1rem", flexShrink: 0 }}>🏥</span>
      <p style={{ fontSize: "0.78rem", color: "#1e40af", margin: 0, lineHeight: 1.5 }}>
        <b>You are continuing aftercare from a recent HelpLink emergency.</b>
        {" "}No account needed — your records are securely held in this session.
      </p>
    </div>
  );
}

function ActionCard({ icon, title, sub, onClick, accent, done = false, loading = false }: {
  icon: string; title: string; sub: string; onClick: () => void;
  accent: string; done?: boolean; loading?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{
        background:    "#fff",
        border:        `1.5px solid ${done ? "#bbf7d0" : "rgba(0,0,0,0.08)"}`,
        borderRadius:  "0.875rem",
        padding:       "1rem 1.1rem",
        textAlign:     "left",
        cursor:        loading ? "default" : "pointer",
        transition:    "all 0.15s ease",
        opacity:       loading ? 0.7 : 1,
        boxShadow:     "0 1px 4px rgba(0,0,0,0.05)",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = accent; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${accent}22`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = done ? "#bbf7d0" : "rgba(0,0,0,0.08)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}
    >
      <div style={{ fontSize: "1.4rem", marginBottom: "0.4rem" }}>{loading ? "⏳" : done ? "✅" : icon}</div>
      <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.2rem" }}>{title}</p>
      <p style={{ fontSize: "0.72rem", color: "#64748b", margin: 0, lineHeight: 1.5 }}>{sub}</p>
    </button>
  );
}

// ── Loading fallback ──────────────────────────────────────────────────────────
function LoadingFallback() {
  return (
    <div style={s.centeredFull}>
      <div style={s.spinner} />
      <p style={s.mutedSm}>Loading…</p>
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────
export default function SessionPage() {
  const params = useParams();
  const token  = (params?.token as string) || "";

  return (
    <Suspense fallback={<LoadingFallback />}>
      <SessionContent token={token} />
    </Suspense>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page:         { minHeight: "100vh", background: "#f8fafc", padding: "5.5rem 1.25rem 2rem", fontFamily: "var(--font-sans, system-ui, sans-serif)" },
  centeredFull: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", fontFamily: "system-ui, sans-serif" },
  spinner:      { width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", animation: "spin 0.8s linear infinite" },
  card:         { maxWidth: 640, margin: "0 auto", background: "#fff", borderRadius: "1.25rem", padding: "1.75rem 2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 8px 32px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" },
  h2:           { fontSize: "1.3rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.65rem" },
  bodyText:     { fontSize: "0.88rem", color: "#475569", lineHeight: 1.65, margin: "0 0 1.25rem" },
  mutedSm:      { fontSize: "0.72rem", color: "#94a3b8", margin: 0 },
  sectionLabel: { fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#94a3b8", margin: "0 0 0.5rem" },
  statusPill:   { display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "3px 12px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700 },
  incidentBlock:{ background: "#f8fafc", borderRadius: "0.75rem", padding: "1rem 1.1rem", border: "1px solid rgba(0,0,0,0.06)" },
  consultCard:  { background: "#f0fdf4", borderRadius: "0.65rem", padding: "0.75rem 0.9rem", border: "1px solid rgba(74,222,128,0.25)", marginBottom: "0.5rem" },
  actionGrid:   { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem", marginTop: "1.5rem" },
  input:        { width: "100%", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "0.65rem", padding: "0.7rem 0.9rem", fontSize: "0.88rem", color: "#0f172a", outline: "none", boxSizing: "border-box" as const, marginBottom: "0.75rem", fontFamily: "inherit" },
  btnPrimary:   { width: "100%", padding: "0.8rem", borderRadius: "999px", background: "linear-gradient(135deg, #1d4ed8, #2563eb)", border: "none", color: "#fff", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", marginBottom: "0.5rem", boxShadow: "0 4px 14px rgba(37,99,235,0.3)" },
  btnGhost:     { width: "100%", padding: "0.7rem", borderRadius: "999px", background: "transparent", border: "1px solid rgba(0,0,0,0.1)", color: "#64748b", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", marginBottom: "0.5rem" },
  backBtn:      { background: "none", border: "none", color: "#2563eb", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: "1rem", display: "block" },
  privacyNote:  { fontSize: "0.7rem", color: "#94a3b8", lineHeight: 1.6, marginTop: "1.25rem", padding: "0.65rem 0.85rem", background: "#f8fafc", borderRadius: "0.5rem", border: "1px solid rgba(0,0,0,0.05)" },
  toggleBtn:    { flex: 1, padding: "0.55rem 0", borderRadius: "0.5rem", border: "1px solid rgba(0,0,0,0.1)", background: "#f8fafc", color: "#475569", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" },
  toggleActive: { background: "#eff6ff", borderColor: "#93c5fd", color: "#1d4ed8" },
  consentRow:   { display: "flex", alignItems: "flex-start", gap: "0.65rem", padding: "0.7rem 0.85rem", borderRadius: "0.65rem", background: "#f8fafc", border: "1px solid rgba(0,0,0,0.07)", marginBottom: "0.5rem", cursor: "pointer" },
};