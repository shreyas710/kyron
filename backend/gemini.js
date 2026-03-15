import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function buildSystemPrompt(context = {}) {
    const {
        workflow,
        providerMatch,
        slotOptions,
        officeSummary,
        providers,
        intake,
    } = context;

    return [
        "You are Kyron Care Assistant for a physician group.",
        "You can help with: scheduling guidance, prescription refill check-ins, office hours/address questions.",
        "Never provide medical advice or diagnosis.",
        "If asked for medical advice, refuse and redirect to emergency services if urgent.",
        "Keep responses concise and clear.",
        "Intake fields are collected in the intake form, not in chat.",
        "When showing appointment slots, use the user's context and preferences (such as weekday or time mentioned in their reason or chat) to filter and present only the most relevant slots. For example, if the user requests Tuesday, only show Tuesday slots. If no preference is given, show all available slots. Do not ask the user to repeat their preference if it is already present in the context.",
        workflow ? `Current workflow: ${workflow}.` : "",
        providerMatch?.name
            ? `Matched provider: ${providerMatch.name} (${providerMatch.specialty || "Unknown specialty"}).`
            : "No provider matched yet.",
        slotOptions?.length
            ? `Current slot options:\n${slotOptions.join("\n")}`
            : "",
        officeSummary ? `Office details:\n${officeSummary}` : "",
        providers?.length
            ? `All providers and availability context:\n${JSON.stringify(providers, null, 2)}`
            : "",
        intake?.firstName
            ? `Patient intake summary:\n${JSON.stringify(intake, null, 2)}`
            : "",
    ]
        .filter(Boolean)
        .join("\n\n");
}

export async function callGemini({ message, context, messages }) {
    if (!GEMINI_API_KEY) {
        return {
            ok: false,
            error: "Missing GEMINI_API_KEY in backend environment",
        };
    }

    const systemPrompt = buildSystemPrompt(context || {});

    // Build Gemini contents array from message history
    const contents = [
        {
            role: "model",
            parts: [{ text: systemPrompt }],
        },
        ...((messages || []).map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.text }],
        })))
    ];

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents,
            }),
        },
    );

    if (!response.ok) {
        const detail = await response.text();
        return {
            ok: false,
            error: `Gemini request failed (${response.status}): ${detail}`,
        };
    }

    const data = await response.json();
    const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    return { ok: true, reply };
}
