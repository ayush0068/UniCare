"use client";

/**
 * app/onboarding/helplink/page.tsx
 *
 * Entry point for users coming from HelpLink via the "Continue to Aftercare"
 * button. This page handles the conditional onboarding flow:
 *
 *   CASE 1 (registered user)  — email present in URL params
 *     → Calls POST /api/helplink/transfer
 *     → Gets JWT back, stores in localStorage
 *     → Redirects to /patient/dashboard
 *
 *   CASE 2 (guest user)  — no email, guestId may be present
 *     → Same API call, gets JWT + temporary credentials
 *     → Shows credentials screen before redirecting to dashboard
 *
 * URL params (from HelpLink AftercareButton):
 *   ?uid=<helplinkUserId>          (registered flow)
 *   ?guestId=<helplinkGuestId>     (guest flow)
 *   &requestId=<helplinkRequestId> (both flows)
 *   &email=<encodedEmail>          (registered flow only)
 *   &name=<encodedName>            (both)
 *   &incident=<type>               (both)
 *   &summary=<text>                (both)
 *
 * HelpLink's AftercareButton.jsx will need a small update to point to
 * this page (see HelpLink patch file).
 */

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TransferResponse {
  success:     boolean;
  accountType: "existing" | "new_registered" | "guest";
  token:       string;
  patientId:   string;
  name:        string;
  isGuest:     boolean;
  credentials?: {
    email:    string;
    password: string;
  };
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Credential Screen — shown once to guests before dashboard redirect
// ─────────────────────────────────────────────────────────────────────────────

function GuestCredentialsScreen({
  credentials,
  onContinue,
}: {
  credentials: { email: string; password: string };
  onContinue:  () => void;
}) {
  const [copied, setCopied] = useState<"email" | "password" | null>(null);

  const copy = (text: string, field: "email" | "password") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        {/* Badge */}
        <div style={{ marginBottom: "0.9rem" }}>
          <span style={s.badge}>Temporary Access</span>
        </div>

        {/* Title */}
        <h2 style={s.title}>Your Recovery Account</h2>
        <p style={s.subtitle}>
          Save these credentials — you can use them anytime to access your
          UniCare+ recovery dashboard.
        </p>

        {/* Credentials box */}
        <div style={s.credBox}>
          {/* Email row */}
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

          {/* Password row */}
          <div style={s.credRow}>
            <div>
              <p style={s.credLabel}>Password</p>
              <p style={{ ...s.credValue, fontFamily: "monospace", letterSpacing: "0.15em" }}>
                {credentials.password}
              </p>
            </div>
            <button style={s.copyBtn} onClick={() => copy(credentials.password, "password")}>
              {copied === "password" ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Warning */}
        <div style={s.warning}>
          <span style={{ fontSize: "1rem" }}>🔒</span>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "#92400e", lineHeight: 1.5 }}>
            These credentials will not be shown again. Please save them now.
          </p>
        </div>

        {/* CTA */}
        <button style={s.continueBtn} onClick={onContinue}>
          Continue to Dashboard →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading Screen
// ─────────────────────────────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <div style={s.overlay}>
      <div style={{ textAlign: "center" }}>
        <div style={s.spinner} />
        <p style={{ color: "#78716c", fontSize: "0.9rem", marginTop: "1rem" }}>
          {message}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Screen
// ─────────────────────────────────────────────────────────────────────────────

function ErrorScreen({ message }: { message: string }) {
  return (
    <div style={s.overlay}>
      <div style={{ ...s.card, maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⚠️</div>
        <h2 style={{ ...s.title, fontSize: "1.2rem" }}>Something went wrong</h2>
        <p style={{ ...s.subtitle, marginBottom: "1.5rem" }}>{message}</p>
        <a href="/" style={{ ...s.continueBtn, display: "inline-block", textDecoration: "none" }}>
          Return to Home
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main inner component (uses useSearchParams — must be inside Suspense)
// ─────────────────────────────────────────────────────────────────────────────

function HelpLinkOnboardingContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [stage, setStage]             = useState<"loading" | "credentials" | "error">("loading");
  const [loadingMsg, setLoadingMsg]   = useState("Setting up your recovery account…");
  const [errorMsg, setErrorMsg]       = useState("");
  const [guestCreds, setGuestCreds]   = useState<{ email: string; password: string } | null>(null);

  const performTransfer = useCallback(async () => {
    try {
      const email     = searchParams?.get("email")     || null;
      const name      = searchParams?.get("name")      || "Patient";
      const requestId = searchParams?.get("requestId") || null;
      const incident  = searchParams?.get("incident")  || "unknown";
      const summary   = searchParams?.get("summary")   || "";

      const payload = {
        email:         email ? decodeURIComponent(email) : null,
        name:          decodeURIComponent(name),
        requestId,
        incidentType:  decodeURIComponent(incident),
        summary:       decodeURIComponent(summary),
        timestamp:     new Date().toISOString(),
      };

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
      localStorage.setItem("token",   data.token);
      localStorage.setItem("userId",  data.patientId);
      localStorage.setItem("userType","patient");

      if (data.isGuest && data.credentials) {
        // Guest: show credentials screen first
        setGuestCreds(data.credentials);
        setStage("credentials");
      } else {
        // Registered: redirect immediately
        router.replace("/patient/dashboard");
      }

    } catch (err: unknown) {
      console.error("[HelpLinkOnboarding] error:", err);
      setErrorMsg("Unable to connect to UniCare+. Please try again later.");
      setStage("error");
    }
  }, [searchParams, router]);

  useEffect(() => {
    performTransfer();
  }, [performTransfer]);

  if (stage === "loading") return <LoadingScreen message={loadingMsg} />;
  if (stage === "error")   return <ErrorScreen message={errorMsg} />;
  if (stage === "credentials" && guestCreds) {
    return (
      <GuestCredentialsScreen
        credentials={guestCreds}
        onContinue={() => router.replace("/patient/dashboard")}
      />
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page export (wraps inner component in Suspense — required by Next.js for
// any page using useSearchParams)
// ─────────────────────────────────────────────────────────────────────────────

export default function HelpLinkOnboardingPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Preparing your account…" />}>
      <HelpLinkOnboardingContent />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline styles (healthcare minimal, matches UniCare dashboard palette)
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
    maxWidth:     "480px",
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
    fontSize:   "0.82rem",
    color:      "#78716c",
    lineHeight: 1.65,
    marginBottom: "1.5rem",
  },
  credBox: {
    background:   "#f9fafb",
    border:       "1px solid rgba(0,0,0,0.08)",
    borderRadius: "16px",
    padding:      "1.25rem",
    marginBottom: "1rem",
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
    fontSize:   "0.9rem",
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
    marginBottom: "1.5rem",
  },
  continueBtn: {
    display:       "block",
    width:         "100%",
    padding:       "14px 0",
    borderRadius:  "100px",
    background:    "linear-gradient(135deg, #15803d, #16a34a)",
    color:         "#fff",
    fontSize:      "0.85rem",
    fontWeight:    700,
    textAlign:     "center" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    border:        "none",
    cursor:        "pointer",
    boxShadow:     "0 4px 20px rgba(21,128,61,0.3)",
  },
  spinner: {
    width:       "36px",
    height:      "36px",
    border:      "3px solid rgba(21,128,61,0.15)",
    borderTop:   "3px solid #15803d",
    borderRadius:"50%",
    animation:   "spin 0.85s linear infinite",
    margin:      "0 auto",
  },
};