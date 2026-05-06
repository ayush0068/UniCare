"use client";

/**
 * app/aftercare/by-request/[requestId]/page.tsx  — UPDATED
 *
 * CHANGES vs previous version:
 *   1. Added "Consult Now" button at the bottom of the case card.
 *      Clicking it triggers the full UniCare onboarding transfer for guests:
 *        → Calls POST /api/helplink/transfer (no email → guest account)
 *        → Shows credentials screen (email + password=123456)
 *        → Redirects to /patient/dashboard
 *   2. Shows severity badge and summary/helperNotes if present in the case.
 *   3. All existing read-only display logic is unchanged.
 */

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface AftercareCase {
  _id:          string;
  name:         string;
  incidentType: string;
  notes:        string;
  location:     { type?: string; coordinates?: number[] } | null;
  time:         string;
  status:       string;
  source:       string;
  createdAt:    string;
  requestId?:   string;
  guestId?:     string;
  userNote?:    string;
  // new fields
  severity?:    string;
  summary?:     string;
  helperNotes?: string;
}

interface ConsultCredentials {
  email:    string;
  password: string;
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#fef9c3", color: "#854d0e" },
  active:   { bg: "#dbeafe", color: "#1e40af" },
  resolved: { bg: "#dcfce7", color: "#15803d" },
  closed:   { bg: "#f3f4f6", color: "#6b7280" },
};

const SEVERITY_COLORS: Record<string, { bg: string; color: string }> = {
  high:    { bg: "#fee2e2", color: "#991b1b" },
  medium:  { bg: "#fef3c7", color: "#92400e" },
  low:     { bg: "#d1fae5", color: "#065f46" },
  unknown: { bg: "#f3f4f6", color: "#374151" },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://unicare-in47.onrender.com/api";

// ─────────────────────────────────────────────────────────────────────────────
// Credentials Modal — shown after "Consult Now" transfer
// ─────────────────────────────────────────────────────────────────────────────

function CredentialsModal({
  credentials,
  onGoToDashboard,
}: {
  credentials:    ConsultCredentials;
  onGoToDashboard: () => void;
}) {
  const [copied, setCopied] = useState<"email" | "password" | null>(null);

  const copy = (text: string, field: "email" | "password") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: "1.25rem",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "2rem",
        maxWidth: 440, width: "100%",
        boxShadow: "0 8px 40px rgba(0,0,0,0.16)",
      }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <span style={{ padding: "3px 12px", borderRadius: 999, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 10, fontWeight: 700, color: "#92400e", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            🔑 Guest Recovery Account
          </span>
        </div>
        <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.35rem", fontWeight: 600, color: "#1c1917", margin: "0 0 0.3rem" }}>
          Your UniCare+ account is ready.
        </h3>
        <p style={{ fontSize: "0.78rem", color: "#78716c", marginBottom: "1.25rem", lineHeight: 1.65 }}>
          Save these credentials to access your recovery dashboard anytime.
        </p>

        <div style={{ background: "#f9fafb", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: "1.1rem", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: "0 0 2px" }}>Email</p>
              <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1c1917", margin: 0, wordBreak: "break-all" }}>{credentials.email}</p>
            </div>
            <button onClick={() => copy(credentials.email, "email")} style={{ padding: "5px 12px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", marginLeft: "0.75rem", whiteSpace: "nowrap" }}>
              {copied === "email" ? "✓" : "Copy"}
            </button>
          </div>
          <div style={{ height: 1, background: "rgba(0,0,0,0.07)", margin: "0.85rem 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: "0 0 2px" }}>Password</p>
              <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1c1917", margin: 0, fontFamily: "monospace", letterSpacing: "0.15em" }}>{credentials.password}</p>
            </div>
            <button onClick={() => copy(credentials.password, "password")} style={{ padding: "5px 12px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", marginLeft: "0.75rem", whiteSpace: "nowrap" }}>
              {copied === "password" ? "✓" : "Copy"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "0.75rem", marginBottom: "1.25rem" }}>
          <span>🔒</span>
          <p style={{ margin: 0, fontSize: "0.7rem", color: "#92400e", lineHeight: 1.5 }}>
            These credentials won't be shown again. Please save them now. You can change your password from your profile.
          </p>
        </div>

        <button
          onClick={onGoToDashboard}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", padding: "13px 0", borderRadius: 100, background: "linear-gradient(135deg,#15803d,#16a34a)", color: "#fff", fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(21,128,61,0.28)" }}>
          Go to Dashboard →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function GuestAftercarePage() {
  const params       = useParams();
  const searchParams = useSearchParams();

  const requestId = params?.requestId as string;
  const guestId   = searchParams?.get("guestId") || "";

  const [data,         setData]         = useState<AftercareCase | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [consulting,   setConsulting]   = useState(false);
  const [consultError, setConsultError] = useState<string | null>(null);
  const [credentials,  setCredentials]  = useState<ConsultCredentials | null>(null);

  useEffect(() => {
    if (!requestId) return;
    const fetchCase = async () => {
      try {
        const qs  = guestId ? `?guestId=${encodeURIComponent(guestId)}` : "";
        const res = await fetch(`${API_BASE}/aftercare/by-request/${requestId}${qs}`);

        if (res.status === 403) { setError("Access denied. This case does not belong to your session."); return; }
        if (res.status === 404) { setError("Aftercare case not found."); return; }

        const json = await res.json();
        setData(json.case || null);
      } catch (err) {
        console.error("Guest aftercare fetch error:", err);
        setError("Failed to load your aftercare case. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [requestId, guestId]);

  // ── Consult Now — creates a UniCare guest account ────────────────────────
  const handleConsultNow = async () => {
    if (!data) return;
    setConsulting(true);
    setConsultError(null);

    try {
      const payload = {
        email:        null,              // guest → no email → temp account
        name:         data.name || "Guest User",
        requestId:    data.requestId || requestId,
        incidentType: data.incidentType || "unknown",
        severity:     data.severity     || "unknown",
        summary:      data.summary      || "",
        helperNotes:  data.helperNotes  || "",
        timestamp:    new Date().toISOString(),
      };

      const res = await fetch(`${API_BASE}/helplink/transfer`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key":    process.env.NEXT_PUBLIC_AFTERCARE_SECRET || "",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!json.success) {
        setConsultError(json.message || "Could not create your account. Please try again.");
        setConsulting(false);
        return;
      }

      // Store token
      if (json.token) {
        localStorage.setItem("token",    json.token);
        localStorage.setItem("userId",   json.patientId);
        localStorage.setItem("userType", "patient");
      }

      // Show credentials modal before redirect
      if (json.credentials) {
        setCredentials(json.credentials);
      } else {
        window.location.href = "/patient/dashboard";
      }

    } catch (err) {
      console.error("Consult Now error:", err);
      setConsultError("Unable to connect. Please try again.");
      setConsulting(false);
    }
  };

  // ── Render states ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={s.centered}>
        <div style={s.spinner} />
        <p style={{ color: "#9ca3af", fontSize: "0.8rem" }}>Loading your aftercare case…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={s.centered}>
        <span style={{ fontSize: "2rem" }}>⚠️</span>
        <p style={{ color: "#dc2626", fontWeight: 600, textAlign: "center", maxWidth: 320 }}>
          {error || "Case not found."}
        </p>
      </div>
    );
  }

  const badge        = STATUS_STYLES[data.status] ?? { bg: "#f3f4f6", color: "#374151" };
  const severityStyle = SEVERITY_COLORS[data.severity?.toLowerCase() ?? "unknown"] ?? SEVERITY_COLORS.unknown;

  return (
    <>
      {/* Credentials modal (shown after Consult Now) */}
      {credentials && (
        <CredentialsModal
          credentials={credentials}
          onGoToDashboard={() => { window.location.href = "/patient/dashboard"; }}
        />
      )}

      <div style={s.page}>
        <div style={s.header}>
          <h1 style={s.title}>🏥 Your Aftercare Case</h1>
          <p style={s.subtitle}>Transferred from HelpLink · For your reference</p>
        </div>

        <div style={s.card}>
          {/* Top row */}
          <div style={s.topRow}>
            <div style={s.avatar}>{(data.name?.[0] ?? "G").toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <p style={s.name}>{data.name || "Guest User"}</p>
              <p style={s.meta}>🔗 HelpLink · {formatDate(data.createdAt)}</p>
            </div>
            <span style={{ ...s.badge, background: badge.bg, color: badge.color }}>{data.status}</span>
          </div>

          <div style={s.divider} />

          {/* Details grid */}
          <div style={s.grid}>
            <Detail label="Incident Type" value={data.incidentType || "—"} />
            <div>
              <p style={s.detailLabel}>Severity</p>
              <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700, background: severityStyle.bg, color: severityStyle.color, textTransform: "capitalize" }}>
                {data.severity || "unknown"}
              </span>
            </div>
            <Detail label="Time" value={data.time ? formatDate(data.time) : "—"} />
            {data.location?.coordinates && (
              <Detail
                label="Location"
                value={`${data.location.coordinates[1]?.toFixed(5)}, ${data.location.coordinates[0]?.toFixed(5)}`}
              />
            )}
          </div>

          {/* Full-width fields */}
          {data.summary && (
            <div style={{ marginTop: "0.85rem" }}>
              <p style={s.detailLabel}>Summary</p>
              <p style={{ ...s.detailValue, lineHeight: 1.65 }}>{data.summary}</p>
            </div>
          )}
          {data.notes && (
            <div style={{ marginTop: "0.75rem" }}>
              <p style={s.detailLabel}>Incident Notes</p>
              <p style={{ ...s.detailValue, lineHeight: 1.65 }}>{data.notes}</p>
            </div>
          )}
          {data.helperNotes && (
            <div style={{ marginTop: "0.75rem" }}>
              <p style={s.detailLabel}>Responder Notes</p>
              <p style={{ ...s.detailValue, lineHeight: 1.65, color: "#1e40af" }}>{data.helperNotes}</p>
            </div>
          )}

          {data.userNote && data.userNote.trim() && (
            <UserNoteBlock note={data.userNote} />
          )}

          <div style={s.divider} />

          {/* ── Consult Now CTA ──────────────────────────────────────── */}
          {consultError && (
            <p style={{ fontSize: "0.72rem", color: "#dc2626", marginBottom: "0.75rem", textAlign: "center" }}>
              ⚠️ {consultError}
            </p>
          )}

          <button
            onClick={handleConsultNow}
            disabled={consulting}
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            "0.5rem",
              width:          "100%",
              padding:        "13px 0",
              borderRadius:   100,
              background:     consulting ? "rgba(21,128,61,0.5)" : "linear-gradient(135deg,#15803d,#16a34a)",
              color:          "#fff",
              fontSize:       "0.85rem",
              fontWeight:     700,
              textTransform:  "uppercase",
              letterSpacing:  "0.1em",
              border:         "none",
              cursor:         consulting ? "default" : "pointer",
              boxShadow:      consulting ? "none" : "0 4px 16px rgba(21,128,61,0.28)",
              marginBottom:   "0.5rem",
            }}
          >
            {consulting ? (
              <>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", animation: "spin 0.8s linear infinite" }} />
                Setting up your account…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 .82h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16l.92.92z"/>
                </svg>
                Consult Now — Create My Account
              </>
            )}
          </button>

          <p style={{ fontSize: "0.65rem", color: "#94a3b8", textAlign: "center", margin: 0 }}>
            A free UniCare+ account will be created so you can book a doctor consultation.
          </p>

          <p style={s.caseId}>{data._id}</p>
        </div>

        <div style={s.privacyNote}>
          🔒 This case is only accessible to you via your unique session link.
        </div>
      </div>

      {/* Spinner keyframes */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

function UserNoteBlock({ note }: { note: string }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT    = 120;
  const isLong   = note.length > LIMIT;
  const displayed = expanded || !isLong ? note : note.slice(0, LIMIT) + "…";

  return (
    <div style={{ marginTop: "0.85rem", padding: "0.65rem 0.85rem", borderRadius: "0.65rem", background: "#f0fdf4", border: "1px solid rgba(74,222,128,0.25)" }}>
      <p style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#15803d", margin: "0 0 0.3rem" }}>
        📝 Your Note
      </p>
      <p style={{ fontSize: "0.78rem", color: "#334155", margin: 0, lineHeight: 1.6, wordBreak: "break-word" }}>
        {displayed}
      </p>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", color: "#2563eb", fontSize: "0.68rem", fontWeight: 600, cursor: "pointer", padding: "0.25rem 0 0", display: "block" }}>
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={s.detailLabel}>{label}</p>
      <p style={s.detailValue}>{value}</p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:        { minHeight: "100vh", background: "#f8fafc", padding: "2rem 1.25rem", fontFamily: "var(--font-sans, system-ui, sans-serif)" },
  centered:    { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", fontFamily: "system-ui, sans-serif" },
  spinner:     { width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", animation: "spin 0.8s linear infinite" },
  header:      { maxWidth: 560, margin: "0 auto 1.5rem" },
  title:       { fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 },
  subtitle:    { fontSize: "0.8rem", color: "#64748b", margin: "0.25rem 0 0" },
  card:        { maxWidth: 560, margin: "0 auto", background: "#fff", borderRadius: "1rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 8px 24px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" },
  topRow:      { display: "flex", alignItems: "center", gap: "0.75rem" },
  avatar:      { width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.1rem", flexShrink: 0 },
  name:        { fontWeight: 600, color: "#0f172a", fontSize: "0.95rem", margin: 0 },
  meta:        { fontSize: "0.68rem", color: "#94a3b8", margin: "2px 0 0" },
  badge:       { padding: "3px 12px", borderRadius: "999px", fontSize: "0.62rem", fontWeight: 700, textTransform: "capitalize" as const, flexShrink: 0 },
  divider:     { height: 1, background: "#f1f5f9", margin: "1rem 0" },
  grid:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 1rem" },
  detailLabel: { fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#94a3b8", margin: 0 },
  detailValue: { fontSize: "0.82rem", color: "#334155", margin: "2px 0 0", wordBreak: "break-word" as const },
  caseId:      { fontSize: "0.5rem", color: "#cbd5e1", fontFamily: "monospace", marginTop: "1rem", marginBottom: 0 },
  privacyNote: { maxWidth: 560, margin: "1rem auto 0", fontSize: "0.7rem", color: "#64748b", textAlign: "center" as const },
};