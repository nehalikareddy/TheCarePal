# TheCarePal MedSync (Task FS-05)

> **Shared Medication Schedule, Adherence Tracker & Reminders**  
> Built as a native companion module for TheCarePal’s home-care ecosystem (*"Trusted Care at Home"*).

---

## 🌟 Overview & Key Highlights

**TheCarePal MedSync** solves the medication-management dilemma in home care: ensuring that family members and professional caretakers stay perfectly synchronized in real time without accidental double-dosing or communication gaps.

- **Dual Role-Based Portals:**
  - **Family Portal:** Live 7-day adherence gauge, daily completion trends, transparent skipped doses feed with caregiver observations, inventory stock tracking with low-stock warnings, and easy medication management via standard **+ Add Medicine** scheduling.
  - **Caretaker / Nurse Portal:** Mobile-first daily schedule grouped chronologically into **Morning (05:00–11:59)**, **Afternoon (12:00–16:59)**, and **Night (17:00–23:59)** with 44px+ touch-friendly **Given** and **Skipped** actions.
- **Accidental Double-Dosing Prevention:** Strict compound indexing `(patientId, medicineId, scheduledDate, scheduledTime)` and automatic card locking immediately disable repeat submissions once a dose is logged.
- **6-Digit Care Code Pairing:** Family members generate a unique numeric Care Code (e.g., `482910`) that caretakers enter to link patients in seconds.
- **Zero-Refresh Live Sync:** Powered by **Socket.IO** rooms (`patient_${patientId}`). When a caretaker records a dose, family dashboards update instantly.
- **Browser Push Notifications & Sound:** Native browser `Notification API` integration with Web Audio API chime, 30-second interval schedule checking, and a top-navbar **"Test Reminder"** trigger.
- **Shift Handover Notes (Bonus):** Day-to-Night and Night-to-Day transition logs accessible by both family and caregivers.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React, Socket.IO Client, Axios, Canvas Confetti
- **Backend:** Node.js, Express, Socket.IO, JWT, bcryptjs, CORS, Dotenv
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Typography & Branding:** Google Font *Plus Jakarta Sans*, Custom SVG Emblem combining Deep Care Teal (`#0D9488`) and Warm Coral (`#E07A5F`)

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+ recommended, tested on v22)
- npm (v9+)
- MongoDB Atlas cluster URI (configured in `server/.env`)

### 1. Backend Setup
```bash
cd server
npm install
npm run seed     # Populates the 1-week synthetic history & demo accounts
npm start        # Starts the API & WebSocket server on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd ../client
npm install
npm run dev      # Launches Vite dev server on http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser.

---

## 🔑 1-Click Demo Evaluator Accounts

For instant testing, the login screen features **Two 1-Click Demo Login Buttons** that bypass manual credential entry and connect to the seeded patient:

| Role | Demo Account Email | Password | Pre-linked Patient |
| :--- | :--- | :--- | :--- |
| **Family Member** | `rohan.family@demo.com` | `Demo@123` | **Ramesh Verma** (Age 74, Code: `482910`) |
| **Nurse / Caretaker** | `kavita.nurse@demo.com` | `Demo@123` | **Ramesh Verma** (Age 74, Code: `482910`) |

*Tip: A handy **Portal Preview Switcher** bar is also available at the top of the dashboard so evaluators can switch between the Family and Caretaker perspectives in a single click without logging out!*

---

## 📊 Seed Data Summary (Past 7 Days + Today)

- **Patient:** Ramesh Verma (74), Post-Stroke & Hypertension Care, Care Code: `482910`
- **5 Prescriptions:**
  1. *Pantoprazole 40mg* — `07:30` (Before food)
  2. *Telmisartan 40mg* — `08:30` (After food) — **Low Stock Warning Active** (2 units left)
  3. *Metformin 500mg* — `09:00` & `21:00` (After food)
  4. *Donepezil 5mg* — `14:00` (After food)
  5. *Atorvastatin 10mg* — `21:30` (After food)
- **Past 7 Days History:** 42 scheduled doses with **38 Given** and **4 Skipped** (~90.5% adherence):
  - *Day -5 (14:00 Donepezil):* "Patient fell asleep right after lunch"
  - *Day -3 (21:00 Metformin):* "Mild acidity after dinner; held evening dose"
  - *Day -2 (08:30 Telmisartan):* "Fasting for morning blood test"
  - *Day -1 (14:00 Donepezil):* "Refused afternoon tablet; took evening medicines normally"
- **Today:** `07:30 Pantoprazole` is marked as **Given** (Locked); remaining 5 doses are **Pending** for live demo actions.

---

## 📡 API Endpoints Reference

### Authentication
- `POST /api/auth/register` — Register family member or caretaker
- `POST /api/auth/login` — Authenticate and receive JWT
- `GET /api/auth/me` — Get current user profile and linked patients

### Patients & Care Code
- `GET /api/patients` — List user's linked patients
- `POST /api/patients` — Create patient and generate unique 6-digit Care Code
- `POST /api/patients/join` — Caretaker enters 6-digit Care Code to pair

### Daily Schedule & Dose Logging
- `GET /api/schedule/today/:patientId` — Merged schedule (Morning / Afternoon / Night)
- `POST /api/doses/log` — Record dose as `given` or `skipped` (requires reason, decrements stock, locks against double-dosing, emits Socket.IO event)

### Adherence & Analytics
- `GET /api/adherence/weekly/:patientId` — 7-day adherence %, daily completion stats, skipped doses feed, and low-stock alerts

### Medicines & Prescriptions
- `GET /api/medicines/patient/:patientId` — All prescribed medicines
- `POST /api/medicines` — Add medicine
- `DELETE /api/medicines/:id` — Delete medicine

### Shift Handovers
- `GET /api/handovers/:patientId` — Get recent shift handover notes
- `POST /api/handovers/:patientId` — Log Day-to-Night or Night-to-Day observation

---

## 🌐 Cloud Deployment Guide (Render / Vercel)

### 1. Backend Web Service (Render)
- **Repository:** Connect `TheCarePal` repository.
- **Root Directory:** `server`
- **Environment:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Environment Variables:**
  - `PORT`: `5000`
  - `MONGODB_URI`: `mongodb+srv://...`
  - `JWT_SECRET`: `<your_secret_key>`
  - `CLIENT_URL`: `https://your-frontend-app.vercel.app` (or `*`)

### 2. Frontend Web App (Render Static Site or Vercel)
- **Root Directory:** `client`
- **Build Command:** `npm run build`
- **Publish / Output Directory:** `dist`
- **Environment Variables:**
  - `VITE_API_URL`: `https://thecarepal.onrender.com` (your deployed backend URL)

---

## 🧪 Verification & Testing Commands

To run quick validation tests against the live API and database:

```bash
# Verify Health, Demo Login, Patient Linking, and Adherence
node -e "fetch('http://localhost:5000/api/health').then(r => r.json()).then(console.log)"

# Run seed script at any time to reset demo data
npm run seed --prefix server
```
