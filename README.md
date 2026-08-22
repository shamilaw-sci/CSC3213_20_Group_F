# 🚀 LuminaLearn - Smart Tuition & Institute Management System

[![Status](https://img.shields.io/badge/status-v1.0%20Active-success.svg?style=flat-square)](https://github.com/thanukavishal/LuminaLearn)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=flat-square)](https://github.com/thanukavishal/LuminaLearn)
[![Stack](https://img.shields.io/badge/stack-MERN%20%7C%20AI%20%7C%20TailwindCSS-orange.svg?style=flat-square)](https://github.com/thanukavishal/LuminaLearn)
[![License](https://img.shields.io/badge/license-Academic%20%2F%20ISC-purple.svg?style=flat-square)](LICENSE)
[![AI Engine](https://img.shields.io/badge/AI-Google%20Gemini%203.7%20%2F%202.5-4285F4.svg?style=flat-square&logo=google)](https://ai.google.dev/)
[![SMS Gateway](https://img.shields.io/badge/SMS%20Gateway-Text.lk%20v3-00C853.svg?style=flat-square)](https://text.lk/)

---

## 📌 Overview

**LuminaLearn** is an enterprise-grade Smart Tuition and Institute Management System designed to digitalize, centralize, and streamline academic, administrative, and financial operations for tuition institutes and educational centers.

The platform seamlessly bridges physical classroom operations with online distance learning, offering a unified ecosystem for administrators, educators, desk counter staff, students, and parents.

---

## 👥 Five-Tier Role-Based Access Control (RBAC)

LuminaLearn provides dedicated interfaces and tailored permissions across **five distinct user roles**:

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
| 👑 **Administrator** | Institutional oversight, user management, course approvals, timetable schedules, Text.lk SMS gateway configuration & balance tracking, system broadcast announcements, and holistic financial & academic analytics. |
| 👨‍🏫 **Teacher / Instructor** | Grade-wise course curriculum management (4-week syllabus), recorded video lessons, downloadable/protected PDF materials, automated quiz assessments, assignment submissions & grading, YouTube live streaming with real-time viewer tracking, live chat moderation, student audio question approval, and direct messaging. |
| 💼 **Counter Staff / Desk** | Fast physical student registration, high-speed camera QR code attendance scanning / barcode lookup, physical cash fee payment recording with custom receipt numbers, instant parent SMS triggers, and student ID card printing. |
| 🎓 **Student** *(Online & Physical)* | Dual-track student profiles, self-enrollment, mock card payments with 6-digit SMS OTP verification, in-app PDF reader with reading progress tracking, video lectures, interactive timed quizzes with instant feedback & explanations, assignment submission, scheduled live classes with live chat & voice question asking, downloadable digital ID cards, and personal analytics. |
| 👨‍👩‍👧 **Parent / Guardian** | Frictionless passcode/phone login, multi-child switching, live attendance history & check-in timestamps, payment receipts & outstanding balance monitoring, academic progress tracking, and instant automated SMS notifications. |

---

## 🎯 Key System Features

### 🤖 1. LuminaChat – AI-Powered Virtual Assistant
- Integrated institutional AI assistant powered by **Google Gemini API** (`@google/genai` with candidate model fallbacks: Gemini 3.7 Flash, 2.5 Flash, 3.5 Flash).
- Ingests dynamic institutional context (`institute_info.txt`), course catalogs, schedules, and personalized student metrics.
- Provides immediate 24/7 academic support, schedule inquiries, and tuition FAQs.

### 🎥 2. Interactive Live Classroom & Live Streaming
- **YouTube Live Stream Integration**: Direct broadcast embedding for scheduled or instant live classes.
- **Real-Time Viewer Heartbeat**: Tracks active student viewers, join times, ping intervals, and total watched duration.
- **Two-Way Live Chat & Voice Messages**: Supports student text chats, voice audio notes, file attachments, broadcast alerts, and private staff-only communications.
- **Live Speaking / Hand Raise**: Students can raise hands to submit audio questions; instructors can approve, listen, and respond live.
- **Class Feedback & Reactions**: Post-session student rating emojis (⭐ Superb, 👍 Good, etc.) and instructor feedback replies.

### 📱 3. Smart SMS Gateway Integration (Text.lk API v3)
- Fully integrated with the **Text.lk REST API v3** with fallback to HTTP API and automated development simulation mode.
- **Automated Phone Normalization**: Automatically validates and formats Sri Lankan mobile numbers (`+94 7X XXX XXXX`).
- **Real-Time Automated SMS Triggers**:
  - 📷 **Attendance Confirmation SMS**: Instantly notifies parents when a student is scanned present/absent.
  - 💳 **Payment Receipt SMS**: Dispatches transaction amount, course title, and reference numbers.
  - 🔑 **OTP Verification SMS**: 6-digit verification codes for online registration and payments.
  - 📢 **Bulk Broadcast SMS**: Dispatches class postponement, timetable changes, or emergency notices to student & parent cohorts.
- **Live Admin Balance Monitor**: Real-time SMS credit balance and profile info in the Admin Settings dashboard.

### 📷 4. QR Code Attendance & Digital ID Cards
- **High-Speed Camera Scanner**: Integrated `html5-qrcode` scanner for swift QR code badge scanning at physical institution counters.
- **Digital Student ID Card Generator**: Generates high-resolution printable ID cards featuring the student's photo, registration number (`OL-GXX-YYYY-XXXX` or `REG-GXX-YYYY-XXXX`), barcode, and scannable QR code (`qrcode.react`).
- **Manual Lookup Fallback**: Rapid student search by registration number, NIC, or name for desk staff.

### 📚 5. Modular Course & Content Management
- **4-Week Structured Curriculum**: Content partitioned by Grade (Grade 6–11, A/L) and 4-week modular blocks.
- **Multi-Format Materials**:
  - 📹 Video Lessons with embedded players.
  - 📄 PDF Lecture Notes with download delay/protection options (Immediate, 1-Month lock, Custom date, or Disabled).
  - 📖 **In-App PDF Reader**: Custom viewer (`PdfReaderModal.jsx`) that logs reading percentage and page progress directly to the database.

### 📝 6. Quiz & Assessment Engine
- Supports Multiple Choice (MCQ), Multi-Select, and True/False question types with optional diagram uploads.
- Configurable time limits, passing percentage benchmarks, and post-submission answer explanations.
- Automatic grading engine with detailed submission logs for teachers and students.

### 📤 7. Assignment Submission & Evaluation
- Teachers attach instruction sheets, set maximum marks, define due dates, and control late submissions.
- Students upload PDF submissions directly with real-time status tracking (Submitted, Graded, Overdue).
- In-platform grading and marks assignment.

### 💳 8. Dual Payment Management System
- **Online Student Portal**: Mock card checkout flow protected by 6-digit SMS OTP verification (5-minute TTL in MongoDB).
- **Physical Counter Cash Payments**: Counter staff can record cash payments with manual physical receipt numbers, course allocation, and automated parent SMS notifications.
- **Invoice & Receipt Generation**: Complete payment transaction histories, payment status badges (Paid / Pending / Overdue), and downloadable PDF receipts.

### 💬 9. Direct & Broadcast Messaging
- **1-on-1 Messaging Popup**: Enables direct conversations between teachers, students, and parents with voice note recording and attachment sharing.
- **System Announcements**: Institution-wide and grade-specific broadcast messaging.

### 📊 10. Multi-Level Analytics & Academic Reports
- Interactive charts and metrics comparing online vs. physical enrollment numbers.
- Grade-by-grade breakdowns (Junior Secondary, O/L, A/L), course revenue, attendance frequency, quiz score distributions, and reading material completion rates.

### 🌓 11. Modern Responsive UI & Theming
- Fully responsive design built with **React 19** and **Tailwind CSS v4**.
- Persistent **Dark Mode / Light Mode** switching via `ThemeContext`.
- Global search bar for quick access across courses, lessons, instructors, and notices.

---

## 🛠️ Technology Stack

```
                                  TECH STACK ARCHITECTURE
 ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   FRONTEND LAYER                                         │
 │  React 19  •  Vite 8  •  Tailwind CSS v4  •  React Router 7  •  Axios  •  React Hot Toast │
 │  HTML5-QRCode  •  QRCode.react  •  React Easy Crop  •  React Icons  •  Google OAuth     │
 └────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ REST API / JSON / Multipart
 ┌────────────────────────────────────────────▼─────────────────────────────────────────────┐
 │                                    BACKEND LAYER                                         │
 │  Node.js  •  Express.js 5  •  JWT Auth  •  Multer  •  Bcrypt.js  •  Nodemailer (SMTP)     │
 └──────────────────────┬─────────────────────────────────────────────┬─────────────────────┘
                        │                                             │
 ┌──────────────────────▼─────────────────────┐ ┌─────────────────────▼─────────────────────┐
 │               DATABASE LAYER               │ │            EXTERNAL SERVICES              │
 │  MongoDB Atlas / Mongoose 9 ODM            │ │  • Google Gemini API (@google/genai)      │
 │  Indexed Collections & TTL Caches          │ │  • Text.lk SMS Gateway API v3             │
 │  Automatic Startup Migration Pipeline      │ │  • Google OAuth 2.0 Identity Platform     │
 └────────────────────────────────────────────┘ └───────────────────────────────────────────┘
```

### Frontend
- **Core**: [React 19](https://react.dev/), [Vite 8](https://vitejs.dev/), [JavaScript (ESM)](https://developer.mozilla.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), [PostCSS](https://postcss.org/)
- **Routing & State**: [React Router v7](https://reactrouter.com/), Context API (`ThemeContext`)
- **UI Components & Utilities**: [React Icons](https://react-icons.github.io/react-icons/), [React Hot Toast](https://react-hot-toast.com/), [React Easy Crop](https://www.npmjs.com/package/react-easy-crop)
- **Scanning & Codes**: [HTML5-QRCode](https://github.com/mebjas/html5-qrcode), [qrcode.react](https://github.com/zpao/qrcode.react)
- **Authentication**: [@react-oauth/google](https://www.npmjs.com/package/@react-oauth/google)
- **Networking**: [Axios](https://axios-http.com/)

### Backend
- **Runtime & Server**: [Node.js](https://nodejs.org/), [Express.js 5](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose 9 ODM](https://mongoosejs.com/)
- **AI Engine**: [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) (`gemini-3.7-flash`, `gemini-2.5-flash`)
- **SMS Gateway**: [Text.lk REST API v3](https://text.lk/)
- **Security & Cryptography**: [JSON Web Tokens (JWT)](https://jwt.io/), [Bcrypt.js](https://www.npmjs.com/package/bcryptjs), [Crypto](https://nodejs.org/api/crypto.html)
- **File Uploads**: [Multer](https://github.com/expressjs/multer) (PDF materials, profile pictures, assignment files, voice recordings)
- **Email Service**: [Nodemailer](https://nodemailer.com/) (SMTP welcome emails, payment receipts, password resets)

---

## 📂 Project Structure

```
CSC3213_20_Group_F/
├── backend/
│   ├── data/
│   │   └── institute_info.txt        # Knowledge base for LuminaChat AI
│   ├── middleware/
│   │   ├── authMiddleware.js         # JWT & role verification (Admin, Teacher, Staff, etc.)
│   │   ├── pdfUpload.js              # Multer filter for PDF lecture notes & assignments
│   │   └── upload.js                 # Multer filter for images & media attachments
│   ├── models/
│   │   ├── Assignment.js             # Assignment specifications & criteria
│   │   ├── AssignmentSubmission.js   # Student assignment uploads & grading records
│   │   ├── Attendance.js             # Daily class attendance log
│   │   ├── Course.js                 # Course metadata, grades, pricing, bank details
│   │   ├── DirectMessage.js          # 1-on-1 chat messages & voice recordings
│   │   ├── Enrollment.js             # Student course enrollments & active statuses
│   │   ├── Lesson.js                 # Grade lessons, YouTube live stream, videos & PDFs
│   │   ├── Notification.js           # Real-time user notification schema
│   │   ├── OTP.js                    # MongoDB TTL temporary OTP verification codes
│   │   ├── Payment.js                # Payment records (online OTP & counter cash)
│   │   ├── Quiz.js                   # Quizzes, questions (MCQ/Multi/TF), timers
│   │   ├── QuizSubmission.js         # Student quiz responses, scores & answer choices
│   │   ├── ReadingProgress.js        # In-app PDF viewer page tracking
│   │   ├── Review.js                 # Course reviews and ratings
│   │   ├── Schedule.js               # Weekly institutional timetable & class schedules
│   │   ├── SystemSetting.js          # SMS Gateway toggles & system-wide configs
│   │   ├── User.js                   # Unified user model with 5 role definitions
│   │   └── VerificationCode.js       # Email verification code tracking
│   ├── routes/
│   │   ├── assignmentRoutes.js       # Assignment creation, submission, and grading
│   │   ├── attendanceRoutes.js       # QR code scanning, manual check-in, parent SMS
│   │   ├── auth.js                   # Login, register, Google OAuth, password reset, users
│   │   ├── chatRoutes.js             # Google Gemini LuminaChat AI assistant
│   │   ├── courseRoutes.js           # Course creation, grade curriculum, bank details
│   │   ├── lessonRoutes.js           # Lesson materials, live stream controls, chat, voice
│   │   ├── messageRoutes.js          # Direct messaging & audio attachments
│   │   ├── notificationRoutes.js     # User notification dispatch & read management
│   │   ├── paymentRoutes.js          # Card mock checkout, OTP verification, cash receipts
│   │   ├── progressRoutes.js         # PDF reading tracking endpoints
│   │   ├── quizRoutes.js             # Quiz authoring, taking, auto-grading, submissions
│   │   ├── scheduleRoutes.js         # Timetable schedules & role-filtered queries
│   │   ├── searchRoutes.js           # Global search across courses, lessons & instructors
│   │   └── settingRoutes.js          # SMS gateway settings & live Text.lk balance
│   ├── services/
│   │   └── smsService.js             # Text.lk v3 client, phone normalizer & dispatchers
│   ├── utils/
│   │   ├── emailService.js           # Nodemailer HTML email templates
│   │   ├── migration.js              # Automatic database migration & schema sync
│   │   └── notificationHelper.js     # Multi-channel notification helpers
│   ├── seedAdmin.js                  # Initial administrator account seeder
│   └── server.js                     # Express app initialization & MongoDB connection
│
├── frontend/
│   ├── public/                       # Static public assets, icons, presets
│   └── src/
│       ├── assets/                   # Institutional logos, banners, illustrations
│       ├── components/
│       │   ├── AddScheduleModal.jsx          # Schedule creation modal
│       │   ├── BroadcastModal.jsx            # System broadcast composer
│       │   ├── CameraCaptureModal.jsx        # Webcam snapshot modal for student profiles
│       │   ├── ChatWidget.jsx                # Floating LuminaChat AI assistant widget
│       │   ├── CourseEnrollmentModal.jsx     # Course enrollment & payment modal
│       │   ├── Dashboard.jsx                 # Role-specific main dashboard
│       │   ├── DashboardLayout.jsx           # Shell layout with Header & Sidebar
│       │   ├── ErrorBoundary.jsx             # React UI error boundary
│       │   ├── GlobalSearchBar.jsx           # Omni-search bar component
│       │   ├── LiveChatBox.jsx               # Live class real-time chat & audio
│       │   ├── LiveEndFeedbackModal.jsx      # Class feedback & emoji reactions
│       │   ├── LiveStreamPlayer.jsx          # YouTube live video player with heartbeat
│       │   ├── LiveThumbnailCropperModal.jsx # Image crop modal for live streams
│       │   ├── LiveViewersModal.jsx          # Active live viewer roster modal
│       │   ├── Login.jsx                     # Multi-role login screen (Email/Phone/Google)
│       │   ├── MessagingPopup.jsx            # Direct 1-on-1 messenger with voice notes
│       │   ├── PdfReaderModal.jsx            # In-app PDF reader with progress tracker
│       │   ├── RecordPhysicalPaymentModal.jsx# Counter cash payment receipt modal
│       │   ├── Register.jsx                  # Online student registration with OTP
│       │   ├── ScheduledLiveHero.jsx         # Live class countdown hero banner
│       │   ├── Sidebar.jsx                   # Navigation sidebar with dynamic RBAC links
│       │   ├── StudentIdCard.jsx             # Printable Student ID Card with QR code
│       │   ├── StudentProfileModal.jsx       # Student profile & history modal
│       │   ├── TeacherModal.jsx              # Teacher profile & assignment modal
│       │   ├── VideoPlayerModal.jsx          # Video playback modal
│       │   └── VoiceRecordModal.jsx          # Audio recorder for voice messages
│       ├── context/
│       │   └── ThemeContext.jsx              # Dark Mode / Light Mode state provider
│       ├── pages/
│       │   ├── AboutUs.jsx                   # Institutional about & contact page
│       │   ├── AddCourse.jsx                 # Course creation & curriculum builder
│       │   ├── Analytics.jsx                 # Comprehensive institutional analytics
│       │   ├── Attendance.jsx                # QR scanner, manual attendance, logs
│       │   ├── ChangePassword.jsx            # First-login forced password change
│       │   ├── CourseDetails.jsx             # 4-week modular course content & live room
│       │   ├── Courses.jsx                   # Course catalog with grade filters
│       │   ├── CreateQuiz.jsx                # Quiz builder with question management
│       │   ├── Enrollments.jsx               # Student enrollment manager
│       │   ├── ForgotPassword.jsx            # Password reset request page
│       │   ├── Home.jsx                      # Landing page with course highlights & heroes
│       │   ├── Instructors.jsx               # Faculty directory & public timetable
│       │   ├── ManageUsers.jsx               # User CRUD, role assignments, student IDs
│       │   ├── ParentDashboard.jsx           # Dedicated parent portal for child monitoring
│       │   ├── Payments.jsx                  # Payment ledger, receipt viewer, cash entry
│       │   ├── QuizSubmissions.jsx           # Teacher quiz submission evaluation
│       │   ├── ResetPassword.jsx             # Token-based password reset form
│       │   ├── Settings.jsx                  # Profile settings & credentials update
│       │   ├── SmsSettings.jsx               # SMS gateway configuration & Text.lk balance
│       │   └── TakeQuiz.jsx                  # Interactive timed quiz-taking page
│       ├── utils/
│       │   └── api.js                        # Axios instance with JWT interceptors
│       ├── App.jsx                           # Route definitions & ProtectedRoute logic
│       ├── main.jsx                          # React application entry point
│       └── index.css                         # Tailwind CSS v4 styling rules
│
├── package.json                              # Workspace root scripts
└── README.md                                 # Project documentation
```

---

## 🔌 API Route Overview

| Base Endpoint | Description | Key Sub-Routes |
| :--- | :--- | :--- |
| `/api/auth` | Authentication & User Management | `/login`, `/register`, `/google`, `/forgot-password`, `/reset-password/:token`, `/users`, `/students/physical` |
| `/api/courses` | Course Curriculum & Management | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/enroll` |
| `/api/lessons` | Lessons, Live Streams, Chat & Files | `/:id/live-stream`, `/:id/live-chat`, `/:id/upload-pdf`, `/:id/upload-video`, `/:id/live-speaking` |
| `/api/attendance` | QR Scanning & Attendance Logs | `POST /`, `POST /scan-qr`, `GET /student/:id`, `GET /summary` |
| `/api/payments` | Online & Physical Payments | `/send-otp`, `/process-mock`, `/record-physical`, `/history`, `/invoices` |
| `/api/quizzes` | Quiz Authoring & Auto-Grading | `GET /course/:id`, `POST /`, `POST /:id/submit`, `GET /:id/submissions` |
| `/api/assignments` | Assignment Management | `POST /`, `POST /:id/submit`, `GET /grade-submissions` |
| `/api/chat` | AI Assistant (LuminaChat) | `POST /message` (Google Gemini generative endpoint) |
| `/api/schedule` | Institutional Timetable | `GET /`, `POST /`, `DELETE /:id` |
| `/api/settings` | System & SMS Gateway Config | `GET /sms`, `PUT /sms`, `POST /sms/test` |
| `/api/notifications`| User & Broadcast Notifications | `GET /`, `PUT /:id/read`, `POST /broadcast` |
| `/api/messages` | Direct 1-on-1 Messages | `GET /conversations`, `POST /send`, `POST /upload-audio` |
| `/api/progress` | In-App PDF Reading Progress | `POST /update`, `GET /student/:id` |
| `/api/search` | Global Omnisearch | `GET /?q=query` |

---

## ⚙️ Installation & Getting Started

### 📋 Prerequisites
Ensure you have the following installed on your development machine:
- **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **npm**: `v9.0.0` or higher
- **MongoDB**: Local MongoDB instance or a free [MongoDB Atlas Cluster](https://www.mongodb.com/cloud/atlas)
- **Google AI Studio API Key**: Optional, for LuminaChat AI ([Get Gemini Key](https://aistudio.google.com/))
- **Text.lk API Token**: Optional, for live SMS delivery in Sri Lanka ([Get Text.lk Token](https://text.lk/))

---

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/thanukavishal/LuminaLearn.git
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
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/LuminaLearn?retryWrites=true&w=majority
   JWT_SECRET=your_jwt_secret_key_here
   FRONTEND_URL=http://localhost:5173

   # Google Gemini AI Integration
   GEMINI_API_KEY=your_google_gemini_api_key

   # Google OAuth 2.0 (Optional)
   GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

   # Text.lk SMS Gateway (Optional - falls back to console simulator if unset)
   TEXTLK_API_TOKEN=your_textlk_api_token
   TEXTLK_SENDER_ID=Kirula Edu

   # Email Service / SMTP (Optional - for welcome emails & receipts)
   SMTP_EMAIL=support@luminalearn.edu.lk
   SMTP_PASSWORD=your_email_app_password
   ```
4. Seed the initial Administrator Account:
   ```bash
   node seedAdmin.js
   ```
   > **Default Admin Credentials:**
   > - **Email:** `admin@luminalearn.com`
   > - **Password:** `admin123`
5. Start the backend server:
   ```bash
   # For development with auto-reload:
   npm run dev

   # For standard production start:
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
3. Create a `.env` file in the `frontend/` directory (optional for local dev):
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

---

## 🔒 Security & Data Integrity

- 🔑 **Token-Based Authentication**: Secure stateless authentication using JSON Web Tokens (JWT) with authorization middleware for all private routes.
- 🛡️ **Bcrypt Password Hashing**: Passwords are encrypted using salted Bcrypt hashes before storage.
- ⚡ **Sparse Indexing**: The MongoDB schema utilizes sparse unique indices to allow students registered without an initial email to use registration numbers and phone numbers seamlessly.
- 🧹 **Automatic Startup Migration**: Automatic file-storage migration ensures base64 legacy assets are safely transitioned to static disk storage and indices are verified upon startup.
- 🔐 **First-Login Security**: Accounts created via administrative bulk registration have a mandatory `mustChangePassword` flag enforced on initial login.

---

## 👨‍💻 Project Development Team

| Team Member | GitHub Profile | Role |
| :--- | :--- | :--- |
| **Thanuka Vishal** | [@thanukavishal](https://github.com/thanukavishal) | Full-Stack Development |
| **Pathum Gunawardhana** | [@PathumGunawardhana](https://github.com/PathumGunawardhana) | Full-Stack Development |
| **Sakindu Rathnasiri** | [@Sakindu99](https://github.com/Sakindu99) | Full-Stack Development |

---
Copyrights - LuminaLearn 2026
