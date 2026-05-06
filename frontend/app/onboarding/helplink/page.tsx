"use client";

/**
 * app/onboarding/helplink/page.tsx  — UPDATED
 *
 * CHANGES vs previous version:
 *   1. After transfer API call, shows a full "Recovery Account" screen with:
 *      - Aftercare incident summary (type, severity, summary, notes)
 *      - Credentials (email + password=123456) for NEW registered AND guest accounts
 *      - "Consult Now" button → goes to dashboard
 *      - "Copy Credentials" buttons
 *   2. For EXISTING accounts: shows a simpler welcome-back screen + Consult Now.
 *   3. Loading and Error screens unchanged.
 */

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Credentials {
  email:    string;
  password: string;
}

interface AftercaseDoc {
  _id:          string;
  incidentType: string;
  severity:     string;
  summary:      string;
  helperNotes:  string;
  notes:        string;
  status:       string;
  time:         string;
  userNote:     string;
}

interface TransferResponse {
  success:      boolean;
  accountType:  "existing" | "new_registered" | "guest";
  token:        string;
  patientId:    string;
  name:         string;
  isGuest:      boolean;
  credentials?: Credentials;
  aftercareCase?: AftercaseDoc | null;
  message?:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, { bg: string; color: string }> = {
  high:    { bg: "#fee2e2", color: "#991b1b" },
  medium:  { bg: "#fef3c7", color: "#92400e" },
  low:     { bg: "#d1fae5", color: "#065f46" },
  unknown: { bg: "#f3f4f6", color: "#374151" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Recovery Account Screen — shown after successful transfer
// ─────────────────────────────────────────────────────────────────────────────

function RecoveryAccountScreen({
  accountType,
  name,
  credentials,
  aftercareCase,
  onConsultNow,
}: {
  accountType:   "existing" | "new_registered" | "guest";
  name:          string;
  credentials?:  Credentials | null;
  aftercareCase?: AftercaseDoc | null;
  onConsultNow:  () => void;
}) {
  const [copied, setCopied] = useState<"email" | "password" | null>(null);

  const copy = (text: string, field: "email" | "password") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const severityStyle = SEVERITY_COLORS[aftercareCase?.severity?.toLowerCase() ?? "unknown"]
    ?? SEVERITY_COLORS.unknown;

  const isNew = accountType === "new_registered" || accountType === "guest";

  return (
    <div style={s.overlay}>
      <div style={s.card}>

        {/* Badge */}
        <div style={{ marginBottom: "0.9rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={s.badge}>
            {accountType === "guest" ? "🔑 Guest Recovery" : accountType === "existing" ? "✅ Welcome Back" : "💚 New Account"}
          </span>
        </div>

        {/* Title */}
        <h2 style={s.title}>
          {accountType === "existing"
            ? <>Your account is <span style={{ color: "#15803d", fontStyle: "italic" }}>ready.</span></>
            : <>Your recovery account <span style={{ color: "#15803d", fontStyle: "italic" }}>is set up.</span></>
          }
        </h2>
        <p style={s.subtitle}>
          Hi <strong>{name}</strong>. Your emergency data from HelpLink has been transferred to UniCare+.
        </p>

        {/* ── Credentials section (new accounts only) ──────────────────── */}
        {isNew && credentials && (
          <>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: "0 0 0.5rem" }}>
              Your Login Credentials
            </p>
            <div style={s.credBox}>
              <div style={s.credRow}>
                <div>
                  <p style={s.credLabel}>Email</p>
                  <p style={s.credValue}>{credentials.email}</p>
                </div>
                <button style={s.copyBtn} onClick={() => copy(credentials.email, "email")}>
                  {copied === "email" ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <div style={s.credDivider} />
              <div style={s.credRow}>
                <div>
                  <p style={s.credLabel}>Default Password</p>
                  <p style={{ ...s.credValue, fontFamily: "monospace", letterSpacing: "0.15em" }}>
                    {credentials.password}
                  </p>
                </div>
                <button style={s.copyBtn} onClick={() => copy(credentials.password, "password")}>
                  {copied === "password" ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div style={s.warning}>
              <span style={{ fontSize: "1rem" }}>🔒</span>
              <p style={{ margin: 0, fontSize: "0.7rem", color: "#92400e", lineHeight: 1.5 }}>
                Save these credentials — they won't be shown again. Change your password from your profile after logging in.
              </p>
            </div>
          </>
        )}

        {/* ── Aftercare Case Summary ────────────────────────────────────── */}
        {aftercareCase && (
          <div style={s.caseCard}>
            <p style={s.sectionLabel}>📋 Incident Summary</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem 1rem", marginBottom: "0.75rem" }}>
              <div>
                <p style={s.detailLabel}>Incident Type</p>
                <p style={s.detailValue}>{aftercareCase.incidentType || "—"}</p>
              </div>
              <div>
                <p style={s.detailLabel}>Severity</p>
                <span style={{
                  display: "inline-block",
                  padding: "2px 10px", borderRadius: 999,
                  fontSize: "0.7rem", fontWeight: 700,
                  background: severityStyle.bg, color: severityStyle.color,
                  textTransform: "capitalize",
                }}>
                  {aftercareCase.severity || "unknown"}
                </span>
              </div>
              {aftercareCase.time && (
                <div>
                  <p style={s.detailLabel}>Time of Incident</p>
                  <p style={s.detailValue}>{formatDate(aftercareCase.time)}</p>
                </div>
              )}
              <div>
                <p style={s.detailLabel}>Recovery Status</p>
                <p style={{ ...s.detailValue, textTransform: "capitalize" }}>{aftercareCase.status || "pending"}</p>
              </div>
            </div>

            {aftercareCase.summary && (
              <div style={{ marginBottom: "0.65rem" }}>
                <p style={s.detailLabel}>Summary</p>
                <p style={{ ...s.detailValue, lineHeight: 1.6 }}>{aftercareCase.summary}</p>
              </div>
            )}

            {aftercareCase.notes && (
              <div style={{ marginBottom: "0.65rem" }}>
                <p style={s.detailLabel}>Incident Notes</p>
                <p style={{ ...s.detailValue, lineHeight: 1.6 }}>{aftercareCase.notes}</p>
              </div>
            )}

            {aftercareCase.helperNotes && (
              <div style={{ marginBottom: "0.65rem" }}>
                <p style={s.detailLabel}>Responder Notes</p>
                <p style={{ ...s.detailValue, lineHeight: 1.6, color: "#1e40af" }}>
                  {aftercareCase.helperNotes}
                </p>
              </div>
            )}

            {aftercareCase.userNote && (
              <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "0.55rem 0.75rem", border: "1px solid rgba(74,222,128,0.25)" }}>
                <p style={{ ...s.detailLabel, color: "#15803d", margin: "0 0 0.2rem" }}>Your Note</p>
                <p style={{ ...s.detailValue, margin: 0 }}>{aftercareCase.userNote}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Consult Now CTA ─────────────────────────────────────────── */}
        <button style={s.consultBtn} onClick={onConsultNow}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0 }}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 .82h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16l.92.92z"/>
          </svg>
          Consult Now — Go to Dashboard
        </button>

        <p style={{ fontSize: "0.65rem", color: "#a8a29e", textAlign: "center", margin: "0.75rem 0 0" }}>
          You can book a doctor consultation from your dashboard at any time.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading + Error screens (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <div style={s.overlay}>
      <div style={{ textAlign: "center" }}>
        <div style={s.spinner} />
        <p style={{ color: "#78716c", fontSize: "0.9rem", marginTop: "1rem" }}>{message}</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div style={s.overlay}>
      <div style={{ ...s.card, maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⚠️</div>
        <h2 style={{ ...s.title, fontSize: "1.2rem" }}>Something went wrong</h2>
        <p style={{ ...s.subtitle, marginBottom: "1.5rem" }}>{message}</p>
        <a href="/" style={{ ...s.consultBtn, display: "inline-block", textDecoration: "none" }}>
          Return to Home
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main inner component
// ─────────────────────────────────────────────────────────────────────────────

function HelpLinkOnboardingContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [stage,        setStage]        = useState<"loading" | "account" | "error">("loading");
  const [loadingMsg,   setLoadingMsg]   = useState("Setting up your recovery account…");
  const [errorMsg,     setErrorMsg]     = useState("");
  const [transferData, setTransferData] = useState<{
    accountType:   TransferResponse["accountType"];
    name:          string;
    credentials?:  Credentials | null;
    aftercareCase?: AftercaseDoc | null;
  } | null>(null);

  const performTransfer = useCallback(async () => {
    try {
      const email     = searchParams?.get("email")     || null;
      const name      = searchParams?.get("name")      || "Patient";
      const requestId = searchParams?.get("requestId") || null;
      const incident  = searchParams?.get("incident")  || "unknown";
      const summary   = searchParams?.get("summary")   || "";

      const payload = {
        email:        email ? decodeURIComponent(email) : null,
        name:         decodeURIComponent(name),
        requestId,
        incidentType: decodeURIComponent(incident),
        summary:      decodeURIComponent(summary),
        timestamp:    new Date().toISOString(),
      };

      setLoadingMsg("Connecting to UniCare+ servers…");

      const res = await fetch(`${API_BASE}/helplink/transfer`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key":    process.env.NEXT_PUBLIC_AFTERCARE_SECRET || "",
        },
        body: JSON.stringify(payload),
      });

      const data: TransferResponse = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || "Transfer failed. Please try again.");
        setStage("error");
        return;
      }

      // Store JWT in localStorage (same key used by existing UniCare auth)
      localStorage.setItem("token",    data.token);
      localStorage.setItem("userId",   data.patientId);
      localStorage.setItem("userType", "patient");

      setTransferData({
        accountType:   data.accountType,
        name:          data.name,
        credentials:   data.credentials ?? null,
        aftercareCase: data.aftercareCase ?? null,
      });
      setStage("account");

    } catch (err: unknown) {
      console.error("[HelpLinkOnboarding] error:", err);
      setErrorMsg("Unable to connect to UniCare+. Please try again later.");
      setStage("error");
    }
  }, [searchParams]);

  useEffect(() => {
    performTransfer();
  }, [performTransfer]);

  const goToDashboard = () => router.replace("/patient/dashboard");

  if (stage === "loading")  return <LoadingScreen message={loadingMsg} />;
  if (stage === "error")    return <ErrorScreen message={errorMsg} />;
  if (stage === "account" && transferData) {
    return (
      <RecoveryAccountScreen
        accountType={transferData.accountType}
        name={transferData.name}
        credentials={transferData.credentials}
        aftercareCase={transferData.aftercareCase}
        onConsultNow={goToDashboard}
      />
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page export
// ─────────────────────────────────────────────────────────────────────────────

export default function HelpLinkOnboardingPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Preparing your account…" />}>
      <HelpLinkOnboardingContent />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  overlay: {
    minHeight:      "100vh",
    background:     "#f9fafb",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    padding:        "1.5rem",
    fontFamily:     "'DM Sans', 'Helvetica Neue', sans-serif",
  },
  card: {
    background:   "#ffffff",
    borderRadius: "24px",
    padding:      "2.25rem",
    maxWidth:     "520px",
    width:        "100%",
    boxShadow:    "0 4px 40px rgba(0,0,0,0.09)",
    border:       "1px solid rgba(0,0,0,0.06)",
  },
  badge: {
    display:       "inline-flex",
    alignItems:    "center",
    padding:       "4px 13px",
    borderRadius:  "100px",
    border:        "1px solid rgba(21,128,61,0.3)",
    color:         "#15803d",
    fontSize:      "10px",
    fontWeight:    700,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    background:    "rgba(240,253,244,0.8)",
  },
  title: {
    fontFamily:    "'Fraunces', Georgia, serif",
    fontSize:      "clamp(1.3rem, 4vw, 1.7rem)",
    fontWeight:    600,
    lineHeight:    1.15,
    letterSpacing: "-0.015em",
    color:         "#1c1917",
    margin:        "0.5rem 0 0.35rem",
  },
  subtitle: {
    fontSize:     "0.82rem",
    color:        "#78716c",
    lineHeight:   1.65,
    marginBottom: "1.25rem",
  },
  credBox: {
    background:   "#f9fafb",
    border:       "1px solid rgba(0,0,0,0.08)",
    borderRadius: "16px",
    padding:      "1.25rem",
    marginBottom: "0.85rem",
  },
  credRow: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
  },
  credLabel: {
    fontSize:      "0.68rem",
    fontWeight:    700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color:         "#9ca3af",
    margin:        "0 0 2px",
  },
  credValue: {
    fontSize:  "0.9rem",
    fontWeight: 600,
    color:      "#1c1917",
    margin:     0,
    wordBreak:  "break-all" as const,
  },
  credDivider: {
    height:     "1px",
    background: "rgba(0,0,0,0.07)",
    margin:     "1rem 0",
  },
  copyBtn: {
    padding:      "6px 14px",
    borderRadius: "100px",
    border:       "1px solid rgba(0,0,0,0.1)",
    background:   "#ffffff",
    fontSize:     "0.72rem",
    fontWeight:   600,
    color:        "#44403c",
    cursor:       "pointer",
    flexShrink:   0,
    marginLeft:   "0.75rem",
    whiteSpace:   "nowrap" as const,
  },
  warning: {
    display:      "flex",
    alignItems:   "flex-start",
    gap:          "0.6rem",
    background:   "#fffbeb",
    border:       "1px solid #fde68a",
    borderRadius: "12px",
    padding:      "0.85rem",
    marginBottom: "1.25rem",
  },
  caseCard: {
    background:    "#f8fafc",
    border:        "1px solid rgba(0,0,0,0.07)",
    borderRadius:  "16px",
    padding:       "1.1rem 1.2rem",
    marginBottom:  "1.25rem",
  },
  sectionLabel: {
    fontSize:      "0.68rem",
    fontWeight:    700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color:         "#64748b",
    margin:        "0 0 0.75rem",
  },
  detailLabel: {
    fontSize:      "0.62rem",
    fontWeight:    700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color:         "#94a3b8",
    margin:        "0 0 2px",
  },
  detailValue: {
    fontSize:  "0.82rem",
    color:     "#334155",
    margin:    "2px 0 0",
    wordBreak: "break-word" as const,
  },
  consultBtn: {
    display:       "flex",
    alignItems:    "center",
    justifyContent:"center",
    gap:           "0.6rem",
    width:         "100%",
    padding:       "14px 0",
    borderRadius:  "100px",
    background:    "linear-gradient(135deg, #15803d, #16a34a)",
    color:         "#fff",
    fontSize:      "0.88rem",
    fontWeight:    700,
    textAlign:     "center" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    border:        "none",
    cursor:        "pointer",
    boxShadow:     "0 4px 20px rgba(21,128,61,0.3)",
    transition:    "transform 0.15s, box-shadow 0.15s",
  },
  spinner: {
    width:        "36px",
    height:       "36px",
    border:       "3px solid rgba(21,128,61,0.15)",
    borderTop:    "3px solid #15803d",
    borderRadius: "50%",
    animation:    "spin 0.85s linear infinite",
    margin:       "0 auto",
  },
};