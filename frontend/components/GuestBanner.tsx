/**
 * PATCH for app/(dashboard)/patient/dashboard/page.tsx
 *
 * Adds conditional rendering for guest/transferred accounts.
 * Shows a "Guest Recovery Account" banner and "Temporary Access" label
 * for guest accounts; nothing changes for regular accounts.
 *
 * ──────────────────────────────────────────────────────────────────
 * STEP 1: Fetch accountSource from the patient profile API.
 *
 * In your existing useEffect that fetches patient data, the API should
 * already return `accountSource`. No backend change needed — the field
 * is already in the Patient schema after applying the schema patch.
 *
 * STEP 2: Add a GuestBanner component (paste below).
 *
 * STEP 3: Render the banner conditionally at the top of the dashboard JSX.
 * ──────────────────────────────────────────────────────────────────
 */

// ── Component to paste into the dashboard file ────────────────────────────

import React from "react";

interface GuestBannerProps {
  accountSource: string;
}

export function GuestBanner({ accountSource }: GuestBannerProps) {
  const isGuest       = accountSource === "guest_helplink_transfer";
  const isTransferred = accountSource === "transferred_from_helplink";

  if (!isGuest && !isTransferred) return null;

  if (isGuest) {
    return (
      <div
        style={{
          background:   "#fffbeb",
          border:       "1px solid #fde68a",
          borderRadius: "14px",
          padding:      "0.9rem 1.2rem",
          marginBottom: "1.5rem",
          display:      "flex",
          alignItems:   "flex-start",
          gap:          "0.75rem",
          fontFamily:   "'DM Sans', sans-serif",
        }}
      >
        <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>🔑</span>
        <div>
          <p
            style={{
              margin:     "0 0 2px",
              fontWeight: 700,
              fontSize:   "0.82rem",
              color:      "#92400e",
            }}
          >
            Guest Recovery Account · Temporary Access
          </p>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "#a16207", lineHeight: 1.55 }}>
            You're using a temporary account created from your HelpLink emergency.
            Log in with your guest credentials to return anytime, or register
            a full account to keep your recovery history permanently.
          </p>
        </div>
      </div>
    );
  }

  // Transferred (registered HelpLink user, new UniCare account)
  return (
    <div
      style={{
        background:   "#f0fdf4",
        border:       "1px solid #bbf7d0",
        borderRadius: "14px",
        padding:      "0.9rem 1.2rem",
        marginBottom: "1.5rem",
        display:      "flex",
        alignItems:   "flex-start",
        gap:          "0.75rem",
        fontFamily:   "'DM Sans', sans-serif",
      }}
    >
      <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>💚</span>
      <div>
        <p
          style={{
            margin:     "0 0 2px",
            fontWeight: 700,
            fontSize:   "0.82rem",
            color:      "#15803d",
          }}
        >
          Welcome to UniCare+
        </p>
        <p style={{ margin: 0, fontSize: "0.72rem", color: "#166534", lineHeight: 1.55 }}>
          Your account was set up automatically from your HelpLink emergency
          session. Your recovery data has been linked. You can update your
          profile and set a new password at any time.
        </p>
      </div>
    </div>
  );
}

/*
 * ──────────────────────────────────────────────────────────────────
 * USAGE in your dashboard JSX:
 *
 *   // 1. Get accountSource from patient state
 *   const accountSource = patient?.accountSource || "self";
 *
 *   // 2. In the render:
 *   <GuestBanner accountSource={accountSource} />
 *   {/* rest of dashboard content *}
 *
 * ──────────────────────────────────────────────────────────────────
 * PROFILE PAGE addition:
 *
 * In app/(dashboard)/patient/profile/page.tsx, under the patient name,
 * add the account source label:
 *
 *   {patient.accountSource === "guest_helplink_transfer" && (
 *     <span style={{ fontSize:"0.72rem", color:"#a16207", fontWeight:600 }}>
 *       Guest Recovery Account · Temporary Access
 *     </span>
 *   )}
 *
 * Do NOT show the raw accountSource string or any MongoDB IDs.
 * ──────────────────────────────────────────────────────────────────
 */