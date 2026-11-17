# TheCarePal Internship Assignment (Task FS-05) — Implementation Blueprint

**App Name:** TheCarePal MedSync (*Shared Medication Schedule, Adherence Tracker & Reminders*)  
**Stack:** MERN (`React 18 + Vite + Tailwind CSS`, `Node.js + Express`, `MongoDB + Mongoose`, `Socket.IO`, `JWT`)  
**Architecture:** Single Full-Stack Application + Single MongoDB Database (Role-Based Views linked via a 6-Digit Patient Care Code)  
**Submission Deadline:** Friday, 20 November 2026, 2:00 PM IST  

---

## 1. Environment & Accounts Setup

Create a `.env` file in `/server` and `/client` locally (never commit `.env` to GitHub; commit `.env.example` instead):

### `server/.env.example`
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/thecarepal_meds
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173
```

### `client/.env.example`
```env
VITE_API_URL=http://localhost:5000
```

---

## 2. System Architecture & User Flows

### Single App, Single Database, Two Role-Based Views
1. **Authentication (`POST /api/auth/register`, `POST /api/auth/login`):**
   * Users select **`family`** or **`caretaker`** during signup/login.
   * Include **Two 1-Click Demo Login Buttons** directly below the login form (`Demo: Family (Rohan Verma)` and `Demo: Caretaker (Nurse Kavita)`) pre-linked to the seeded patient so evaluators can test both portals in one click.
2. **6-Digit Care Code Pairing (`POST /api/patients`, `POST /api/patients/join`):**
   * **Family:** Creates a Patient profile -> backend auto-generates a unique 6-digit `careCode` (e.g., `482910`). Family shares this code with the nurse.
   * **Caretaker:** Enters the 6-digit `careCode` -> links that patient to the caretaker's **"My Assigned Patients"** list.
3. **Real-Time Sync (Socket.IO):**
   * Clients join room `patient_${patientId}`. Whenever a caretaker marks a dose as `given` or `skipped`, the server emits `scheduleUpdated` so the Family Dashboard updates live without a page refresh.

---

## 3. MongoDB Schemas (`server/models/`)

### `User.js`
```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed with bcrypt
  role: { type: String, enum: ['family', 'caretaker'], required: true },
  patients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Patient' }]
}, { timestamps: true });
```

### `Patient.js`
```javascript
const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  condition: { type: String, default: 'Home Care' },
  careCode: { type: String, required: true, unique: true }, // 6-digit numeric string
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
```

### `Medicine.js` (Matches Required Assignment JSON Shape)
```javascript
const medicineSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  // Exact required JSON fields for prescription-reading AI compatibility:
  name: { type: String, required: true },
  strength: { type: String, required: true }, // e.g., "500mg"
  dose: { type: String, required: true },     // e.g., "1 tablet"
  times: [{ type: String, required: true }],  // e.g., ["08:00", "20:00"]
  food: { type: String, enum: ['before', 'after', 'any'], default: 'after' },
  startDate: { type: String, required: true }, // "YYYY-MM-DD"
  endDate: { type: String, required: true },   // "YYYY-MM-DD"
  // Stock tracking fields:
  currentStock: { type: Number, required: true, min: 0 },
  lowStockThresholdDays: { type: Number, default: 3 },
  prescriptionImageUrl: { type: String, default: '' } // Optional good-to-have
}, { timestamps: true });
```

### `DoseLog.js`
```javascript
const doseLogSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  scheduledDate: { type: String, required: true }, // "YYYY-MM-DD"
  scheduledTime: { type: String, required: true }, // "08:00"
  status: { type: String, enum: ['given', 'skipped'], required: true },
  reasonText: { type: String, default: '' },       // Required when status === 'skipped'
  loggedBy: { type: String, required: true },
  loggedAt: { type: Date, default: Date.now }
});
// Prevent duplicate logs for the exact same dose slot (prevents double-dosing)
doseLogSchema.index({ patientId: 1, medicineId: 1, scheduledDate: 1, scheduledTime: 1 }, { unique: true });
```

### `HandoverNote.js` (Good-to-Have Bonus)
```javascript
const handoverNoteSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  shift: { type: String, enum: ['Day to Night', 'Night to Day'], required: true },
  noteText: { type: String, required: true },
  authorName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
```

---

## 4. Brand Identity & UI Design (Inspired by `thecarepal.com`)

Design the interface as a native companion module inside TheCarePal's home-care ecosystem (*"Trusted Care at Home • Peace of Mind"*):

* **Custom Inline SVG Logo (`<BrandLogo />`):**
  * **Icon:** A clean vector emblem combining a caring heart/shield outline in Deep Care Teal (`#0D9488`) with a warm coral (`#E07A5F`) medical cross accent.
  * **Wordmark:** `The` (`text-slate-700 font-medium`) + `Care` (`text-teal-700 font-bold`) + `Pal` (`text-[#E07A5F] font-bold`) + a small teal pill badge **`MedSync`**.
* **Typography:** Load Google Font **`Plus Jakarta Sans`** in `client/index.html` and set it as the default font family.
* **Color Palette:**
  * **Page Background:** Soft warm light gray (`#F8FAFC`)
  * **Card Surfaces:** Crisp pure white (`#FFFFFF`) with `rounded-2xl` corners and subtle borders (`#E2E8F0`)
  * **Primary Brand Color:** Deep Care Teal (`#0D9488`) for primary actions, active tabs, and headers
  * **Secondary Brand Accent:** Warm Coral (`#E07A5F`) for empathetic care highlights
  * **Semantic Status Colors (Consistent Across All Views):**
    * **Given / Healthy Adherence:** Emerald Green (`#16A34A`)
    * **Before Food / Low Stock Warning:** Warm Amber (`#D97706`)
    * **Skipped / Urgent Refill Needed:** Clear Red (`#DC2626`)
* **Mobile-First Layout & Product Sense:**
  * Wrap main dashboard content in a centered responsive container (`max-w-3xl mx-auto px-4`) so it feels like a native mobile app on phones and a clean portal on desktop.
  * Display a **Patient Context Banner** directly beneath the top navbar showing `Patient: Ramesh Verma (74) • Post-Stroke & Hypertension Care` alongside a 1-click copyable badge `Care Code: 482910`.
  * Make Caretaker **Given** and **Skipped** action buttons at least `44px` tall (`py-3 px-5`) for effortless one-handed mobile use.

---

## 5. Must-Have Functional Requirements

1. **Add & Manage Medicines:**
   * Form supporting `name`, `strength`, `dose`, multiple `times` (`HH:mm`), `food` (`before | after | any`), `startDate`, `endDate`, `currentStock`, and `lowStockThresholdDays`.
   * Include an **"Import AI Prescription JSON"** modal where users can paste a JSON object matching TheCarePal's exact schema to auto-populate and save a medicine.
2. **Caretaker Daily Schedule (`role === 'caretaker'`):**
   * Fetch active medicines for today (`startDate <= today <= endDate`) merged with today's `DoseLog` records.
   * Group doses into **Morning (05:00–11:59)**, **Afternoon (12:00–16:59)**, and **Night (17:00–23:59)**.
   * **Mark Given:** Creates a `given` `DoseLog`, **locks the card** with a green `"Given at HH:MM"` badge (preventing accidental double-dosing), and decrements `currentStock` by 1.
   * **Mark Skipped:** Opens a modal requiring a reason via 1-tap quick chips (*Patient Asleep*, *Refused Medicine*, *Fasting for Lab Test*) or a custom text input.
3. **Family Adherence Dashboard (`role === 'family'`):**
   * Calculate **Weekly Adherence %** over the past 7 days: `Math.round((givenCount / totalScheduledCount) * 100)`.
   * Render a prominent adherence card/progress ring plus a 7-day daily completion bar chart.
   * Display a **Skipped Doses Feed** listing medicine name, scheduled date/time, caregiver name, and exact `reasonText`.
4. **Dose Reminders (Browser Push Notifications):**
   * Request `Notification.requestPermission()` on dashboard load and check every 30 seconds if any pending dose matches the current `HH:mm` time to trigger a browser notification.
   * Include a **"Test Reminder"** button in the top navbar to fire a sample browser push notification + in-app toast immediately during testing or demo recording.
5. **Stock Tracking & Low-Stock Warnings:**
   * Calculate `daysRemaining = Math.floor(medicine.currentStock / medicine.times.length)`.
   * Whenever `daysRemaining <= medicine.lowStockThresholdDays`, display a prominent **"Low Stock: Runs out in X days"** warning banner on both Family and Caretaker views.

---

## 6. Synthetic 1-Week Seed Script (`server/seed.js`)

Run `node seed.js` to populate dynamic dates relative to `new Date()` so the demo is always fresh:

* **Demo Users:**
  * `Rohan Verma` (`rohan.family@demo.com` / `Demo@123`, `role: 'family'`)
  * `Nurse Kavita R.` (`kavita.nurse@demo.com` / `Demo@123`, `role: 'caretaker'`)
* **Patient:**
  * `Ramesh Verma`, Age `74`, Condition: `Post-Stroke & Hypertension Care`, `careCode: '482910'` (linked to both demo users)
* **5 Medicines (`startDate`: 15 days ago, `endDate`: 30 days from today):**
  1. `Pantoprazole` | `40mg` | `1 tablet` | `["07:30"]` | `before` | `currentStock: 14`
  2. `Telmisartan` | `40mg` | `1 tablet` | `["08:30"]` | `after` | `currentStock: 2` *(Triggers immediate "Runs out in 2 days" warning)*
  3. `Metformin` | `500mg` | `1 tablet` | `["09:00", "21:00"]` | `after` | `currentStock: 24`
  4. `Donepezil` | `5mg` | `1 tablet` | `["14:00"]` | `after` | `currentStock: 10`
  5. `Atorvastatin` | `10mg` | `1 tablet` | `["21:30"]` | `after` | `currentStock: 18`
* **Past 7 Days of Logs (`Day -7` to `Day -1` -> 42 total doses):**
  * **38 `given`** and **4 `skipped`** (~90.5% weekly adherence):
    * `Day -5` (`14:00` Donepezil): `"Patient fell asleep right after lunch"`
    * `Day -3` (`21:00` Metformin): `"Mild acidity after dinner; held evening dose"`
    * `Day -2` (`08:30` Telmisartan): `"Fasting for morning blood test"`
    * `Day -1` (`14:00` Donepezil): `"Refused afternoon tablet; took evening medicines normally"`
* **Today (`Day 0`):**
  * Mark `07:30 Pantoprazole` as `given` by `Nurse Kavita R.`; leave the remaining 5 doses **Pending** for live demo actions.

---

## 7. Step-by-Step Build Prompts for Antigravity

### Step 1: Backend & Seed Data
> "Initialize a `/server` Node.js + Express + Mongoose + Socket.IO project using the schemas in `IMPLEMENTATION_PLAN.md`. Implement JWT auth (`/api/auth/register`, `/api/auth/login`), patient creation and 6-digit Care Code joining (`/api/patients`, `/api/patients/join`), medicine CRUD (`/api/medicines`), today's merged schedule (`/api/schedule/today/:patientId`), dose logging with stock decrement and double-dose prevention (`/api/doses/log`), and 7-day adherence analytics (`/api/adherence/weekly/:patientId`). Emit Socket.IO `scheduleUpdated` events to room `patient_${patientId}` on dose changes. Create and run `seed.js` with the synthetic 1-week data."

### Step 2: Branded Frontend (`TheCarePal MedSync` UI + Both Role Portals)
> "Build the complete, responsive React 18 + Vite + Tailwind CSS frontend in `/client` following Section 4 and Section 5 of `IMPLEMENTATION_PLAN.md`. Load Google Font `Plus Jakarta Sans`, create the inline SVG `<BrandLogo />` for `TheCarePal MedSync` using Deep Care Teal (`#0D9488`) and Warm Coral (`#E07A5F`), and build: (1) Login/Signup with Family vs Caretaker role tabs plus two 1-click Demo Login buttons (`rohan.family@demo.com` and `kavita.nurse@demo.com`), (2) 6-Digit Care Code pairing screen, (3) Caretaker View with Morning/Afternoon/Night cards, 44px+ Given (double-dose locked + stock deduction) and Skipped (modal with quick chips + required reason) buttons, (4) Family View with Weekly Adherence %, 7-day bar chart, Low-Stock Refill Warnings, Skipped Doses Feed, Add Medicine form, and 'Import AI JSON' modal, and (5) Socket.IO live updates plus browser `Notification API` reminders with a 'Test Reminder' button in the top navbar."

### Step 3: Bonus Features & Submission Polish
> "Add the Day/Night Shift Handover Notes panel (`GET/POST /api/handovers/:patientId`) visible to both Caretaker and Family views, plus an optional Prescription Image URL field on medicines. Verify mobile responsiveness, clean error handling, `.env.example` files in `/server` and `/client`, and write a comprehensive `README.md` covering setup steps, architectural decisions, future roadmap, and AI tools used."