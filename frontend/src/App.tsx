import type { FormEvent } from "react";
import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { IntakeForm } from "./components/IntakeForm";
import { ChatWindow } from "./components/ChatWindow";
import type {
  Message,
  PatientIntake,
  Provider,
  Workflow,
  IntakeField,
  Role,
} from "./types";
import {
  EMPTY_INTAKE,
  HELP_COPY,
  PROVIDERS,
  SAFETY_KEYWORDS,
  SESSION_REFERENCE,
} from "./constants";

function formatSlot(isoDateTime: string) {
  return new Date(isoDateTime).toLocaleString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function findProvider(reason: string) {
  const normalizedReason = reason.toLowerCase();

  return (
    PROVIDERS.find((provider) =>
      provider.bodyParts.some((part) => normalizedReason.includes(part)),
    ) ?? null
  );
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

function hasSafetyConcern(text: string) {
  const normalized = text.toLowerCase();
  return SAFETY_KEYWORDS.some((keyword) => normalized.includes(keyword));
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
  const [voiceResumeCount, setVoiceResumeCount] = useState(0);
  const [isAiResponding, setIsAiResponding] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/call/stream?conversationId=${SESSION_REFERENCE}`,
    );
    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message && message.role && message.text) {
          setMessages((current) => [
            ...current,
            { id: current.length + 1, role: message.role, text: message.text },
          ]);
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };
    return () => eventSource.close();
  }, []);

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

  const getChatContext = () => ({
    workflow,
    intake,
    providerMatch,
    slotOptions: slotOptions.map((slot) => formatSlot(slot)),
    officeSummary: getOfficeSummary(),
    providers: PROVIDERS.map((provider) => ({
      name: provider.name,
      specialty: provider.specialty,
      bodyParts: provider.bodyParts,
      officeName: provider.officeName,
      address: provider.address,
      hours: provider.hours,
      availabilities: provider.availabilities.map((slot) => formatSlot(slot)),
    })),
  });

  const notifyBackend = (providerName: string, slot: string) => {
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intake,
        providerName,
        slot,
      }),
    }).catch((err) => console.error("Failed to send notification:", err));
  };

  const askBackendChat = async (userText: string, overrideContext?: any) => {
    try {
      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: SESSION_REFERENCE,
          messages: messages.concat({
            id: messages.length + 1,
            role: "user",
            text: userText,
          }),
          context: overrideContext || getChatContext(),
        }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as { reply?: string };
      return payload.reply || null;
    } catch {
      return null;
    }
  };

  const handleVoiceHandoff = async () => {
    if (!intake.phone) {
      pushMessage(
        "assistant",
        "Please complete the intake form first so I have the phone number for handoff.",
      );
      return;
    }

    const modeText =
      voiceResumeCount === 0
        ? `Calling ${intake.phone} now. I will continue with full context from this chat.`
        : `Welcome back. Reconnecting call to ${intake.phone} and resuming where we left off.`;
    pushMessage("assistant", modeText);
    setVoiceResumeCount((count) => count + 1);

    try {
      await fetch("/api/call/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: intake.phone,
          conversationId: SESSION_REFERENCE,
          context: getChatContext(),
          messages,
        }),
      });
    } catch (err) {
      console.error("Failed to initiate voice handoff", err);
    }
  };

  const handleIntakeFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

    const allSlots = matchedProvider.availabilities.slice(0, 12);
    setProviderMatch(matchedProvider);
    setSlotOptions(allSlots);
    setWorkflow("slot-selection");

    setIsAiResponding(true);
    const geminiReply = await askBackendChat(
      `A patient has completed the intake form. Please match them to a provider and show available appointment times based on their preferences. If they mention a weekday or time, only show those slots. If not, show all available slots. Here is the intake and context.`,
      {
        ...getChatContext(),
        workflow: "slot-selection",
        intake: normalized,
        providerMatch: matchedProvider,
        slotOptions: allSlots.map((slot) => formatSlot(slot)),
      },
    );
    setIsAiResponding(false);
    if (geminiReply) {
      pushMessage("assistant", geminiReply);
    } else {
      pushMessage("assistant", HELP_COPY);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) {
      return;
    }

    setInput("");
    pushMessage("user", text);

    if (hasSafetyConcern(text)) {
      pushMessage(
        "assistant",
        "I cannot provide medical advice or diagnosis. If this feels urgent, please call 911 or your local emergency line.",
      );
      return;
    }

    setIsAiResponding(true);
    const geminiReply = await askBackendChat(text);
    setIsAiResponding(false);

    if (geminiReply) {
      let finalReply = geminiReply;

      const bookingMatch = finalReply.match(
        /\[BOOKING_CONFIRMED(?:[:-]\s*(.*?))?\]/,
      );
      if (bookingMatch) {
        let extractedProvider, extractedSlot;
        if (bookingMatch[1]) {
          const parts = bookingMatch[1].split("|").map((s) => s.trim());
          if (parts.length > 1) {
            extractedProvider = parts[0];
            extractedSlot = parts[1];
          } else {
            extractedSlot = parts[0];
          }
        }
        finalReply = finalReply
          .replace(/\[BOOKING_CONFIRMED[^\]]*\]/g, "")
          .trim();
        setWorkflow("booked");

        const matchedSlot = slotOptions.find((slot) =>
          finalReply.includes(formatSlot(slot)),
        );

        notifyBackend(
          extractedProvider || providerMatch?.name || "your provider",
          extractedSlot ||
            (matchedSlot ? formatSlot(matchedSlot) : "your selected time"),
        );
      }

      pushMessage("assistant", finalReply);
      return;
    }

    pushMessage("assistant", HELP_COPY);
  };

  return (
    <main className='mx-auto flex w-full max-w-7xl flex-col px-4 py-6 md:px-8'>
      <Header handleVoiceHandoff={handleVoiceHandoff} />

      <section className='grid flex-1 gap-4 md:grid-cols-2 items-stretch'>
        <IntakeForm
          intakeDraft={intakeDraft}
          setIntakeDraft={setIntakeDraft}
          formError={formError}
          handleIntakeFormSubmit={handleIntakeFormSubmit}
          resetForm={() => {
            setIntakeDraft(EMPTY_INTAKE);
            setFormError(null);
            setProviderMatch(null);
            setSlotOptions([]);
            setWorkflow("intake-pending");
          }}
        />

        <ChatWindow
          messages={messages}
          isAiResponding={isAiResponding}
          input={input}
          setInput={setInput}
          onSubmit={onSubmit}
        />
      </section>
    </main>
  );
}

export default App;
