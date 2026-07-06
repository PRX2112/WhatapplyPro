# 🟢 Whatapply — WhatsApp-Centric Micro-SaaS Platform

Whatapply is a full-stack, multi-tenant WhatsApp-centric SaaS application designed specifically for local shopkeepers, salon owners, gym managers, freelancers, and small businesses. It enables merchants to digitize bookings, manage an outstanding customer ledger (Khata Book), generate scan-to-pay UPI QR codes, launch marketing broadcasts, and automate customer support using a Gemini AI-powered chat agent.

---

## ✨ Features Implemented

### 👤 Scoped Multi-Tenancy & Secure Auth
*   **Tenant Isolation**: Multi-tenant database architecture. Each business registers and manages its own customer lists, services, bookings, campaigns, and transaction ledger.
*   **Authentication**: Secure registration and login flow using JWTs with passwords hashed via `bcryptjs`.
*   **Dynamic UI Labeling**: The entire dashboard automatically adjusts its nomenclature based on the selected business type (e.g. choosing a Gym updates labels from "Services $\rightarrow$ Plans", "Bookings $\rightarrow$ Sessions", and "Customers $\rightarrow$ Members").

### 💼 Generic Service Catalog
*   **Merchant Configuration**: Add, edit, and delete services or memberships with custom pricing (₹), descriptions, and durations.
*   **Grouped UI**: Services are organized by categories (e.g., Hair, Body, Consultation, Memberships) for cleaner visualization.

### 💰 Double-Entry Khata Ledger & UPI Deep Links
*   **Outstanding Balance Derivation**: Debits (dues) and Credits (payments) are logged separately. The net outstanding balance is calculated dynamically from transaction history.
*   **Instant UPI Deep Links**: The application automatically generates cross-compatible UPI deep links (supported natively by GPay, PhonePe, Paytm, BHIM) using the merchant's specified UPI ID and the customer's exact outstanding amount.
*   **WhatsApp Reminders**: Send a direct payment reminder containing a personalized greeting, outstanding balance detail, and the instant scan-to-pay UPI link.

### 📅 Booking & Appointment Manager
*   **Smart Scheduling**: Create customer appointments mapped to catalog services, specifying dates, times, prices, assigned staff, and notes.
*   **Automated Confirmations**: Triggers an automated WhatsApp message summarizing the appointment details when a new booking is registered.
*   **State Machine Transitions**: Easily switch booking statuses (Pending $\rightarrow$ Confirmed $\rightarrow$ Completed $\rightarrow$ Cancelled) from the dashboard, dispatching WhatsApp notifications on updates.

### 📣 Broadcast Campaigns
*   **AI Template Copilot**: Write a marketing prompt, select a category, and let Gemini AI generate ready-to-use WhatsApp templates with dynamic placeholders like `{{customer_name}}` and `{{amount}}`.
*   **Target Group Filtering**: Send campaign broadcasts to all customers or target only customers with outstanding balances (optionally filtered by minimum amount).
*   **Campaign History & Analytics**: Monitor broadcast status (Sent, Delivered, Read, Failed) in real-time.

### 🧪 WhatsApp Sandbox Chat Simulator
*   **Bot Simulator**: A complete dual-panel chat simulator mimicking real customer interactions.
*   **Automatic Keyword Router**: Handles standard customer replies instantly (`HI`, `SERVICES`, `BOOK`, `BAL`, `CANCEL`) with context-aware responses (e.g., typing `BAL` returns their current ledger dues and a payment link).
*   **Gemini AI Fallback**: If a customer types a freeform question, the simulator routes the request to a Gemini 2.0 assistant trained on the merchant's active service catalog.

---

## 🛠️ Technology Stack

*   **Frontend**: React (v19) + Vite, custom Tailwind CSS v4 styling, and spring-physics animations powered by `motion`.
*   **Backend**: Node.js + Express with modular routes (`server/routes/*`) and helper services.
*   **Database**: PostgreSQL with connection pooling (`pg` pool).
*   **Auth**: JWT (JSON Web Tokens) + `bcryptjs`.
*   **Artificial Intelligence**: `@google/genai` (Gemini 2.0 Flash) for chat responses and template copilot.

---

## 🚀 Local Setup & Installation

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v18+)
*   [PostgreSQL](https://www.postgresql.org/) (Running locally or hosted via Neon/Supabase)

### 2. Installation
Clone the repository and install all dependencies:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (copied from the provided template):
```bash
copy .env.example .env
```

Open the `.env` file and configure your credentials:
```env
# Database Connection String
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whatapply

# JWT Secret Key
JWT_SECRET=your-random-secret-key

# Gemini API Key (Optional; falls back to simulator if empty)
GEMINI_API_KEY=your-gemini-api-key

# WhatsApp Sandbox Webhook Token
WA_VERIFY_TOKEN=whatapply-webhook-token

# Server Port
PORT=3000
```

### 4. Run Migrations & Start Server
Run the local development server. The database tables will be automatically created on startup via the built-in auto-migration runner:
```bash
npm run dev
```

The application will be live at **`http://localhost:3000`**.

---

## 📁 File Structure

```
whatapply/
├── server/                      # Backend (Node.js / Express)
│   ├── db/                      # Schema & connection setup
│   ├── middleware/              # JWT verification & Zod validators
│   ├── routes/                  # Express route controllers (Auth, Bookings, Ledger, etc.)
│   ├── services/                # WhatsApp client, Gemini AI, UPI helpers
│   └── index.ts                 # Express entry point & dev-middleware mount
├── src/                         # Frontend (React)
│   ├── components/              # Feature modules (AuthPage, BookingManager, SandboxChat, etc.)
│   ├── context/                 # React state contexts (AuthContext)
│   ├── hooks/                   # Custom utility hooks (useToast)
│   ├── lib/                     # Types and typed API client wrapper
│   ├── index.css                # Global CSS styling
│   └── App.tsx                  # Dashboard layout shell and auth guard
├── index.html                   # HTML template
├── package.json                 # Node dependencies
└── tsconfig.json                # TypeScript configurations
```
