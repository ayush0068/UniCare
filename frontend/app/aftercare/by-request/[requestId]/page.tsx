"use client";

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
  // ✅ NEW
  userNote?:    string;
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#fef9c3", color: "#854d0e" },
  active:   { bg: "#dbeafe", color: "#1e40af" },
  resolved: { bg: "#dcfce7", color: "#15803d" },
  closed:   { bg: "#f3f4f6", color: "#6b7280" },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

// const API_BASE = "http://localhost:8000/api";
const API_BASE = 'https://unicare-in47.onrender.com/api';

export default function GuestAftercarePage() {
  const params       = useParams();
  const searchParams = useSearchParams();

  const requestId = params?.requestId as string;
  const guestId   = searchParams?.get("guestId") || "";

  const [data,    setData]    = useState<AftercareCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

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

  const badge = STATUS_STYLES[data.status] ?? { bg: "#f3f4f6", color: "#374151" };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>🏥 Your Aftercare Case</h1>
        <p style={s.subtitle}>Transferred from HelpLink · For your reference</p>
      </div>

      <div style={s.card}>
        {/* Top row — unchanged */}
        <div style={s.topRow}>
          <div style={s.avatar}>{(data.name?.[0] ?? "G").toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <p style={s.name}>{data.name || "Guest User"}</p>
            <p style={s.meta}>🔗 HelpLink · {formatDate(data.createdAt)}</p>
          </div>
          <span style={{ ...s.badge, background: badge.bg, color: badge.color }}>{data.status}</span>
        </div>

        <div style={s.divider} />

        {/* Details — unchanged */}
        <div style={s.grid}>
          <Detail label="Incident Type" value={data.incidentType || "—"} />
          <Detail label="Time"          value={data.time ? formatDate(data.time) : "—"} />
          {data.notes && (
            <div style={{ gridColumn: "1 / -1" }}>
              <Detail label="Notes" value={data.notes} />
            </div>
          )}
          {data.location?.coordinates && (
            <Detail
              label="Location"
              value={`${data.location.coordinates[1]?.toFixed(5)}, ${data.location.coordinates[0]?.toFixed(5)}`}
            />
          )}
        </div>

        {/* ✅ NEW — User note block (only rendered when note exists) */}
        {data.userNote && data.userNote.trim() && (
          <UserNoteBlock note={data.userNote} />
        )}

        <p style={s.caseId}>{data._id}</p>
      </div>

      <div style={s.privacyNote}>
        🔒 This case is only accessible to you via your unique session link.
      </div>
    </div>
  );
}

// ── UserNoteBlock — read-more after 120 chars (same as user page) ─────────────
function UserNoteBlock({ note }: { note: string }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT    = 120;
  const isLong   = note.length > LIMIT;
  const displayed = expanded || !isLong ? note : note.slice(0, LIMIT) + "…";

  return (
    <div style={{
      marginTop:    "0.85rem",
      padding:      "0.65rem 0.85rem",
      borderRadius: "0.65rem",
      background:   "#f0fdf4",
      border:       "1px solid rgba(74,222,128,0.25)",
    }}>
      <p style={{ fontSize:"0.6rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"#15803d", margin:"0 0 0.3rem" }}>
        📝 User Note
      </p>
      <p style={{ fontSize:"0.78rem", color:"#334155", margin:0, lineHeight:1.6, wordBreak:"break-word" }}>
        {displayed}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background:"none", border:"none", color:"#2563eb", fontSize:"0.68rem", fontWeight:600, cursor:"pointer", padding:"0.25rem 0 0", display:"block" }}
        >
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
  page:       { minHeight: "100vh", background: "#f8fafc", padding: "2rem 1.25rem", fontFamily: "var(--font-sans, system-ui, sans-serif)" },
  centered:   { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", fontFamily: "system-ui, sans-serif" },
  spinner:    { width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", animation: "spin 0.8s linear infinite" },
  header:     { maxWidth: 560, margin: "0 auto 1.5rem" },
  title:      { fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 },
  subtitle:   { fontSize: "0.8rem", color: "#64748b", margin: "0.25rem 0 0" },
  card:       { maxWidth: 560, margin: "0 auto", background: "#fff", borderRadius: "1rem", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 8px 24px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" },
  topRow:     { display: "flex", alignItems: "center", gap: "0.75rem" },
  avatar:     { width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.1rem", flexShrink: 0 },
  name:       { fontWeight: 600, color: "#0f172a", fontSize: "0.95rem", margin: 0 },
  meta:       { fontSize: "0.68rem", color: "#94a3b8", margin: "2px 0 0" },
  badge:      { padding: "3px 12px", borderRadius: "999px", fontSize: "0.62rem", fontWeight: 700, textTransform: "capitalize" as const, flexShrink: 0 },
  divider:    { height: 1, background: "#f1f5f9", margin: "1rem 0" },
  grid:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 1rem" },
  detailLabel:{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#94a3b8", margin: 0 },
  detailValue:{ fontSize: "0.82rem", color: "#334155", margin: "2px 0 0", wordBreak: "break-word" as const },
  caseId:     { fontSize: "0.5rem", color: "#cbd5e1", fontFamily: "monospace", marginTop: "1rem", marginBottom: 0 },
  privacyNote:{ maxWidth: 560, margin: "1rem auto 0", fontSize: "0.7rem", color: "#64748b", textAlign: "center" as const },
};