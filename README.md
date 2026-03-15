# Kyron Interview MVP

This repo currently includes:

- `frontend/`: React + Tailwind patient assistant web chat MVP
- `backend/`: Node.js backend placeholder (no backend code yet)

## Frontend MVP includes

- Intake flow for first name, last name, DOB, phone, email, and reason for appointment
- Semantic provider matching to 4+ specialties/body parts
- Availability options generated for days 30-60 from today
- Natural language slot filtering such as "Tuesday"
- Booking flow with mocked email confirmation and SMS opt-in handling
- Voice handoff button that preserves conversation context
- Callback continuity behavior to resume after disconnection
- Safety guardrail responses for medical-advice requests

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

## Build frontend

```bash
cd frontend
npm run build
```

## Backend note

Backend endpoints are intentionally not implemented yet. See `backend/README.md` for the planned Node.js API contracts.
