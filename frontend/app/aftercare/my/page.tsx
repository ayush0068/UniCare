"use client";

/**
 * /aftercare/my/page.tsx  (UniCare)
 *
 * FIX: Reads userId from URL query param ?uid= (passed by HelpLink's
 * AftercareButton) instead of localStorage. This is reliable — localStorage
 * written by HelpLink on one port is not guaranteed to be read by UniCare
 * on another port before this page renders.
 *
 * URL example: /aftercare/my?uid=6801234abcdef
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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

const API_BASE = "http://localhost:8000/api";

export default function MyAftercarePage() {
  const searchParams = useSearchParams();

  // ✅ FIX: Read userId from URL query param ?uid=
  // HelpLink passes it directly in the redirect URL — no localStorage needed.
  const userId = searchParams?.get("uid") || "";

  const [cases,   setCases]   = useState<AftercareCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        if (!userId) {
          // No userId in URL — show access denied, not all cases
          setError("No user session found. Please go back to HelpLink and try again.");
          setLoading(false);
          return;
        }

        const res  = await fetch(`${API_BASE}/aftercare/my`, {
          headers: { "x-user-id": userId },
        });

        if (!res.ok) {
          setError("Failed to load your aftercare cases.");
          setLoading(false);
          return;
        }

        const data = await res.json();
        setCases(Array.isArray(data.cases) ? data.cases : []);
      } catch (err) {
        console.error("My aftercare fetch error:", err);
        setError("Failed to load your aftercare cases. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, [userId]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={s.centered}>
        <div style={s.spinner} />
        <p style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
          Loading your aftercare cases…
        </p>
      </div>
    );
  }

  // ── Error / no session ────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={s.centered}>
        <span style={{ fontSize: "2rem" }}>⚠️</span>
        <p style={{ color: "#dc2626", fontWeight: 600, textAlign: "center", maxWidth: 340 }}>
          {error}
        </p>
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (cases.length === 0) {
    return (
      <div style={s.centered}>
        <span style={{ fontSize: "2.5rem" }}>🏥</span>
        <p style={{ color: "#6b7280", marginTop: "0.75rem" }}>
          You have no aftercare cases yet.
        </p>
      </div>
    );
  }

  // ── Cases list ────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>🏥 My Aftercare</h1>
          <p style={s.subtitle}>Your personal aftercare history from HelpLink</p>
        </div>
        <span style={s.countBadge}>
          {cases.length} case{cases.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={s.grid}>
        {cases.map((c) => {
          const badge = STATUS_STYLES[c.status] ?? { bg: "#f3f4f6", color: "#374151" };
          return (
            <div key={c._id} style={s.card}>

              <div style={s.cardHeader}>
                <div style={s.avatar}>{(c.name?.[0] ?? "?").toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={s.cardName}>{c.name || "User"}</p>
                  <p style={s.cardMeta}>🔗 HelpLink · {formatDate(c.createdAt)}</p>
                </div>
                <span style={{ ...s.statusBadge, background: badge.bg, color: badge.color }}>
                  {c.status}
                </span>
              </div>

              <div style={s.divider} />

              <div style={s.detailGrid}>
                <Detail label="Incident Type" value={c.incidentType || "—"} />
                <Detail label="Time"          value={c.time ? formatDate(c.time) : "—"} />
                {c.notes && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Detail label="Notes" value={c.notes} />
                  </div>
                )}
                {c.location?.coordinates && (
                  <Detail
                    label="Location"
                    value={`${c.location.coordinates[1]?.toFixed(5)}, ${c.location.coordinates[0]?.toFixed(5)}`}
                  />
                )}
              </div>

              {c.userNote && c.userNote.trim() && (
                <UserNoteBlock note={c.userNote} />
              )}

              <p style={s.caseId}>{c._id}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── UserNoteBlock ─────────────────────────────────────────────────────────────
function UserNoteBlock({ note }: { note: string }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT     = 120;
  const isLong    = note.length > LIMIT;
  const displayed = expanded || !isLong ? note : note.slice(0, LIMIT) + "…";

  return (
    <div style={{
      marginTop: "0.85rem", padding: "0.65rem 0.85rem",
      borderRadius: "0.65rem", background: "#f0fdf4",
      border: "1px solid rgba(74,222,128,0.25)",
    }}>
      <p style={{ fontSize:"0.6rem", fontWeight:700, textTransform:"uppercase",
        letterSpacing:"0.08em", color:"#15803d", margin:"0 0 0.3rem" }}>
        📝 User Note
      </p>
      <p style={{ fontSize:"0.78rem", color:"#334155", margin:0, lineHeight:1.6, wordBreak:"break-word" }}>
        {displayed}
      </p>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)}
          style={{ background:"none", border:"none", color:"#2563eb",
            fontSize:"0.68rem", fontWeight:600, cursor:"pointer",
            padding:"0.25rem 0 0", display:"block" }}>
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
  page:       { minHeight:"100vh", background:"#f8fafc", padding:"2rem 1.25rem", fontFamily:"var(--font-sans,system-ui,sans-serif)" },
  centered:   { minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"0.75rem", fontFamily:"system-ui,sans-serif" },
  spinner:    { width:40, height:40, borderRadius:"50%", border:"3px solid #e2e8f0", borderTop:"3px solid #2563eb", animation:"spin 0.8s linear infinite" },
  header:     { display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:"0.75rem", maxWidth:900, margin:"0 auto 1.75rem" },
  title:      { fontSize:"1.6rem", fontWeight:700, color:"#0f172a", margin:0 },
  subtitle:   { fontSize:"0.82rem", color:"#64748b", margin:"0.25rem 0 0" },
  countBadge: { padding:"4px 14px", borderRadius:"999px", background:"#dbeafe", color:"#1e40af", fontSize:"0.72rem", fontWeight:700, alignSelf:"center" },
  grid:       { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:"1.25rem", maxWidth:900, margin:"0 auto" },
  card:       { background:"#fff", borderRadius:"1rem", padding:"1.25rem 1.5rem", boxShadow:"0 1px 3px rgba(0,0,0,0.07),0 4px 16px rgba(0,0,0,0.05)", border:"1px solid rgba(0,0,0,0.06)" },
  cardHeader: { display:"flex", alignItems:"center", gap:"0.75rem" },
  avatar:     { width:40, height:40, borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#7c3aed)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"1rem", flexShrink:0 },
  cardName:   { fontWeight:600, color:"#0f172a", fontSize:"0.92rem", margin:0 },
  cardMeta:   { fontSize:"0.68rem", color:"#94a3b8", margin:"2px 0 0" },
  statusBadge:{ padding:"3px 10px", borderRadius:"999px", fontSize:"0.62rem", fontWeight:700, textTransform:"capitalize" as const, flexShrink:0 },
  divider:    { height:1, background:"#f1f5f9", margin:"0.9rem 0" },
  detailGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.65rem 1rem" },
  detailLabel:{ fontSize:"0.6rem", fontWeight:700, textTransform:"uppercase" as const, letterSpacing:"0.08em", color:"#94a3b8", margin:0 },
  detailValue:{ fontSize:"0.8rem", color:"#334155", margin:"2px 0 0", wordBreak:"break-word" as const },
  caseId:     { fontSize:"0.5rem", color:"#cbd5e1", fontFamily:"monospace", marginTop:"0.75rem", marginBottom:0 },
};