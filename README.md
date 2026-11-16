# 🚀 LuminaLearn - Smart Tuition & Institute Management System

[![Academic Project](https://img.shields.io/badge/Course-CSC3213%20Computer%20Science%20Project%20I-blue.svg?style=flat-square)](https://sci.pdn.ac.lk/)
[![University](https://img.shields.io/badge/University-University%20of%20Peradeniya-darkred.svg?style=flat-square)](https://www.pdn.ac.lk/)
[![Status](https://img.shields.io/badge/status-v1.0%20Active-success.svg?style=flat-square)](https://github.com/thanukavishal/LuminaLearn)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=flat-square)](https://github.com/thanukavishal/LuminaLearn)
[![Stack](https://img.shields.io/badge/stack-MERN%20%7C%20AI%20%7C%20TailwindCSS%20v4-orange.svg?style=flat-square)](https://github.com/thanukavishal/LuminaLearn)
[![License](https://img.shields.io/badge/license-Academic%20%2F%20ISC-purple.svg?style=flat-square)](LICENSE)
[![AI Engine](https://img.shields.io/badge/AI-Google%20Gemini%203.7%20%2F%202.5-4285F4.svg?style=flat-square&logo=google)](https://ai.google.dev/)
[![SMS Gateway](https://img.shields.io/badge/SMS%20Gateway-Text.lk%20v3-00C853.svg?style=flat-square)](https://text.lk/)

---

## 📌 Executive Summary

**LuminaLearn** is a comprehensive, enterprise-grade Smart Tuition and Institute Management System tailored for **Kirula Education Center, Menikhinna, Kandy**. Developed as part of **CSC3213: Project in Computer Science I** at the **Faculty of Science, University of Peradeniya**, the platform unites physical on-premise operations with online digital education into a cohesive, high-performance web platform.

The system addresses the operational and academic challenges faced by growing educational institutes by providing physical counter desk automation (rapid QR badge attendance, cash payment logging, custom receipt issuance, and instant parent SMS alerts) alongside a rich virtual learning environment (scheduled YouTube live streams, interactive classroom chat, speaking requests, modular 4-week grade curricula, in-app protected PDF reading, timed quizzes, and automated student performance early-warning alerts).

---

## 👥 Five-Tier Role-Based Access Control (RBAC)

LuminaLearn enforces a strict, multi-tiered permission model across **five distinct user roles**:

```
                                  ┌────────────────────────┐
                                  │   LuminaLearn Portal   │
                                  └───────────┬────────────┘
         ┌──────────────────┬─────────────────┼─────────────────┬──────────────────┐
         ▼                  ▼                 ▼                 ▼                  ▼
   👑 **Admin**       👨‍🏫 **Teacher**    💼 **Counter**     🎓 **Student**     👨‍👩‍👧 **Parent**
  Full Management    Curriculum, Live   QR Check-in &     Online & Physical   Child Oversight,
  & System Config    Classes & Quizzes   Cash Receipts    Course Materials    Attendance & SMS
```

| Role | Primary Responsibilities & Capabilities |
| :--- | :--- |
| 👑 **Administrator** | Institutional oversight, user management, course approvals, timetable schedules & classroom allocations, Text.lk SMS gateway configuration & live balance monitor, system audit logging, database backup & data export center, broadcast announcements, and holistic financial & academic analytics. |
| 👨‍🏫 **Teacher / Instructor** | Grade-wise modular curriculum management (4-week syllabus), recorded video lectures, downloadable/protected lecture PDF notes, automated quiz authoring, assignment grading, YouTube live streaming with real-time viewer tracking, interactive chat moderation, student voice question approval, and direct student/parent messaging. |
| 💼 **Counter Staff / Desk** | Fast physical student registration, high-speed camera QR code attendance scanning / barcode lookup, physical cash fee payment recording with custom receipt numbers, instant parent SMS triggers, and student ID card generation & printing. |
| 🎓 **Student** *(Online & Physical)* | Dual-track student profiles, self-enrollment, mock card payments with 6-digit SMS OTP verification, in-app PDF reader with page progress tracking, video lessons, interactive timed quizzes with instant feedback, assignment submissions, live classroom participation with voice questions & animated reactions, downloadable digital ID cards, and personal performance dashboards. |
| 👨‍👩‍👧 **Parent / Guardian** | Frictionless passcode/phone login, multi-child switcher, real-time attendance history & check-in timestamps, fee receipts & payment ledger monitoring, academic progress tracking, and automated SMS arrival/departure notifications. |

---

## 🎯 Key System Features

### 🤖 1. LuminaChat – AI-Powered Virtual Assistant
- Integrated institutional AI assistant powered by the **Google GenAI SDK** (`@google/genai`) using candidate models **Gemini 3.7 Flash** and **Gemini 2.5 Flash**.
- Ingests institutional domain context (`institute_info.txt`), course catalogs, schedules, fees, and policy information.
- Delivers 24/7 academic assistance, class schedule inquiries, fee policies, and tuition guidance.

### 🎥 2. Interactive Live Classroom & Live Streaming
- **YouTube Live Stream Integration**: Direct broadcast embedding for scheduled and instant live classes.
- **Scheduled Live Hero Section**: Dedicated live classroom banner displaying countdown timers, active broadcast indicators, and one-click entry.
- **Real-Time Viewer Heartbeat**: Tracks active student presence, join times, ping intervals, and total watched duration.
- **Two-Way Live Chat & Reaction Animations**: Supports student text chat, emoji reactions with floating physics animations (`custom-anim-rocket`, `custom-anim-fire`, etc.), file attachments, and staff-only communications.
- **Live Speaking / Hand Raise**: Students can raise hands and record audio questions; instructors can approve, listen, and respond during the session.
- **Post-Session Feedback & Reviews**: Post-live student rating dialogs and teacher feedback synchronization.

### 📱 3. Smart SMS Gateway Integration (Text.lk API v3)
- Direct integration with Sri Lanka's **Text.lk REST API v3** with HTTP fallback and built-in development simulation mode.
- **Automated Phone Normalization**: Validates and normalizes Sri Lankan numbers (`07X` ➔ `+947X`).
- **Real-Time Automated SMS Triggers**:
  - 📷 **Attendance Confirmation SMS**: Instantly alerts parents when a student is scanned present at the institute.
  - 💳 **Payment Receipt SMS**: Dispatches transaction amount, course title, and reference receipt numbers.
  - 🔑 **OTP Verification SMS**: Sends 6-digit verification codes for online self-registration and fee checkout.
  - 📢 **Bulk Broadcast SMS**: Dispatches class postponement, timetable changes, or emergency notices to student cohorts.
- **Live Admin Balance Monitor**: Real-time SMS credit balance and profile check in the Admin SMS Settings dashboard.

### 📷 4. QR Code Attendance & Digital ID Cards
- **High-Speed Camera Scanner**: Integrated `html5-qrcode` scanner for swift QR code badge scanning at physical institution counters.
- **Digital Student ID Card Generator**: Generates high-resolution printable ID cards featuring the student's photo, registration number (`OL-GXX-YYYY-XXXX` or `REG-GXX-YYYY-XXXX`), barcode, and scannable QR code (`qrcode.react`).
- **Manual Lookup Fallback**: Rapid student search by registration number, NIC, or name for desk staff.

### 🚨 5. Student Performance & Early Warning System
- Real-time early warning engine (`earlyWarningService.js`) identifying at-risk students based on:
  - Consecutive or frequent attendance drops.
  - Declining quiz test scores and benchmarks.
  - Unsubmitted assignments past due dates.
  - Fee payment delays beyond the monthly deadline.
- Interactive **Early Warning Section** and **Student Performance Modal** empowering teachers and administrators to take proactive academic interventions.

### 📅 6. Interactive Timetable & Calendar Engine
- Dynamic scheduling system with Day, Week, and Month views (`InteractiveCalendar.jsx`).
- **Classroom Allocation & Capacity Tracking**: Prevents physical room booking conflicts.
- **Teacher Availability Tracking**: Monitors instructor schedules and availability windows (`TeacherAvailabilityModal.jsx`).
- **Reschedule Workflows**: Easy class rescheduling with automated schedule change notices sent to enrolled students.

### 📚 7. Modular Course & Content Management
- **4-Week Structured Curriculum**: Content partitioned by Grade (Grade 6–11, A/L) and 4-week modular monthly blocks.
- **Multi-Format Materials**:
  - 📹 Video Lessons with embedded players and watch tracking.
  - 📄 PDF Lecture Notes with configurable download restrictions (Immediate, 1-Month lock, Custom date, or View Only).
  - 📖 **In-App PDF Reader**: Custom viewer (`PdfReaderModal.jsx`) that logs reading percentage and page progress directly to the database.

### 📝 8. Quiz & Assessment Engine
- Supports Multiple Choice (MCQ), Multi-Select, and True/False questions with diagram/image uploads.
- Configurable time limits, passing percentage benchmarks, and post-submission answer explanations.
- Automatic grading engine with detailed submission logs and performance analytics.

### 📤 9. Assignment Submission & Evaluation
- Teachers attach instruction sheets, set maximum marks, define due dates, and control late submissions.
- Students upload PDF submissions directly with real-time status tracking (Submitted, Graded, Overdue).
- In-platform grading, marks assignment, and personalized teacher feedback.

### 💳 10. Dual Payment Architecture
- **Online Student Portal**: Mock card checkout flow protected by 6-digit SMS OTP verification (5-minute TTL in MongoDB).
- **Physical Counter Cash Payments**: Counter staff can record cash payments with manual physical receipt numbers, course allocation, and automated parent SMS notifications.
- **Invoice & Receipt Generation**: Complete payment transaction histories, payment status badges (Paid / Pending / Overdue), and downloadable PDF receipts.

### 🛡️ 11. System Audit Logs & Activity Trail
- Centralized audit logging (`auditLogger.js`, `auditLogRoutes.js`) tracking critical administrative actions.
- Monitors user registrations, role elevations, password changes, database updates, and login attempts.
- Visual audit log explorer (`AuditLogs.jsx`) with filtering by date, action type, and user identity.

### 💾 12. Database Backup & Data Export Center
- Comprehensive admin backup interface (`ExportBackupCenter.jsx`, `exportService.js`).
- One-click full database JSON backup generation.
- Filtered CSV and JSON data exports for student directories, attendance logs, financial ledgers, and audit trails.

### 💬 13. Direct & Broadcast Messaging
- **1-on-1 Messaging Popup**: Enables direct conversations between teachers, students, and parents with voice note recording and attachment sharing.
- **System Announcements**: Institution-wide and grade-specific broadcast messaging with multi-channel push and SMS alerts.

### 📊 14. Multi-Level Analytics & Academic Reports
- Interactive charts comparing online vs. physical enrollment numbers.
- Grade-by-grade breakdowns (Junior Secondary, O/L, A/L), course revenue, attendance frequency, quiz score distributions, and reading material completion rates.

### 🌓 15. Modern Responsive UI & Theming
- Fully responsive design built with **React 19** and **Tailwind CSS v4**.
- Persistent **Dark Mode / Light Mode** switching via `ThemeContext`.
- Global search bar (`GlobalSearchBar.jsx`) for instant navigation across courses, lessons, instructors, and notices.

---

## 🛠️ Technology Stack

```
                                  TECH STACK ARCHITECTURE
 ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   FRONTEND LAYER                                         │
 │  React 19.2  •  Vite 8.0  •  Tailwind CSS v4.2  •  React Router 7.14  •  Axios 1.15      │
 │  HTML5-QRCode  •  QRCode.react  •  React Easy Crop  •  React Icons  •  React Hot Toast  │
 └────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ REST API / JSON / Multipart
 ┌────────────────────────────────────────────▼─────────────────────────────────────────────┐
 │                                    BACKEND LAYER                                         │
 │  Node.js 18+  •  Express.js 5.2  •  JWT Auth  •  Multer  •  Bcrypt.js  •  Brevo API v3   │
 └──────────────────────┬─────────────────────────────────────────────┬─────────────────────┘
                        │                                             │
 ┌──────────────────────▼─────────────────────┐ ┌─────────────────────▼─────────────────────┐
 │               DATABASE LAYER               │ │            EXTERNAL SERVICES              │
 │  MongoDB Atlas / Mongoose 9.5 ODM          │ │  • Google Gemini AI (@google/genai 2.16)  │
 │  Indexed Collections & TTL Caches          │ │  • Text.lk SMS Gateway REST API v3        │
 │  Automatic Startup Migration Pipeline      │ │  • Google OAuth 2.0 Identity Platform     │
 └────────────────────────────────────────────┘ └───────────────────────────────────────────┘
```

### Frontend
- **Framework & Build**: [React 19](https://react.dev/), [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), [PostCSS](https://postcss.org/)
- **Routing & State**: [React Router v7](https://reactrouter.com/), Context API (`ThemeContext`)
- **UI Components & Utilities**: [React Icons](https://react-icons.github.io/react-icons/), [React Hot Toast](https://react-hot-toast.com/), [React Easy Crop](https://www.npmjs.com/package/react-easy-crop)
- **Scanning & Badges**: [HTML5-QRCode](https://github.com/mebjas/html5-qrcode), [qrcode.react](https://github.com/zpao/qrcode.react)
- **Authentication**: [@react-oauth/google](https://www.npmjs.com/package/@react-oauth/google)
- **HTTP Client**: [Axios](https://axios-http.com/)

### Backend
- **Server Runtime**: [Node.js](https://nodejs.org/) (v18+), [Express.js 5.2](https://expressjs.com/)
- **Database & ODM**: [MongoDB Atlas](https://www.mongodb.com/atlas), [Mongoose 9.5](https://mongoosejs.com/)
- **AI Engine**: [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) (`gemini-3.7-flash`, `gemini-2.5-flash`)
- **SMS Gateway**: [Text.lk REST API v3](https://text.lk/)
- **Email Service**: [Brevo](https://www.brevo.com/) API v3 (`@getbrevo/brevo`)
- **Security & Cryptography**: [JSON Web Tokens (JWT)](https://jwt.io/), [Bcrypt.js](https://www.npmjs.com/package/bcryptjs)
- **File Uploads**: [Multer](https://github.com/expressjs/multer)

---

## ⚙️ Installation & Getting Started

### 📋 Prerequisites
Ensure you have the following installed on your development machine:
- **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **npm**: `v9.0.0` or higher
- **MongoDB**: Local MongoDB instance or a free [MongoDB Atlas Cluster](https://www.mongodb.com/cloud/atlas)
- **Google AI Studio API Key**: Optional, for LuminaChat AI ([Get Gemini Key](https://aistudio.google.com/))
- **Text.lk API Token**: Optional, for live SMS delivery in Sri Lanka ([Get Text.lk Token](https://text.lk/))
- **Brevo API Key**: Optional, for transactional emails ([Get Brevo Key](https://www.brevo.com/))

---

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/shamilaw-sci/CSC3213_20_Group_F.git
cd CSC3213_20_Group_F
```

---

### 2️⃣ Backend Setup
1. Navigate into the backend directory:
   ```bash
   cd backend
   ```
2. Install backend dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` directory:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database (MongoDB Atlas)
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/LuminaLearn?retryWrites=true&w=majority

   # Authentication Secrets
   JWT_SECRET=your_jwt_secret_key_here

   # Frontend Application URL (for CORS & email links)
   FRONTEND_URL=http://localhost:5173

   # Google Gemini AI Integration
   GEMINI_API_KEY=your_google_gemini_api_key

   # Google OAuth 2.0 (Optional)
   GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

   # Text.lk SMS Gateway (Optional - falls back to console simulator if unset)
   TEXTLK_API_TOKEN=your_textlk_api_token
   TEXTLK_SENDER_ID=Kirula Edu

   # Email Service (Brevo / Sendinblue API)
   BREVO_API_KEY=your_brevo_api_v3_key
   BREVO_FROM_EMAIL=mail@luminalearn.edu.lk
   BREVO_FROM_NAME=LuminaLearn
   ```
4. Seed the initial Administrator Account:
   ```bash
   node seedAdmin.js
   ```
   > **Admin Account Credentials:**
   > - **Email:** `admin@luminalearn.com` (configurable via `ADMIN_SEED_EMAIL`)
   > - **Password:** `admin123` (configurable via `ADMIN_SEED_PASSWORD`)

5. Start the backend server:
   ```bash
   # Development mode with auto-reload:
   npm run dev

   # Standard production start:
   npm start
   ```
   The backend API will run on `http://localhost:5000`.

---

### 3️⃣ Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend/` directory:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

---

## 🔒 Security & Data Integrity

- 🔑 **Stateless JWT Authentication**: Secure authentication via JSON Web Tokens with fine-grained role-based route middleware.
- 🛡️ **Bcrypt Password Hashing**: Passwords are salted and hashed using Bcrypt before persistence.
- ⚡ **Sparse Indexing**: MongoDB schemas use sparse unique indexes to support student registrations with or without email addresses.
- 🧹 **Automatic Startup Migration Pipeline**: Migrates base64 legacy assets to static disk storage and ensures database index integrity upon startup.
- 🔐 **First-Login Security**: Accounts created via administrative bulk registration require mandatory password changes upon initial sign-in.
- 📜 **Administrative Audit Trail**: Every sensitive action (role elevation, user deletion, configuration changes) is logged with timestamps and user identifiers.

---

## 👨‍💻 Project Development Team

This project is developed by **Group F** for the course **CSC3213: Project in Computer Science I**, **Department of Statistics and Computer Science, Faculty of Science, University of Peradeniya**.

| **Thanuka Vishal** | S/21/372 | `thanukavishal22@gmail.com` | [@thanukavishal](https://github.com/thanukavishal)<br>
| **Pathum Gunawardhana** | S/21/060 | `s21060@sci.pdn.ac.lk` | [@PathumGunawardhana](https://github.com/PathumGunawardhana)<br>
| **Rashmika Wijewardhana** | S/21/580 | `s21580@sci.pdn.ac.lk` | [@rashwije18](https://github.com/rashwije18)<br>
| **Sakindu Rathnasiri** | S/21/486 | `s21486@sci.pdn.ac.lk` | [@Sakindu99](https://github.com/Sakindu99)<br>

---

## 🎓 Academic Information

- **📘 Course:** CSC3213 – Project in Computer Science I
- **👥 Group:** Group F (`CSC3213_20_Group_F`)
- **🏫 Institution:** University of Peradeniya, Sri Lanka
- **🏛️ Faculty:** Faculty of Science (Department of Statistics & Computer Science)
- **👨‍🏫 Project Supervisor:** Dr. Shamila Wickramasuriya
- **🏢 Partner Institution:** Kirula Education Center, Menikhinna, Kandy (Founder & Director: Mr. Chaminda Kumara Herath)

---

## 📄 License

This project is developed for academic purposes under the **ISC / Academic License**.

---

*Copyright © 2026 LuminaLearn by Kirula Education Center & Group F, Department of Statistics and Computer Science, University of Peradeniya.*
