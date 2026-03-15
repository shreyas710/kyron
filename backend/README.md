# Kyron Backend (Node.js)

This backend handles Gemini chat requests.

## Endpoints

- `GET /api/health`
  - Health check.

- `POST /api/chat/message`
  - Input: `{ message, context }`
  - Output: `{ reply }`
  - Calls Gemini from backend using server-side API key.

## Setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Fill required env vars in `.env`:
- `GEMINI_API_KEY`

4. Run backend:

```bash
npm run dev
```

Server starts on `http://localhost:8787` by default.
