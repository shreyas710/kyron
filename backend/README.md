# Kyron Backend (Node.js)

This Express backend handles Gemini chat requests, Twilio Voice handoff sessions, real-time SSE syncing, and Email/SMS notifications.

## Endpoints

- `GET /api/health`
  - Health check.

- `POST /api/chat/message`
  - Input: `{ context, messages, conversationId }`
  - Output: `{ reply }`
  - Calls Gemini from backend using server-side API key and maintains conversation context.

- `POST /api/notify`
  - Input: `{ intake, providerName, slot }`
  - Action: Sends an SMS via Twilio (if opted-in) and an Email via Nodemailer.

- `POST /api/call/initiate`
  - Input: `{ phoneNumber, conversationId, context, messages }`
  - Action: Initiates an outbound Twilio call to the user, passing the current chat context.

- `POST /api/call/twiml` & `POST /api/call/gather`
  - Twilio Webhook endpoints.
  - Action: Handles ongoing voice interactions with Gemini AI.

- `GET /api/call/stream`
  - Query: `?conversationId=<ID>`
  - Action: Establishes a Server-Sent Events (SSE) connection to push live phone call transcripts back to the frontend chat.

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

```dotenv
GEMINI_API_KEY=your_gemini_api_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
PUBLIC_SERVER_URL=https://your-ngrok-url.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

4. Run backend:

```bash
npm run dev
```

Server starts on `http://localhost:8787` by default.
