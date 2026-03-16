# Kyron Interview MVP

This repo currently includes:

- `frontend/`: React + Tailwind patient assistant web chat MVP
- `backend/`: Node.js Express backend with Gemini AI, Twilio Voice/SMS, and Email integrations.

## Full-Stack MVP Features

- Intake flow for first name, last name, DOB, phone, email, and reason for appointment
- Semantic provider matching to 4+ specialties/body parts
- Availability options generated for days 30-60 from today
- Natural language slot filtering such as "Tuesday"
- Booking flow with real email confirmations (Nodemailer) and SMS opt-in handling (Twilio)
- Voice handoff button that preserves conversation context
- Real-time Server-Sent Events (SSE) synchronization between phone call transcripts and the web chat window
- Safety guardrail responses for medical-advice requests

## Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in GEMINI_API_KEY, TWILIO credentials, and SMTP credentials
npm run dev
```
*Server starts on http://localhost:8787*

### 2. Frontend Setup
In a new terminal:

```bash
cd frontend
npm install
npm run dev
```