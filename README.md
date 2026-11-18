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
| **Active Test Patient Care Code** | **`482910`** | Patient: Ramesh Verma (74 yrs, Post-Stroke & Hypertension) |

> [!NOTE]
> **Render Cold Starts**: Because the backend is hosted on Render's free tier, the web service spins down after 15 minutes of inactivity. The first API or health-check request may take 30–50 seconds to wake up the server container and connect to MongoDB Atlas. Subsequent requests respond in milliseconds.

---

## 💡 How It Works & Key Design Decisions

### 1. Dual-Role Architecture & Separation of Concerns
Home medication management involves two distinct stakeholders with very different workflows:
- **Family Members (Administrators):** Need high-level oversight, long-term adherence metrics, stock monitoring, care team access control, and ability to schedule/adjust prescriptions.
- **Caretakers & Nurses (Bedside Operators):** Need a fast, distraction-free checklist grouped chronologically into **Morning (05:00–11:59)**, **Afternoon (12:00–16:59)**, and **Night (17:00–23:59)**, with large touch targets for logging doses as **Given** or **Skipped** (with required clinical reasons).

### 2. 6-Digit Care Code Pairing & Rotation
- Rather than requiring complex email invitations or cross-account authorization flows, patients are linked via a cryptographically unique 6-digit numeric **Care Code** (e.g., `482910`).
- Caretakers enter this code once to join the patient's care team.
- **Care Code Rotation:** Family admins can rotate the code at any time with one click. Existing caregivers remain connected, but previously shared codes are invalidated to protect patient privacy when shift workers change.

### 3. Real-Time Synchronization via Socket.IO
- Socket connections join isolated rooms partitioned by `patient_${patientId}`.
- Actions taken by a nurse at the bedside (e.g. marking a dose as given, skipping with a note, or posting a handover log) broadcast instantly to all connected family members and caregivers with zero manual page refreshes.
- Live system alerts also notify family members the moment a new caregiver joins the care team or when access is revoked.

### 4. Accidental Double-Dose Prevention
- In home care, two caregivers or a family member and nurse might accidentally administer the same pill twice.
- **Database Safeguard:** A strict compound unique index on `(patientId, medicineId, scheduledDate, scheduledTime)` in MongoDB rejects duplicate logs.
- **UI Safeguard:** Once a dose is recorded as Given or Skipped, its action buttons immediately lock into a disabled state showing timestamp and caregiver signature.

### 5. Accurate 7-Day Adherence Math & Edge Cases
- When a patient has 0 scheduled doses (e.g., brand-new patient or days prior to medication start date), the adherence engine returns `adherenceRate: null` and `hasScheduledDoses: false`.
- The UI renders a clean neutral slate ring (`--`) and empty trend tracks instead of falsely displaying 100% adherence.
- Real scheduled periods calculate exact adherence percentages: `(givenDoses / totalScheduledSlots) * 100`.

### 6. Doctor's Prescription Photo Upload & Verification Lightbox
- Family members can snap a photo or upload an image of the doctor's physical prescription during medication setup (stored directly on Cloudinary, validated $\le$ 5 MB).
- **Family View:** Each medicine card in the Medicines tab features a "View Rx" button opening a full-screen image viewer.
- **Nurse View:** On every scheduled dose card, nurses have a "View Rx" button to inspect the doctor's original Rx order (verifying dosage, timing, and food instructions) before bedside administration.

### 7. Shift Handover Notes
- Caregivers and family can log timestamped shift transition notes (Day $\rightarrow$ Night or Night $\rightarrow$ Day) with vital signs, observations, and instructions, synchronized in real time.

### 8. Mobile-First Responsive Design (360px – 430px)
- Tested across small mobile viewports (iPhone SE, Pixel 7, iPhone 14/15 Pro Max).
- `text-base sm:text-sm` (16px) on all form inputs prevents iOS Safari from automatically zooming in on focus.
- Touch targets strictly meet $\ge$ 44px guidelines.
- `overflow-x-hidden` prevents accidental horizontal scrolling on mobile.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18, Vite | High-performance SPA with fast HMR |
| **Styling & Icons** | Tailwind CSS, Lucide React | Mobile-first utility styling, clean SVG iconography |
| **Real-Time Layer** | Socket.IO Client | Bi-directional WebSocket communication |
| **Image Hosting** | Cloudinary | Direct image upload and CDN delivery for prescription orders |
| **Backend Runtime** | Node.js, Express | RESTful API server and WebSocket broker |
| **Database** | MongoDB Atlas (Mongoose) | Managed cloud document store with indexing |
| **Authentication** | JWT (jsonwebtoken), bcryptjs | Stateless token auth with password hashing |
| **Alerts & Sound** | Browser Web Notification & Web Audio API | Scheduled reminder chimes and notifications |

---

## 💻 Local Setup & Run Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- Free MongoDB Atlas URI (or local MongoDB daemon)
- Cloudinary account (optional, for prescription photo uploads)

### 1. Clone the Repository
```bash
git clone https://github.com/thecarepal/medsync.git
cd "The CarePal"
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
```

Seed initial data (creates patient Ramesh Verma, code `482910`, medicines & past 7 days logs):
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
VITE_API_URL=http://localhost:5000/api
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

### Patients (`/api/patients`)
- `GET /api/patients` — List user's linked patients
- `POST /api/patients` — Create patient profile (auto-generates unique 6-digit Care Code)
- `POST /api/patients/join` — Caretaker pairs with patient using 6-digit Care Code
- `GET /api/patients/:id/members` — List all linked family members and caregivers
- `DELETE /api/patients/:id/members/:userId` — Revoke a caregiver's access (family only)
- `POST /api/patients/:id/rotate-code` — Regenerate a new unique 6-digit Care Code (family only)

### Daily Schedule & Dosage Logs (`/api/schedule`, `/api/doses`)
- `GET /api/schedule/today/:patientId` — Fetch today's grouped doses (Morning / Afternoon / Night)
- `POST /api/doses/log` — Record a dose as `given` or `skipped` (with reasonText)
- `GET /api/adherence/weekly/:patientId` — Compute 7-day adherence rate, daily trends, and low-stock alerts

### Prescriptions & Handovers (`/api/medicines`, `/api/handovers`)
- `GET /api/medicines/patient/:patientId` — List active medications
- `POST /api/medicines` — Add new medicine with timing, stock, and optional prescriptionUrl
- `DELETE /api/medicines/:id` — Delete a medicine
- `GET /api/handovers/patient/:patientId` — Retrieve shift handover notes
- `POST /api/handovers` — Submit shift handover log

---

## 🔮 What I Would Build Next

1. **Native Web Push Notifications (Service Worker / FCM):**
   - Implement background Web Push API so caregivers and family receive audible dosage alarms even when the browser tab is closed or the device screen is locked.
2. **Automated AI OCR Prescription Scanner:**
   - Integrate Gemini Vision API to automatically read uploaded doctor prescriptions and pre-fill medicine name, dosage, frequency, and instructions into the form.
3. **SMS & WhatsApp Refill Alerts (Twilio API):**
   - Automatically notify primary family contacts via WhatsApp when a vital medication drops below 3 days of supply.
4. **Offline-First Synchronization (IndexedDB / PWA):**
   - Enable full offline capability with service workers so nurses in poor-connectivity residential areas can continue logging doses; changes queue locally and reconcile automatically upon reconnection.

---

## 🤖 AI Tools Used & Contribution Breakdown

This project was built with the assistance of **Google DeepMind Gemini** and the **Antigravity IDE**:

- **Architecture & Schema Engineering:**
  - Designed atomic MongoDB operations and compound unique indexes to guarantee double-dose prevention.
  - Built room-based Socket.IO architecture for real-time synchronization between family and nurse clients.
- **Edge-Case Resolution & Math Hardening:**
  - Diagnosed and fixed the 0-dose 100% adherence bug by introducing nullable rates and empty UI progress tracks.
  - Handled Cloudinary unsigned upload flows with error boundaries and responsive lightboxes.
- **Mobile UX & Cross-Browser Optimization:**
  - Optimized viewport behavior and input typography (`16px`) to prevent iOS Safari auto-zoom.
  - Refactored touch targets to conform to WCAG 44px+ guidelines for bedside one-handed operation.
