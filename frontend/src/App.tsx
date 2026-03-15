import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type Role = "assistant" | "user";

type Message = {
  id: number;
  role: Role;
  text: string;
};

type IntakeField =
  | "firstName"
  | "lastName"
  | "dob"
  | "phone"
  | "email"
  | "reason";

type Workflow = "intake-pending" | "slot-selection" | "booked";

type PatientIntake = {
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  email: string;
  reason: string;
  smsOptIn: boolean;
};

type Provider = {
  id: string;
  name: string;
  specialty: string;
  bodyParts: string[];
  officeName: string;
  address: string;
  hours: string;
  availabilities: string[];
};

const WEEKDAY_PATTERNS: Record<string, RegExp> = {
  Monday: /\bmonday\b|\bmon\b/i,
  Tuesday: /\btuesday\b|\btue\b|\btues\b/i,
  Wednesday: /\bwednesday\b|\bwed\b/i,
  Thursday: /\bthursday\b|\bthu\b|\bthurs\b/i,
  Friday: /\bfriday\b|\bfri\b/i,
};

const SAFETY_KEYWORDS = [
  "diagnose",
  "diagnosis",
  "treatment plan",
  "what medicine should i take",
  "dose",
  "dosage",
  "is this cancer",
  "should i stop taking",
  "medical advice",
];

const HELP_COPY =
  "I can help with scheduling, prescription refill check-ins, and office hours or address questions.";

const SESSION_REFERENCE = "KY-INTERVIEW-MVP";
const GEMINI_MODEL =
  (import.meta.env.VITE_GEMINI_MODEL as string | undefined) ||
  "gemini-2.5-flash";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as
  | string
  | undefined;

function nextBusinessDaySlots(
  targetWeekday: number,
  startOffsetDays: number,
  endOffsetDays: number,
  times: string[],
) {
  const slots: string[] = [];
  const now = new Date();

  for (let offset = startOffsetDays; offset <= endOffsetDays; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);

    if (date.getDay() !== targetWeekday) {
      continue;
    }

    for (const time of times) {
      slots.push(`${date.toISOString().slice(0, 10)}T${time}:00`);
    }
  }

  return slots;
}

const PROVIDERS: Provider[] = [
  {
    id: "dr-rivera",
    name: "Dr. Sofia Rivera",
    specialty: "Cardiology",
    bodyParts: ["heart", "chest", "cardio", "blood pressure"],
    officeName: "Kyron Midtown Heart Center",
    address: "415 W 38th St, New York, NY 10018",
    hours: "Mon-Fri, 8:00 AM - 5:30 PM",
    availabilities: [
      ...nextBusinessDaySlots(1, 30, 60, ["09:00", "11:00"]),
      ...nextBusinessDaySlots(3, 30, 60, ["10:00", "14:30"]),
    ],
  },
  {
    id: "dr-chen",
    name: "Dr. Evan Chen",
    specialty: "Dermatology",
    bodyParts: ["skin", "rash", "acne", "eczema", "mole"],
    officeName: "Kyron Uptown Skin Clinic",
    address: "220 E 79th St, New York, NY 10075",
    hours: "Mon-Fri, 9:00 AM - 6:00 PM",
    availabilities: [
      ...nextBusinessDaySlots(2, 30, 60, ["09:30", "13:00", "15:30"]),
      ...nextBusinessDaySlots(4, 30, 60, ["10:00", "14:00"]),
    ],
  },
  {
    id: "dr-patel",
    name: "Dr. Mira Patel",
    specialty: "Orthopedics",
    bodyParts: ["knee", "ankle", "shoulder", "hip", "bone", "joint"],
    officeName: "Kyron Downtown Ortho",
    address: "91 Chambers St, New York, NY 10007",
    hours: "Mon-Fri, 7:30 AM - 4:30 PM",
    availabilities: [
      ...nextBusinessDaySlots(1, 30, 60, ["08:00", "13:30"]),
      ...nextBusinessDaySlots(4, 30, 60, ["09:00", "11:30", "15:00"]),
    ],
  },
  {
    id: "dr-johnson",
    name: "Dr. Leah Johnson",
    specialty: "Ophthalmology",
    bodyParts: ["eye", "vision", "retina", "glaucoma", "blurry vision"],
    officeName: "Kyron Vision & Eye",
    address: "310 Park Ave S, New York, NY 10010",
    hours: "Mon-Fri, 8:30 AM - 5:00 PM",
    availabilities: [
      ...nextBusinessDaySlots(2, 30, 60, ["08:30", "11:00"]),
      ...nextBusinessDaySlots(5, 30, 60, ["10:30", "12:00"]),
    ],
  },
];

const EMPTY_INTAKE: PatientIntake = {
  firstName: "",
  lastName: "",
  dob: "",
  phone: "",
  email: "",
  reason: "",
  smsOptIn: false,
};

function formatSlot(isoDateTime: string) {
  return new Date(isoDateTime).toLocaleString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function extractWeekdayPreference(text: string) {
  for (const [weekday, pattern] of Object.entries(WEEKDAY_PATTERNS)) {
    if (pattern.test(text)) {
      return weekday;
    }
  }

  return null;
}

function findProvider(reason: string) {
  const normalizedReason = reason.toLowerCase();

  return (
    PROVIDERS.find((provider) =>
      provider.bodyParts.some((part) => normalizedReason.includes(part)),
    ) ?? null
  );
}

function hasSafetyConcern(text: string) {
  const lower = text.toLowerCase();
  return SAFETY_KEYWORDS.some((word) => lower.includes(word));
}

function isLikelySchedulingQuestion(text: string) {
  return /appointment|schedule|book|availability|slot|see a doctor|visit/i.test(
    text,
  );
}

function isLikelyRefillRequest(text: string) {
  return /refill|prescription|rx/i.test(text);
}

function isLikelyHoursRequest(text: string) {
  return /hours|address|location|where|office|open/i.test(text);
}

function validateField(field: IntakeField, value: string) {
  if (field === "dob") {
    return /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}$/.test(value);
  }

  if (field === "phone") {
    return value.replace(/\D/g, "").length >= 10;
  }

  if (field === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  return value.length > 1;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: `Hi, I am Kyron Care Assistant. ${HELP_COPY}`,
    },
  ]);
  const [input, setInput] = useState("");
  const [workflow, setWorkflow] = useState<Workflow>("intake-pending");
  const [intake, setIntake] = useState<PatientIntake>(EMPTY_INTAKE);
  const [intakeDraft, setIntakeDraft] = useState<PatientIntake>(EMPTY_INTAKE);
  const [formError, setFormError] = useState<string | null>(null);
  const [providerMatch, setProviderMatch] = useState<Provider | null>(null);
  const [slotOptions, setSlotOptions] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [voiceResumeCount, setVoiceResumeCount] = useState(0);
  const [isAiResponding, setIsAiResponding] = useState(false);

  const appointmentSummary = useMemo(() => {
    if (!providerMatch || !selectedSlot) {
      return null;
    }

    return {
      providerName: providerMatch.name,
      specialty: providerMatch.specialty,
      officeName: providerMatch.officeName,
      address: providerMatch.address,
      dateTime: formatSlot(selectedSlot),
    };
  }, [providerMatch, selectedSlot]);

  const pushMessage = (role: Role, text: string) => {
    setMessages((current) => [
      ...current,
      { id: current.length + 1, role, text },
    ]);
  };

  const getOfficeSummary = () => {
    return PROVIDERS.map(
      (provider) =>
        `${provider.officeName}: ${provider.address} (${provider.hours})`,
    ).join("\n");
  };

  const sendBookingNotifications = async (
    slotIso: string,
    providerName: string,
  ) => {
    try {
      const response = await fetch("/api/notifications/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient: intake,
          appointment: {
            providerName,
            slotIso,
            slotDisplay: formatSlot(slotIso),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("notification API unavailable");
      }

      const result = (await response.json()) as {
        emailStatus?: string;
        smsStatus?: string;
      };

      return {
        emailStatus: result.emailStatus || "sent",
        smsStatus: result.smsStatus || (intake.smsOptIn ? "sent" : "skipped"),
      };
    } catch {
      return {
        emailStatus: "pending-backend",
        smsStatus: intake.smsOptIn ? "pending-backend" : "skipped",
      };
    }
  };

  const askGemini = async (userText: string) => {
    if (!GEMINI_API_KEY) {
      return null;
    }

    const systemPrompt = [
      "You are Kyron Care Assistant for a physician group.",
      "You can help with: scheduling guidance, prescription refill check-ins, office hours/address questions.",
      "Never provide medical advice or diagnosis.",
      "If asked for medical advice, refuse and redirect to emergency services if urgent.",
      "Keep responses concise and clear.",
      "Intake fields must be collected in the intake form, not in chat.",
      `Current workflow: ${workflow}.`,
      providerMatch
        ? `Matched provider: ${providerMatch.name} (${providerMatch.specialty}).`
        : "No provider matched yet.",
      workflow === "slot-selection"
        ? `Current slot options:\n${renderSlotList(slotOptions)}`
        : "",
      `Office details:\n${getOfficeSummary()}`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userText }],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("\n")
        .trim() || "";

    return text || null;
  };

  const renderSlotList = (slots: string[]) => {
    return slots
      .slice(0, 6)
      .map((slot, index) => `${index + 1}. ${formatSlot(slot)}`)
      .join("\n");
  };

  const pickSlotFromInput = (text: string) => {
    const numeric = Number.parseInt(text, 10);
    if (
      !Number.isNaN(numeric) &&
      numeric >= 1 &&
      numeric <= slotOptions.length
    ) {
      return slotOptions[numeric - 1];
    }

    const normalized = text.toLowerCase();
    return (
      slotOptions.find((slot) =>
        formatSlot(slot).toLowerCase().includes(normalized),
      ) ?? null
    );
  };

  const handleVoiceHandoff = () => {
    if (!intake.phone) {
      pushMessage(
        "assistant",
        "Please complete the intake form first so I have the phone number for handoff.",
      );
      return;
    }

    if (voiceReady) {
      const modeText =
        voiceResumeCount === 0
          ? `Calling ${intake.phone} now. I will continue with full context from this chat (Ref ${SESSION_REFERENCE}).`
          : `Welcome back. Reconnecting call to ${intake.phone} and resuming where we left off (Ref ${SESSION_REFERENCE}).`;
      pushMessage("assistant", modeText);
      setVoiceResumeCount((count) => count + 1);
      return;
    }

    pushMessage(
      "assistant",
      `Phone handoff will be available right after booking. Context is preserved under Ref ${SESSION_REFERENCE}.`,
    );
  };

  const handleIntakeFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized: PatientIntake = {
      firstName: intakeDraft.firstName.trim(),
      lastName: intakeDraft.lastName.trim(),
      dob: intakeDraft.dob.trim(),
      phone: intakeDraft.phone.trim(),
      email: intakeDraft.email.trim(),
      reason: intakeDraft.reason.trim(),
      smsOptIn: intakeDraft.smsOptIn,
    };

    const requiredFields: IntakeField[] = [
      "firstName",
      "lastName",
      "dob",
      "phone",
      "email",
      "reason",
    ];

    const invalidField = requiredFields.find(
      (field) => !validateField(field, normalized[field]),
    );

    if (invalidField) {
      setFormError(`Please enter a valid value for ${invalidField}.`);
      return;
    }

    setFormError(null);
    setIntake(normalized);
    setVoiceReady(false);
    setSelectedSlot(null);

    const matchedProvider = findProvider(normalized.reason);
    if (!matchedProvider) {
      setWorkflow("intake-pending");
      setProviderMatch(null);
      setSlotOptions([]);
      pushMessage(
        "assistant",
        "I reviewed your intake form. This practice does not currently treat that body part. I can still help with office hours/address questions.",
      );
      return;
    }

    const weekdayPreference = extractWeekdayPreference(normalized.reason);
    const allSlots = matchedProvider.availabilities.slice(0, 12);
    const filteredSlots =
      weekdayPreference === null
        ? allSlots
        : allSlots.filter((slot) => {
            const weekday = new Date(slot).toLocaleDateString([], {
              weekday: "long",
            });
            return weekday.toLowerCase() === weekdayPreference.toLowerCase();
          });

    const finalSlots = filteredSlots.length > 0 ? filteredSlots : allSlots;

    setProviderMatch(matchedProvider);
    setSlotOptions(finalSlots);
    setWorkflow("slot-selection");

    pushMessage(
      "assistant",
      `Intake received. I matched you to ${matchedProvider.name} (${matchedProvider.specialty}).\nHere are available times:\n${renderSlotList(finalSlots)}\n\nReply in chat with a number to book (or ask for a weekday like Tuesday).`,
    );
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) {
      return;
    }

    setInput("");
    pushMessage("user", text);

    if (workflow === "slot-selection" && providerMatch) {
      const weekdayPreference = extractWeekdayPreference(text);
      if (weekdayPreference) {
        const weekdaySlots = providerMatch.availabilities.filter((slot) => {
          const weekday = new Date(slot).toLocaleDateString([], {
            weekday: "long",
          });
          return weekday.toLowerCase() === weekdayPreference.toLowerCase();
        });

        if (weekdaySlots.length === 0) {
          pushMessage(
            "assistant",
            `I do not have ${weekdayPreference} openings in the next window. Here are the next best options:\n${renderSlotList(slotOptions)}`,
          );
          return;
        }

        setSlotOptions(weekdaySlots);
        pushMessage(
          "assistant",
          `Here are ${weekdayPreference} options:\n${renderSlotList(weekdaySlots)}\n\nReply with a number to book.`,
        );
        return;
      }

      const selected = pickSlotFromInput(text);
      if (selected) {
        setSelectedSlot(selected);
        setWorkflow("booked");
        setVoiceReady(true);

        const notificationResult = await sendBookingNotifications(
          selected,
          providerMatch.name,
        );

        const smsLine = intake.smsOptIn
          ? `SMS status: ${notificationResult.smsStatus}.`
          : "SMS reminders are currently off.";

        pushMessage(
          "assistant",
          `Appointment booked for ${formatSlot(selected)} with ${providerMatch.name}. Email status: ${notificationResult.emailStatus}. ${smsLine}`,
        );
        return;
      }
    }

    if (hasSafetyConcern(text)) {
      pushMessage(
        "assistant",
        "I cannot provide medical advice or diagnosis. If this feels urgent, please call 911 or your local emergency line.",
      );
      return;
    }

    if (isLikelyHoursRequest(text)) {
      pushMessage(
        "assistant",
        `Here are our office details:\n${getOfficeSummary()}`,
      );
      return;
    }

    if (isLikelySchedulingQuestion(text)) {
      if (workflow === "booked" && appointmentSummary) {
        pushMessage(
          "assistant",
          `You are booked for ${appointmentSummary.dateTime} with ${appointmentSummary.providerName}.`,
        );
        return;
      }

      if (workflow === "slot-selection" && providerMatch) {
        pushMessage(
          "assistant",
          `You are matched with ${providerMatch.name}. Pick a slot by replying with a number:\n${renderSlotList(slotOptions)}\n\n(You can also ask for a weekday, for example: Tuesday.)`,
        );
        return;
      }

      pushMessage(
        "assistant",
        "Please complete and submit the intake form to get scheduling options.",
      );
      return;
    }

    if (isLikelyRefillRequest(text)) {
      pushMessage(
        "assistant",
        "For prescription refill check-ins, share medication name and preferred pharmacy. I can prepare a refill request for the care team (backend workflow pending).",
      );
      return;
    }

    setIsAiResponding(true);
    const geminiReply = await askGemini(text);
    setIsAiResponding(false);

    if (geminiReply) {
      pushMessage("assistant", geminiReply);
      return;
    }

    pushMessage("assistant", HELP_COPY);
  };

  return (
    <main className='mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 md:px-8'>
      <header className='rise mb-4 rounded-2xl border border-[var(--border)] bg-[color:var(--panel)] p-4 shadow-[0_10px_40px_rgb(0_0_0_/_0.35)] md:p-6'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand)]'>
              Kyron Medical
            </p>
            <h1 className='mt-2 text-2xl leading-tight text-[var(--ink)] md:text-3xl'>
              Patient Assistant
            </h1>
          </div>
          <button
            type='button'
            onClick={handleVoiceHandoff}
            className='rounded-xl border border-[var(--brand)] bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-[#08101f] transition hover:bg-[var(--brand-strong)]'>
            Continue on Phone
          </button>
        </div>
      </header>

      <section className='grid flex-1 gap-4 md:grid-cols-2'>
        <section className='rise rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 md:p-5'>
          <h2 className='text-lg text-[var(--ink)]'>Patient Intake Form</h2>
          <p className='mt-1 text-sm text-[var(--ink-soft)]'>
            Scheduling is handled only from this form.
          </p>

          <form className='mt-4 space-y-3' onSubmit={handleIntakeFormSubmit}>
            <div className='grid gap-3 sm:grid-cols-2'>
              <label className='text-sm text-[var(--ink-soft)]'>
                First name
                <input
                  value={intakeDraft.firstName}
                  onChange={(event) =>
                    setIntakeDraft((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  className='mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand)]'
                  placeholder='Jane'
                />
              </label>
              <label className='text-sm text-[var(--ink-soft)]'>
                Last name
                <input
                  value={intakeDraft.lastName}
                  onChange={(event) =>
                    setIntakeDraft((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  className='mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand)]'
                  placeholder='Doe'
                />
              </label>
            </div>

            <label className='block text-sm text-[var(--ink-soft)]'>
              Date of birth (MM/DD/YYYY)
              <input
                value={intakeDraft.dob}
                onChange={(event) =>
                  setIntakeDraft((current) => ({
                    ...current,
                    dob: event.target.value,
                  }))
                }
                className='mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand)]'
                placeholder='01/31/1990'
              />
            </label>

            <label className='block text-sm text-[var(--ink-soft)]'>
              Phone number
              <input
                value={intakeDraft.phone}
                onChange={(event) =>
                  setIntakeDraft((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                className='mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand)]'
                placeholder='(555) 123-4567'
              />
            </label>

            <label className='block text-sm text-[var(--ink-soft)]'>
              Email
              <input
                value={intakeDraft.email}
                onChange={(event) =>
                  setIntakeDraft((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className='mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand)]'
                placeholder='jane@example.com'
              />
            </label>

            <label className='block text-sm text-[var(--ink-soft)]'>
              Reason for appointment / body part
              <textarea
                value={intakeDraft.reason}
                onChange={(event) =>
                  setIntakeDraft((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                rows={3}
                className='mt-1 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand)]'
                placeholder='Example: knee pain and Tuesday availability'
              />
            </label>

            <label className='flex items-center gap-2 text-sm text-[var(--ink-soft)]'>
              <input
                type='checkbox'
                checked={intakeDraft.smsOptIn}
                onChange={(event) =>
                  setIntakeDraft((current) => ({
                    ...current,
                    smsOptIn: event.target.checked,
                  }))
                }
              />
              Opt in to SMS reminders
            </label>

            {formError ? (
              <p className='rounded-lg bg-[#2a1d21] px-3 py-2 text-sm text-[#ff9ea8]'>
                {formError}
              </p>
            ) : null}

            <div className='flex flex-wrap gap-2'>
              <button
                type='submit'
                className='rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[#08101f] transition hover:bg-[var(--brand-strong)]'>
                Submit Intake
              </button>
              <button
                type='button'
                onClick={() => {
                  setIntakeDraft(EMPTY_INTAKE);
                  setFormError(null);
                  setProviderMatch(null);
                  setSlotOptions([]);
                  setSelectedSlot(null);
                  setWorkflow("intake-pending");
                  setVoiceReady(false);
                }}
                className='rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)]'>
                Reset Form
              </button>
            </div>
          </form>
        </section>

        <div className='rise flex min-h-[60vh] flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel)]'>
          <div className='border-b border-[var(--border)] px-4 py-3 md:px-5'>
            <h2 className='text-lg text-[var(--ink)]'>Chat</h2>
            <p className='text-sm text-[var(--ink-soft)]'>
              Q&A support for scheduling, refill check-ins, and office details.
            </p>
          </div>

          <div className='flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-5'>
            {messages.map((message) => (
              <article
                key={message.id}
                className={`rise max-w-[90%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed md:max-w-[84%] ${
                  message.role === "assistant"
                    ? "bg-[#14223f] text-[var(--ink)]"
                    : "ml-auto bg-[#1f335c] text-[#d7e6ff]"
                }`}>
                {message.text}
              </article>
            ))}
            {isAiResponding ? (
              <article className='rise max-w-[90%] rounded-2xl bg-[#14223f] px-4 py-3 text-sm text-[var(--ink)] md:max-w-[84%]'>
                Thinking...
              </article>
            ) : null}
          </div>

          <form
            className='border-t border-[var(--border)] p-3 md:p-4'
            onSubmit={onSubmit}>
            <div className='flex items-end gap-2'>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={2}
                placeholder='Ask about scheduling, refill check-ins, or office details...'
                className='w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--brand)]'
              />
              <button
                type='submit'
                className='rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[#08101f] transition hover:bg-[var(--brand-strong)]'>
                Send
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default App;
