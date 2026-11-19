# TheCarePal MedSync (Task FS-05)

> **Shared Medication Schedule, Adherence Tracker & Real-Time Home Care Coordination**  
> Companion module for **TheCarePal** (*"Trusted Care at Home"*).

---

## 🌐 Live Production Links

| Resource | URL | Details |
| :--- | :--- | :--- |
| **Frontend Application** | [https://the-care-pal-amr8.vercel.app](https://the-care-pal-amr8.vercel.app) | Deployed on Vercel (Auto-deploy from `main`) |
| **Backend REST & WebSocket API** | [https://thecarepal.onrender.com](https://thecarepal.onrender.com) | Deployed on Render Web Service |
| **Health Check Endpoint** | [https://thecarepal.onrender.com/api/health](https://thecarepal.onrender.com/api/health) | Returns `{ status: "ok", uptime, database: "connected" }` |

> [!NOTE]
> **Render Cold Starts**: Because the backend is hosted on Render's free tier, the web service spins down after 15 minutes of inactivity. The first API or health-check request may take 30–50 seconds to wake up the server container and connect to MongoDB Atlas. Subsequent requests respond in milliseconds.

---

## 👥 Seeded 1-Click Demo Accounts

For immediate evaluation without manual signup, use either of the pre-configured accounts:

| Role | Email | Password | Primary Linked Patients |
| :--- | :--- | :--- | :--- |
| **Family Admin** | `sakethreddy@gmail.com` | `saketh` | **Raghavendra Rao** (76 yrs, Post-Stroke & Hypertension)<br>**Meenakshi Iyer** (68 yrs, Type 2 Diabetes) |
| **Caretaker / Nurse** | `nehalikareddy@gmail.com` | `nehalika` | **Raghavendra Rao** & **Meenakshi Iyer** |

*Both portals are fully responsive on mobile (iPhone/Android) and desktop.*

---

## 💡 How It Works & Key Design Decisions

### 1. Dual-Role Architecture & Separation of Concerns
Home medication management involves two distinct stakeholders with very different workflows:
- **Family Members (Administrators):** High-level oversight, 7-day adherence metrics, shift consistency heatmap, stock monitoring, approval-gated care team access control, and ability to schedule/adjust prescriptions.
- **Caretakers & Nurses (Bedside Operators):** Fast, distraction-free checklist grouped chronologically into **Morning (05:00–11:59)**, **Afternoon (12:00–16:59)**, and **Night (17:00–23:59)**, with large touch targets ($\ge$ 44px) for logging doses as **Given** or **Skipped** (with required clinical reasons).

### 2. Approval-Gated 6-Digit Care Codes & Access Control
- Rather than exposing patient profiles immediately upon entering a code, caretakers submit a link request using a unique 6-digit **Care Code** (e.g., `275964`).
- **Family Gatekeeper:** The family admin receives an instant real-time alert (accompanied by an audible chime) with one-click **Approve** or **Reject** actions.
- **Code Rotation & Revocation:** Family admins can rotate the 6-digit code at any time with one click or revoke existing caregiver access immediately if shift personnel change.

### 3. Select Profile Hub
- Multi-patient management dashboard allows family admins and roving caregivers to switch seamlessly between elder profiles.
- Each profile card displays live age, clinical condition, active medication counts, and real-time status pills.

### 4. Real-Time Synchronization via Socket.IO
- Socket connections join isolated rooms partitioned by `patient_${patientId}` and `user_${userId}`.
- Actions taken by a nurse at the bedside (e.g. marking a dose as given, skipping with a note, or posting a handover log) broadcast instantly to all connected family members with zero manual page refreshes.
- Silent background refresh prevents full-component remounts or loading spinner flashes during live updates.

### 5. Accidental Double-Dose Prevention
- In home care, two caregivers or a family member and nurse might accidentally administer the same pill twice.
- **Database Safeguard:** A strict compound unique index on `(patientId, medicineId, scheduledDate, scheduledTime)` in MongoDB rejects duplicate logs.
- **UI Safeguard:** Once a dose is recorded as Given or Skipped, its action buttons immediately lock into a disabled state showing the exact timestamp and caregiver signature.

### 6. 7-Day Adherence Analytics & 3×7 Shift Consistency Heatmap
- **Weekly Score & Streak Circles:** Visual 7-day streak tracker showing daily completion status. When a patient has 0 scheduled doses, the engine cleanly displays `--` rather than falsely showing 100%.
- **3×7 Shift Consistency Heatmap:** Visual matrix tracking Morning, Afternoon, and Night shifts across the past 7 days (color-coded for full completion, partial doses, skips, or unscheduled slots), immediately identifying shift patterns or adherence gaps.

### 7. VAPID Web Push Notifications (Tab-Closed Background Delivery)
- Full Web Push implementation using VAPID keys and a dedicated Service Worker (`/sw.js`).
- Background dose reminder scheduler runs every 60 seconds on the server, sending notifications directly to linked devices even when the browser tab is closed.
- Automatic unsubscription cleans up endpoint registrations on logout.

### 8. Doctor's Prescription Photo Upload & Verification Lightbox
- Family members can upload an image of the doctor's physical prescription during medication setup (stored on Cloudinary, validated $\le$ 5 MB).
- Both family and caretakers can inspect the original prescription via an inline lightbox viewer before administering medication.

### 9. Shift Handover Notes
- Caregivers and family can log timestamped shift transition notes (Day $\rightarrow$ Night or Night $\rightarrow$ Day) with vital signs, observations, and instructions, synchronized in real time.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18, Vite | High-performance SPA with fast HMR |
| **Styling & Fonts** | Tailwind CSS, Plus Jakarta Sans, Inter | Mobile-first utility styling, clean typography |
| **Icons** | Lucide React | Crisp SVG iconography |
| **Real-Time Layer** | Socket.IO Client | Bi-directional WebSocket communication |
| **Background Push** | Service Worker, Web Push API (VAPID) | Background dose alarms when browser tab is closed |
| **Audio** | Web Audio API (Synthesized Chimes) | Instant feedback for dose reminders and approvals |
| **Image Hosting** | Cloudinary | Direct image upload and CDN delivery for prescription orders |
| **Backend Runtime** | Node.js, Express | RESTful API server and WebSocket broker |
| **Database** | MongoDB Atlas (Mongoose) | Managed cloud document store with indexing |
| **Authentication** | JWT (jsonwebtoken), bcryptjs | Stateless token auth with password hashing |

---

## 💻 Local Setup & Run Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- MongoDB Atlas URI (or local MongoDB daemon)

### 1. Clone the Repository
```bash
git clone https://github.com/nehalikareddy/thecarepal.git
cd thecarepal
```

### 2. Backend Setup
```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=https://the-care-pal-amr8.vercel.app
```

Seed initial demo data:
```bash
npm run seed
```

Start the backend server:
```bash
npm run dev   # Or: node server.js
```
*Backend runs on `http://localhost:5000`.*

### 3. Frontend Setup
```bash
cd ../client
npm install
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=carepal_prescriptions
```

Start the Vite development server:
```bash
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

To build for production:
```bash
npm run build
```

---

## 📋 REST API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new family member or caretaker
- `POST /api/auth/login` — Login and receive JWT token
- `GET /api/auth/me` — Retrieve current authenticated user profile
- `PUT /api/auth/profile` — Update name, phone, emergency contact, or avatar

### Patients & Care Team (`/api/patients`)
- `GET /api/patients` — List user's linked patients
- `POST /api/patients` — Create patient profile (auto-generates unique 6-digit Care Code)
- `POST /api/patients/join` — Caretaker requests to pair with patient using Care Code
- `GET /api/patients/my-pending` — List caretaker's pending approval requests
- `GET /api/patients/:id/pending-requests` — List pending caretaker requests for a patient (family only)
- `POST /api/patients/:id/requests/:requestId/approve` — Approve caretaker access (family only)
- `POST /api/patients/:id/requests/:requestId/reject` — Reject caretaker request (family only)
- `GET /api/patients/:id/members` — List all linked family members and caregivers
- `DELETE /api/patients/:id/members/:userId` — Revoke a caregiver's access (family only)
- `POST /api/patients/:id/rotate-code` — Regenerate a new unique 6-digit Care Code (family only)

### Daily Schedule & Dosage Logs (`/api/schedule`, `/api/doses`)
- `GET /api/schedule/today/:patientId` — Fetch today's grouped doses (Morning / Afternoon / Night)
- `POST /api/doses/log` — Record a dose as `given` or `skipped` (with reasonText)
- `GET /api/adherence/weekly/:patientId` — Compute 7-day adherence rate, shift consistency matrix, and low-stock alerts

### Prescriptions & Handovers (`/api/medicines`, `/api/handovers`)
- `GET /api/medicines/patient/:patientId` — List active medications
- `POST /api/medicines` — Add new medicine with timing, stock, and prescription URL
- `DELETE /api/medicines/:id` — Delete a medicine
- `GET /api/handovers/patient/:patientId` — Retrieve shift handover notes
- `POST /api/handovers` — Submit shift handover log

### Web Push Notifications (`/api/notifications`)
- `GET /api/notifications/vapid-public-key` — Retrieve backend VAPID public key
- `POST /api/notifications/subscribe` — Register browser push subscription
- `POST /api/notifications/unsubscribe` — Deregister push subscription on logout

---

## 🔮 What I Would Build Next

1. **AI Prescription-to-Schedule Scanner (Gemini Vision API):**
   - Directly analyze handwritten and printed prescription slips, converting medications, dosages, meal instructions, and frequencies into the standard FS-05 JSON schema with 1-click schedule population.
2. **Allergy & Drug-Interaction Checks:**
   - Safety engine that automatically cross-checks newly prescribed medications against the patient's recorded allergies (e.g., Penicillin) and detects adverse drug-drug interactions.
3. **Alternate & Custom-Day Scheduling:**
   - Support for complex non-daily regimens such as alternate-day dosing, specific days of the week, or tapering courses (e.g., corticosteroids).
4. **Voice-to-Handover Notes (Speech-to-Text):**
   - Hands-free audio dictation at the bedside, allowing busy caregivers to record vital shift transition notes quickly without manual typing.

---

## 🤖 AI Tools Used & Contribution Breakdown

This project was built with the assistance of **Google DeepMind Gemini** and the **Antigravity IDE**:

- **Architecture & Security:**
  - Implemented atomic MongoDB operations and compound unique indexes for guaranteed double-dose prevention.
  - Architected dual-role authorization with approval-gated care codes and isolated Socket.IO rooms.
- **Analytics & Math Hardening:**
  - Resolved 0-dose adherence edge cases with nullable metrics and neutral state rings.
  - Built the 3×7 shift consistency algorithm tracking completion across Morning, Afternoon, and Night windows.
- **Mobile-First UX & Reliability:**
  - Tailored touch targets ($\ge$ 44px) and 16px input typography to prevent iOS Safari auto-zoom.
  - Implemented background VAPID push notifications and Service Worker listeners for tab-closed dose alerts.
