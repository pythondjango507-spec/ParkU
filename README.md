# 🚗 ParkU - Smart Parking & AI Mobility Mobile Application

A full-stack, production-ready mobile parking platform built with **React Native (Expo SDK 58)**, **FastAPI (Python 3.13)**, **PostgreSQL & SQLite**, and **Google Gemini AI**, with automated **Render Cloud** deployment blueprint.

---

## 🌟 Key Features

### 🚗 Driver / Vehicle Owner Experience
* **Live GPS Proximity Sorting**: Real-time Haversine distance calculations showing nearest parking spots in Marathahalli, Bengaluru, Karnataka (in ₹ INR).
* **Native Maps Navigation**: 1-click turn-by-turn navigation opening native **Google Maps** / **Apple Maps** directly to parking entrance coordinates.
* **Flexible Booking Options**:
  * **Hourly Booking**: Reserve spots for quick errands and hourly stays.
  * **Multi-Day Booking**: Calendar date picker (`From Date` to `To Date`) for long-term parking.
  * **Long-Stay Weekly Discount**: Automatic concession/discount applied for reservations of 7 days or more (configured by the lot owner).
* **AI Mobility Guide**: Powered by Google Gemini (`gemini-3.8-flash`) providing smart matching, rate comparisons, and EV/covered parking recommendations.

### 🏢 Parking Place Owner (Admin Portal)
* **Dedicated Owner Administration**:
  * Register new parking facilities with coordinates, slot capacity, amenities, and covered roof options.
  * Update hourly and daily pricing anytime.
  * Configure long-stay weekly concession discounts (e.g. 15% discount for bookings $\ge 7$ days).
  * Real-time KPI dashboard tracking total customer reservations, active occupied slots, and accumulated revenue in ₹.

### 🔒 Enterprise-Grade Security & Authentication
* **Role-Based Access Control (RBAC)**: Secure separation between Drivers and Parking Place Owners.
* **Stateless RFC 7519 JWT Tokens**: High-performance, cryptographically signed tokens (HMAC-SHA256) that persist across server reboots and scale horizontally.
* **PBKDF2-HMAC-SHA256 Hashing**: 200,000 hash iterations with 16-byte random salt protecting user passwords against GPU brute-force.
* **Forgot Password & OTP Validation**: 6-digit cryptographic verification code with 15-minute expiration and single-use consumption.
* **Sliding-Window Rate Limiting**: Anti brute-force protection blocking credential stuffing attacks (`HTTP 429`) and preventing OTP request flooding.
* **Password Policy & Strength Meter**: Real-time password strength evaluator and mobile show/hide eye toggle.
* **In-App Change Password**: Authenticated users can update passwords directly from Settings.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology | Details |
|---|---|---|
| **Mobile App** | **React Native + Expo (SDK 58)** | Unified cross-platform codebase running on physical Android phones, Android Emulator, and iOS via **Expo Go**. |
| **Backend API** | **FastAPI (Python 3.13)** | Async high-throughput REST API with interactive Swagger docs at `/docs`. |
| **Database** | **PostgreSQL & SQLite** | PostgreSQL for production cloud deployment; SQLite (`backend/parku.db`) for zero-config offline local development via SQLAlchemy 2.0. |
| **Security** | **JWT & PBKDF2** | HMAC-SHA256 tokens, 200k-iteration PBKDF2 hashing, rate limiting, and HTTP security headers. |
| **AI Engine** | **Google Gemini (`gemini-3.8-flash`)** | Smart parking advisor via official `google-genai` SDK. |
| **Cloud Hosting** | **Render (Free Tier)** | Automated Infrastructure-as-Code blueprint (`render.yaml`) deploying Web Service and managed PostgreSQL. |

---

## 📁 Project Structure

```
ParkU/
├── backend/
│   ├── app/
│   │   ├── auth.py             # JWT issuance, PBKDF2 hashing & rate limiter
│   │   ├── config.py           # Database URL, JWT secrets, Gemini API key
│   │   ├── database.py         # SQLAlchemy engine & session dependency
│   │   ├── models.py           # User, ParkingSpot, Booking, PasswordResetCode
│   │   ├── schemas.py          # Pydantic validation models
│   │   ├── gemini_service.py   # Google Gemini API integration
│   │   ├── routers/
│   │   │   ├── auth.py         # Register, Login, Forgot & Reset Password
│   │   │   ├── owner.py        # Owner Admin: Spots, pricing & revenue KPIs
│   │   │   ├── spots.py        # GPS proximity sorting & search
│   │   │   ├── bookings.py     # Hourly & Multi-day booking with weekly discounts
│   │   │   └── ai.py           # Gemini AI recommendation endpoints
│   │   └── main.py             # FastAPI entrypoint, CORS & security headers
│   ├── manage_db.py            # SQLite inspection & interactive CLI tool
│   ├── requirements.txt        # Python backend dependencies
│   ├── run.py                  # Uvicorn backend runner
│   ├── Dockerfile              # Container deployment recipe
│   └── .env.example            # Environment template
├── frontend/
│   ├── src/
│   │   ├── components/         # SpotCard, BookingModal, LocationPickerModal
│   │   ├── screens/
│   │   │   ├── AuthScreen.js   # Sign In, Register, Forgot Password & Strength Meter
│   │   │   ├── SpotsScreen.js  # Live nearby lots & Google Maps navigation
│   │   │   ├── AIScreen.js     # Gemini AI parking guide
│   │   │   ├── BookingsScreen.js # Active & completed reservations
│   │   │   ├── OwnerDashboard.js # Owner Admin portal & pricing controls
│   │   │   └── SettingsScreen.js # Backend IP config & Change Password
│   │   ├── services/
│   │   │   ├── api.js          # REST client with Bearer auth
│   │   │   ├── auth.js         # Reactive auth state & session manager
│   │   │   └── location.js     # Cached low-latency GPS geolocation
│   │   └── config.js           # Dynamic LAN IP / backend URL resolver
│   ├── App.js                  # Authentication gating & elevated bottom navigation
│   ├── app.json                # Expo project manifest
│   └── package.json            # Node & Expo dependencies
├── render.yaml                 # Render cloud deployment blueprint
├── .gitignore                  # Git ignore rules for secrets, DBs, and venv
└── README.md                   # Project documentation
```

---

## 🚀 Quick Start Guide

### 1. Start the FastAPI Backend

Open a PowerShell / Command Prompt terminal:

```powershell
cd backend
venv\Scripts\python.exe run.py
```
* Backend starts at: `http://0.0.0.0:8000`
* Interactive API Documentation (Swagger): `http://127.0.0.1:8000/docs`

### 2. Start the React Native Frontend

Open a second terminal window:

```powershell
cd frontend
npm start
```
* Scan the displayed QR code with the **Expo Go** app on your Android or iOS device.
* *Note: Ensure your laptop and phone are connected to the same Wi-Fi network.*

### 3. Database Inspection Tool

Inspect the SQLite database anytime from the command line:

```powershell
cd backend
# View formatted summary of all users, spots, and bookings:
venv\Scripts\python.exe manage_db.py

# Or launch an interactive SQL shell:
venv\Scripts\python.exe manage_db.py shell
```

---

## 📄 License

This project is licensed under the MIT License.
