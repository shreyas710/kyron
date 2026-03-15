# Backend Placeholder (Node.js)

This folder is intentionally left as a placeholder.

## Planned API contracts

- `POST /api/chat/message`
  - Input: `{ conversationId, message, patientContext }`
  - Output: `{ reply, workflowState, suggestedActions }`

- `POST /api/appointments/book`
  - Input: `{ patient, providerId, slotIso, reason, smsOptIn }`
  - Output: `{ bookingId, emailStatus, smsStatus }`

- `POST /api/voice/handoff`
  - Input: `{ conversationId, phone }`
  - Output: `{ callSessionId, status }`

- `POST /api/refills/check`
  - Input: `{ patient, medication, pharmacy }`
  - Output: `{ status, nextStep }`

## Notes

- Keep conversation state centralized so web chat and voice calls share memory.
- Add PHI-safe logging and audit trails.
- Integrate email/SMS delivery and explicit SMS opt-in handling.
