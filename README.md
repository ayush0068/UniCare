# UniCare+ — Digital Health & Telemedicine Platform

<div align="center">

![UniCare+ Banner](https://img.shields.io/badge/UniCare%2B-Digital%20Health%20Platform-0ea5e9?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyYy01LjUgMC0xMCA0LjUtMTAgMTBzNC41IDEwIDEwIDEwIDEwLTQuNSAxMC0xMC00LjUtMTAtMTAtMTB6bTEgMTRoLTJ2LTZoMnY2em0wLThoLTJWNmgydjJ6Ii8+PC9zdmc+)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)

**A production-grade telemedicine platform connecting patients with verified doctors through HD video/voice consultations, AI-powered health assistance, smart loyalty discounts, and a comprehensive admin dashboard.**

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [API Reference](#-api-reference) · [Environment Setup](#-environment-variables) · [Deployment](#-deployment)

</div>

---

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [User Roles](#-user-roles)
- [API Reference](#-api-reference)
- [Key Workflows](#-key-workflows)
- [Third-Party Integrations](#-third-party-integrations)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## 🏥 About the Project

UniCare+ is a full-stack telemedicine platform that enables patients to discover verified doctors, book video/voice consultations, interact with an AI health assistant, and receive digital prescriptions — all from a single interface.

Doctors get a professional dashboard to manage appointments, upload verification credentials, write prescriptions, and receive automated payouts. Admins have a complete management portal to verify doctors, manage users, oversee payments, and monitor platform health in real time.

The platform also integrates with **HelpLink** (a separate emergency response app) to allow care continuity between emergency situations and scheduled medical follow-ups.

---

## ✨ Features

### 👤 Patient
- **Doctor Discovery** — Filter by specialization, city, fees, category; real-time slot availability
- **Booking Flow** — 3-step booking (date/slot → consultation type → payment summary)
- **Video & Voice Consultations** — HD calls powered by ZegoCloud
- **AI Health Assistant** — Conversational health AI with voice personas (JARVIS, F.R.I.D.A.Y, Hindi), multilingual support (English/Hindi), voice input, and inline medical report generation
- **Loyalty / Parchi System** — Visit 1: full price → Visits 2–3 within 10 days: free → Visit 4: half price. Evaluated against appointment slot date, not booking date
- **Guest Login** — Book up to 3 appointments without an account; ₹30 convenience surcharge applies; no loyalty discounts
- **Prescriptions & AI Reports** — View digital prescriptions and AI pre-consultation reports from the patient dashboard
- **Notifications** — Real-time notification bell with read/unread state, per-notification delete, mark-all-read
- **Aftercare** — Post-consultation care cases that can be linked to HelpLink sessions
- **Account Recovery** — Secure 72-hour session-based recovery flow

### 🩺 Doctor
- **Dashboard** — Today's schedule, upcoming appointments, stats (patients, revenue, completions, rating)
- **Verification** — Upload medical credentials (degree, registration certificate, ID) for admin review
- **Bank Details** — Securely store account number (masked display), IFSC, bank name, UPI ID for payouts
- **Prescriptions** — Structured prescription editor with pipe-separated medicine format; PDF auto-generated and emailed
- **AI Pre-Reports** — View patient AI health reports before each consultation
- **Availability Management** — Set date ranges, excluded weekdays, daily time ranges, slot duration
- **Real-time Notifications** — Verification approval, payout received, account status changes
- **Status Banners** — Pending verification warning + bank details nudge on dashboard

### 🛡️ Admin
- **Dashboard** — Platform health score, revenue charts, appointment donut charts, top doctors leaderboard, quick actions
- **Doctor Management** — Review uploaded credentials in a split-panel document viewer; verify/unverify with one click; activate/deactivate
- **Patient Management** — View all patients, toggle active/inactive; deactivated users are blocked at login with clear messages
- **Appointment Management** — Full appointment table with filters
- **Payment & Payout Management** — Two-tab view: transaction history + doctor payouts. Pay individual doctors with bank detail review; bulk-pay multiple pending payouts; platform fees automatically excluded from payout amount
- **Admin Account Management** — Super admin can create sub-admins with granular permission sets
- **Responsive Mobile UI** — Hamburger drawer sidebar, sticky sub-headers, mobile card views for appointments

### 🤖 AI Assistant
- Provider-agnostic via `aiProvider.js` — supports OpenRouter, Claude, or Gemini via environment config
- Persistent session continuity using `useRef` to avoid stale closure bugs
- Generates structured medical pre-reports (symptoms, possible conditions, severity, recommended action)
- Reports auto-attached to patient's next scheduled appointment and visible to doctor
- Compact 44px FAB — only visible on home page for patients, everywhere except call page for doctors

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14 (App Router) | Framework |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3 | Styling |
| shadcn/ui + Radix UI | latest | UI components |
| Framer Motion | latest | Animations |
| Zustand | latest | Global state + persist middleware |
| ZegoCloud UIKit | latest | Video/voice calls |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4 | HTTP framework |
| MongoDB + Mongoose | latest | Database + ODM |
| JWT | latest | Authentication |
| Passport.js | latest | Google OAuth 2.0 |
| PDFKit | latest | Prescription PDF generation |
| Razorpay | latest | Payment & payout processing |
| Resend | latest | Transactional email |
| node-cron | latest | Appointment reminders scheduler |

### Infrastructure & Third-Party
| Service | Purpose |
|---|---|
| MongoDB Atlas | Cloud database |
| Vercel | Frontend hosting |
| Render | Backend hosting |
| ZegoCloud | Real-time video/voice |
| Google OAuth 2.0 | Social login |
| Razorpay | Payments & doctor payouts |
| Resend API | Email delivery (booking confirmations, prescriptions) |
| Twilio | SMS notifications |
| OpenRouter / Claude / Gemini | AI provider (configurable) |

---

## 📁 Project Structure

```
UniCare/
├── backend/
│   ├── config/
│   │   └── passport.js              # Google OAuth strategy
│   ├── controllers/
│   │   ├── aftercareController.js
│   │   ├── helplinkTransferController.js
│   │   └── recoveryController.js
│   ├── middleware/
│   │   ├── adminAuth.js             # Admin JWT + permission guard
│   │   ├── auth.js                  # Patient/doctor JWT guard
│   │   ├── response.js              # Custom res.ok / res.created / res.serverError etc.
│   │   └── validate.js              # express-validator middleware
│   ├── modal/                       # Mongoose models
│   │   ├── AIReport.js
│   │   ├── Admin.js
│   │   ├── AftercareCase.js
│   │   ├── Appointment.js
│   │   ├── Counter.js               # Auto-increment for UC IDs
│   │   ├── Doctor.js                # Includes bankDetails + verificationDocuments
│   │   ├── Notification.js
│   │   ├── Parchi.js                # Loyalty visit tracking
│   │   ├── Patient.js               # Includes isGuest + guestAppointmentCount
│   │   └── TemporaryRecoverySession.js
│   ├── routes/
│   │   ├── admin.js                 # Admin CRUD, verify doctors, payouts
│   │   ├── aftercare.js
│   │   ├── aiAssistant.js           # AI chat + report generation
│   │   ├── appointment.js           # Booking, slots, discount check, parchi logic
│   │   ├── auth.js                  # Login, register, Google OAuth, guest login
│   │   ├── doctor.js                # Profile, bank details, verification docs
│   │   ├── helplinkTransfer.js      # HelpLink → UniCare data bridge
│   │   ├── notification.js          # CRUD for notifications
│   │   ├── patient.js               # Patient profile, onboarding
│   │   ├── payment.js               # Razorpay order creation + verification
│   │   └── recovery.js              # Account recovery sessions
│   ├── scripts/
│   │   ├── migrateIds.js            # Backfill UC IDs on existing records
│   │   └── seedSuperAdmin.js        # Create initial super admin
│   ├── utils/
│   │   ├── aiProvider.js            # Provider-agnostic AI client
│   │   ├── date.js                  # Date helpers
│   │   ├── emailService.js          # Resend wrapper
│   │   ├── emailTemplates.js        # HTML email templates
│   │   ├── generateId.js            # UC ID generator (e.g. UC-DOC-00001)
│   │   ├── prescriptionPdf.js       # PDFKit prescription generator
│   │   └── reminderScheduler.js     # node-cron appointment reminders
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── app/
    │   ├── (auth)/                  # Login + signup pages (patient & doctor)
    │   ├── (dashboard)/             # Doctor + patient dashboards, call page
    │   ├── admin/                   # Admin portal pages
    │   ├── aftercare/               # Aftercare session pages
    │   ├── doctor-list/             # Public doctor discovery
    │   ├── onboarding/              # Post-signup onboarding forms
    │   └── patient/booking/         # Booking flow
    ├── components/
    │   ├── AI/                      # AIAssistantButton, AIReportViewModal
    │   ├── BookingSteps/            # CalendarStep, ConsultationStep, PaymentStep
    │   ├── admin/                   # Admin dashboard, sidebar, tables
    │   ├── doctor/                  # Doctor dashboard, appointments, prescription modals, BankDetailsPanel
    │   ├── landing/                 # Header, Footer, NotificationBell, landing sections
    │   ├── patient/                 # Patient dashboard, doctor list, reports
    │   └── ui/                      # shadcn/ui primitives
    ├── lib/
    │   ├── admin/                   # Admin API, store, types, utils
    │   ├── constant.ts
    │   ├── dateUtils.ts
    │   └── types.ts
    ├── service/
    │   └── httpService.ts           # Authenticated HTTP client (getWithAuth, postWithAuth, etc.)
    └── store/
        ├── appointmentStore.ts
        ├── authStore.ts             # Includes loginAsGuest()
        └── doctorStore.ts
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

```bash
node --version   # v18.0.0 or higher
npm --version    # v9.0.0 or higher
```

You also need accounts / credentials for:
- [MongoDB Atlas](https://cloud.mongodb.com) — free tier works fine
- [ZegoCloud](https://zegocloud.com) — for video calls
- [Google Cloud Console](https://console.cloud.google.com) — for OAuth 2.0
- [Razorpay](https://razorpay.com) — for payments (test mode works)
- [Resend](https://resend.com) — for transactional emails (free tier: 3000 emails/month)
- [OpenRouter](https://openrouter.ai) — for AI (or use Claude / Gemini API key)
- [Twilio](https://twilio.com) — for SMS (optional)

---

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/your-username/UniCare.git
cd UniCare
```

**2. Install backend dependencies**

```bash
cd backend
npm install
```

**3. Install frontend dependencies**

```bash
cd ../frontend
npm install
```

---

### Environment Variables

#### Backend — `backend/.env`

Create a file at `backend/.env` and fill in all values:

```dotenv
# ── Database ───────────────────────────────────────────────
MONGO_URI=

# ── Server ─────────────────────────────────────────────────
PORT=8000
JWT_SECRET=

# ── CORS ───────────────────────────────────────────────────
# Comma-separated list of allowed frontend origins
ALLOWED_ORIGINS=

# ── Google OAuth 2.0 ───────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

# ── Razorpay (Payments & Doctor Payouts) ───────────────────
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# ── Email (legacy nodemailer — not used on Render) ─────────
EMAIL_USER=
EMAIL_PASS=

# ── Resend API (primary email service) ─────────────────────
RESEND_API_KEY=

# ── AI Provider ────────────────────────────────────────────
# Options: "openrouter" | "claude" | "gemini"
AI_PROVIDER=
AI_API_KEY=
AI_MODEL=

# ── Super Admin Seed ────────────────────────────────────────
SUPER_ADMIN_EMAIL=
SUPER_ADMIN_PASS=
SUPER_ADMIN_NAME=

# ── Aftercare / HelpLink Bridge ─────────────────────────────
AFTERCARE_SECRET=

# ── Account Recovery ────────────────────────────────────────
# Duration in hours before recovery session expires
RECOVERY_SESSION_TTL_HOURS=72

# ── Twilio (SMS notifications — optional) ───────────────────
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# ── Frontend URL (for OAuth redirects) ──────────────────────
FRONTEND_URL=
```

#### Frontend — `frontend/.env.local`

Create a file at `frontend/.env.local`:

```dotenv
# ── API Base URLs ────────────────────────────────────────────
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_ADMIN_API_URL=

# ── ZegoCloud (Video / Voice Calls) ─────────────────────────
NEXT_PUBLIC_ZEGOCLOUD_APP_ID=
NEXT_PUBLIC_ZEGOCLOUD_SERVER_SECRET=

# ── Aftercare / HelpLink Bridge ─────────────────────────────
NEXT_PUBLIC_AFTERCARE_SECRET=
```

> **Tip:** For local development, set `NEXT_PUBLIC_API_URL=http://localhost:8000/api` and `ALLOWED_ORIGINS=http://localhost:3000`

---

### Running the App

**Seed the super admin** (first time only):

```bash
cd backend
node scripts/seedSuperAdmin.js
```

**Start the backend development server:**

```bash
cd backend
npm run dev      # uses nodemon — auto-restarts on file changes
```

**Start the frontend development server** (in a separate terminal):

```bash
cd frontend
npm run dev      # starts Next.js on http://localhost:3000
```

**Admin portal:** `http://localhost:3000/admin-login`

Default super admin credentials are whatever you set in `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASS`.

---

## 👥 User Roles

| Role | Access | Login Path |
|---|---|---|
| **Patient** | Book appointments, video/voice calls, AI assistant, prescriptions, AI reports, notifications | `/login/patient` |
| **Guest Patient** | Up to 3 bookings without account, ₹30 surcharge, no loyalty discounts | "Continue as Guest" on patient login |
| **Doctor** | Dashboard, appointments, prescriptions, verification upload, bank details, AI reports | `/login/doctor` |
| **Admin** | Full management portal — doctors, patients, appointments, payments, payouts | `/admin-login` |
| **Super Admin** | Everything admin + create/manage sub-admin accounts | `/admin-login` |

---

## 🔌 API Reference

All routes are prefixed with `/api`. Authentication uses `Authorization: Bearer <token>` header.

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/patient/register` | None | Register new patient |
| POST | `/patient/login` | None | Patient login (blocks if inactive) |
| POST | `/doctor/register` | None | Register new doctor |
| POST | `/doctor/login` | None | Doctor login (blocks if inactive or unverified) |
| POST | `/guest/login` | None | Create guest session (3-booking limit) |
| GET | `/google` | None | Initiate Google OAuth flow |
| GET | `/google/callback` | None | Google OAuth callback |

### Doctor — `/api/doctor`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/list` | None | List verified + active doctors (with filters) |
| GET | `/me` | Doctor | Own full profile |
| PUT | `/onboarding/update` | Doctor | Update profile & availability |
| GET | `/bank-details` | Doctor | Fetch masked bank details |
| PUT | `/bank-details` | Doctor | Save / update bank details |
| POST | `/verification/upload-document` | Doctor | Upload credential document (base64) |
| DELETE | `/verification/document/:id` | Doctor | Remove a document |
| GET | `/verification/documents` | Doctor | List own documents (metadata only) |
| GET | `/dashboard/:type` | Doctor | Dashboard stats + appointments |
| GET | `/:id` | None | Single doctor public profile |

### Patient — `/api/patient`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/me` | Patient | Own profile |
| PUT | `/onboarding/update` | Patient | Update profile |

### Appointment — `/api/appointment`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/doctor` | Doctor | Doctor's appointments |
| GET | `/patient` | Patient | Patient's appointments |
| GET | `/booked-slots/:doctorId/:date` | None | Booked time slots for a date |
| GET | `/check-discount/:doctorId` | Patient | Check parchi discount for a slot date |
| POST | `/book` | Patient | Book appointment (parchi + guest logic) |
| GET | `/join/:id` | Any | Join consultation (sets status to In Progress) |
| PUT | `/end/:id` | Any | End consultation + generate prescription PDF |
| PUT | `/status/:id` | Doctor | Update appointment status |
| GET | `/:id` | Any | Single appointment detail |

### AI Assistant — `/api/ai`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/chat` | Patient/Doctor | Send message, get AI response + optional report |
| GET | `/appointment-report/:appointmentId` | Patient/Doctor | Fetch stored AI report for an appointment |

### Notification — `/api/notification`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Any | Fetch all notifications + unread count |
| PUT | `/mark-all-read` | Any | Mark all as read |
| PUT | `/:id/read` | Any | Mark single notification as read |
| DELETE | `/:id` | Any | Delete notification |
| DELETE | `/clear-all` | Any | Clear all notifications |

### Admin — `/api/admin`

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/auth/login` | None | Admin login |
| GET | `/auth/me` | Admin | Validate token + get own profile |
| GET | `/dashboard/stats` | Admin | Full dashboard statistics |
| GET | `/users` | userManagement | List patients with filters |
| PUT | `/users/:id/toggle-active` | userManagement | Activate / deactivate patient |
| GET | `/doctors` | doctorManagement | List doctors with filters |
| PUT | `/doctors/:id/verify` | doctorManagement | Verify / unverify doctor |
| PUT | `/doctors/:id/toggle-active` | doctorManagement | Activate / deactivate doctor |
| GET | `/doctors/:id` | doctorManagement | Doctor detail + verification documents |
| GET | `/appointments` | analytics | All appointments with filters |
| GET | `/payments` | paymentManagement | Transaction history |
| GET | `/payouts` | paymentManagement | Pending + completed doctor payouts |
| PUT | `/payouts/:appointmentId/mark-paid` | paymentManagement | Mark single payout as paid |
| PUT | `/payouts/bulk-mark-paid` | paymentManagement | Bulk mark payouts as paid |
| GET | `/admins` | Super Admin | List all admin accounts |
| POST | `/admins/create` | Super Admin | Create sub-admin with permissions |

---

## 🔄 Key Workflows

### Booking Flow
```
Patient searches doctors → Selects doctor → Picks date & slot →
Chooses consultation type (Video/Voice) → System checks parchi discount →
Payment summary → POST /appointment/book →
Confirmation email sent → Appointment created
```

### Parchi (Loyalty) Logic
```
Visit 1              → Full price  + new parchi created (valid 10 days)
Visits 2–3 (≤10 days) → FREE
Visit 4  (≤10 days)  → 50% discount
Visit 5+ (≤10 days)  → Full price
After 10 days        → New parchi (cycle resets)
Guest user           → Always full price + ₹30 surcharge, no parchi
```
> Discount eligibility is always evaluated against the **appointment's slot date**, not the booking creation date.

### Doctor Verification Flow
```
Doctor registers → Uploads credentials (Profile → Verification Docs) →
Admin reviews documents in split-panel viewer →
Admin clicks "Mark as Verified" →
Doctor receives notification → Doctor appears in patient search
Doctor cannot log in if not verified
```

### Doctor Payout Flow
```
Patient pays (paymentStatus: Paid) →
Admin opens Payments → Doctor Payouts tab →
Reviews doctor's bank details inline →
Clicks "Pay Now" → Enters UTR/transaction reference →
Clicks "Mark as Paid" → payoutStatus: Paid →
Doctor receives "💳 Payout Received" notification
Payout amount = consultationFees only (platform fees excluded)
```

### AI Health Report Flow
```
Patient opens AI assistant → Describes symptoms →
AI asks follow-up questions → Generates structured report →
Report auto-saved to AIReport model →
Linked to patient's next scheduled appointment →
Doctor can view report from dashboard or appointments page
```

---

## 🔗 Third-Party Integrations

### ZegoCloud (Video/Voice Calls)
- UIKit Prebuilt handles room creation, WebRTC, and call UI
- Room IDs generated on booking: `room_${timestamp}_${random}`
- Configured via `NEXT_PUBLIC_ZEGOCLOUD_APP_ID` and `NEXT_PUBLIC_ZEGOCLOUD_SERVER_SECRET`

### Google OAuth 2.0
- Patients and doctors can sign in with Google
- Separate user type passed via `?type=patient|doctor` query param
- Callback URL must be added to your Google Cloud Console project's **Authorized redirect URIs**

### Razorpay
- Used for patient payment order creation and verification
- Also used for tracking doctor payout status (manual bank transfer + mark paid flow)
- Test mode: use Razorpay test key pair and test card `4111 1111 1111 1111`

### Resend API
- Replaces nodemailer/Gmail SMTP (Render's free tier blocks SMTP ports)
- Sends: booking confirmations, prescription PDFs (as attachment), appointment reminders
- Configure the sender domain in your Resend dashboard, then update `emailService.js`

### AI Provider (OpenRouter / Claude / Gemini)
- Abstracted via `backend/utils/aiProvider.js`
- Switch providers by changing `AI_PROVIDER` env var — no code changes needed
- OpenRouter recommended for flexibility (access to 100+ models)
- Models tested: `meta-llama/llama-3-8b-instruct`, `anthropic/claude-3-haiku`, `google/gemini-flash`

### HelpLink Bridge
- `POST /api/helplink-transfer` accepts patient data from HelpLink emergency app
- Creates/links UniCare patient accounts for care continuity
- Secured via shared `AFTERCARE_SECRET` key

---

## 📦 Deployment

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
```

Set all `NEXT_PUBLIC_*` environment variables in the Vercel dashboard under **Project → Settings → Environment Variables**.

### Backend → Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `node server.js`
5. Add all backend environment variables in **Environment**

> ⚠️ **Important:** Render's free tier blocks outbound SMTP (port 465/587). Use **Resend API** for emails — do not use nodemailer with Gmail SMTP.

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Update `ALLOWED_ORIGINS` to your production frontend URL
- [ ] Update `GOOGLE_CALLBACK_URL` to your production backend URL
- [ ] Update `FRONTEND_URL` to your production frontend URL
- [ ] Switch Razorpay from test keys to live keys
- [ ] Verify Resend sender domain (DNS records)
- [ ] Set a strong random `JWT_SECRET` (minimum 32 characters)
- [ ] Set a strong random `AFTERCARE_SECRET`
- [ ] Run `node scripts/seedSuperAdmin.js` once on production to create super admin

---

## 📊 Database Models

| Model | Purpose |
|---|---|
| `Patient` | Patient profiles, guest session tracking, onboarding data |
| `Doctor` | Doctor profiles, bank details, verification documents, availability |
| `Admin` | Admin accounts with granular permission sets |
| `Appointment` | Bookings with consultation fees, payout tracking, parchi reference |
| `Parchi` | Loyalty visit counter per patient-doctor pair (10-day window) |
| `AIReport` | Structured AI health reports linked to appointments |
| `Notification` | In-app notifications for patients and doctors |
| `AftercareCase` | Post-consultation care cases bridging to HelpLink |
| `TemporaryRecoverySession` | 72-hour account recovery tokens |
| `Counter` | Auto-increment counters for UC ID generation |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Commit Convention
This project follows [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `style:` — formatting, missing semicolons, etc.

---

## 📄 License

This project is proprietary software. All rights reserved.

---

<div align="center">

Built with ❤️ by the UniCare+ Team

**[Live Demo](https://unicare-plus.vercel.app)** · **[Report Bug](https://github.com/your-username/UniCare/issues)** · **[Request Feature](https://github.com/your-username/UniCare/issues)**

</div>