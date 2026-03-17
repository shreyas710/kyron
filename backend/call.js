import express from "express";
import twilio from "twilio";
import dotenv from "dotenv";
import { callGemini } from "./gemini.js";
import { sendNotifications } from "./notify.js";

dotenv.config();

const router = express.Router();

const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    PUBLIC_SERVER_URL,
} = process.env;

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export const conversations = {};
export const clients = {};

export function notifyClients(conversationId, message) {
    if (clients[conversationId]) {
        clients[conversationId].forEach(client => {
            client.write(`data: ${JSON.stringify(message)}\n\n`);
        });
    }
}

router.get("/stream", (req, res) => {
    const { conversationId } = req.query;
    if (!conversationId) return res.status(400).end();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    if (!clients[conversationId]) {
        clients[conversationId] = [];
    }
    clients[conversationId].push(res);

    req.on("close", () => {
        clients[conversationId] = clients[conversationId].filter(client => client !== res);
    });
});

router.post("/initiate", async (req, res) => {
    const { phoneNumber, conversationId, context, messages } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ error: "Missing phone number" });
    }

    conversations[conversationId] = { context, messages };

    try {
        await twilioClient.calls.create({
            url: `${PUBLIC_SERVER_URL}/api/call/twiml?conversationId=${conversationId}`,
            to: phoneNumber,
            from: TWILIO_PHONE_NUMBER,
        });
        res.json({ success: true });
    } catch (error) {
        console.error("Twilio Call Error:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post("/twiml", async (req, res) => {
    const { conversationId } = req.query;
    const twiml = new twilio.twiml.VoiceResponse();

    const conversation = conversations[conversationId];
    if (!conversation) {
        twiml.say("Sorry, I could not find your session context. Goodbye.");
        twiml.hangup();
        return res.type("text/xml").send(twiml.toString());
    }

    conversation.messages.push({
        role: "user",
        text: "The user has switched to a phone call. Greet them briefly over the phone and ask how you can proceed with the context of the chat.",
    });

    const geminiResponse = await callGemini({
        messages: conversation.messages,
        context: conversation.context,
    });

    let replyText = geminiResponse.reply || "Hello, I am Kyron Care Assistant. How can I help you today?";
    let spokenText = replyText;
    const bookingMatch = replyText.match(/\[BOOKING_CONFIRMED(?:[:\-]\s*(.*?))?\]/);
    if (bookingMatch) {
        let extractedProvider, extractedSlot;
        if (bookingMatch[1]) {
            const parts = bookingMatch[1].split('|').map(s => s.trim());
            if (parts.length > 1) {
                extractedProvider = parts[0];
                extractedSlot = parts[1];
            } else {
                extractedSlot = parts[0];
            }
        }
        spokenText = replyText.replace(/\[BOOKING_CONFIRMED[^\]]*\]/g, "").trim();
        conversation.context.workflow = "booked";
        const { intake, providerMatch, slotOptions } = conversation.context;
        const matchedSlot = extractedSlot || slotOptions?.find((s) => spokenText.includes(s)) || "your selected time";
        sendNotifications({
            intake: intake || {},
            providerName: extractedProvider || providerMatch?.name || "your provider",
            slot: matchedSlot,
        }).catch(err => console.error("Notification Error:", err.message));
    }
    // Save and broadcast the UNSTRIPPED reply so the frontend UI can catch the tag
    conversation.messages.push({ role: "assistant", text: replyText });
    notifyClients(conversationId, { role: "assistant", text: replyText });

    const gather = twiml.gather({
        input: "speech",
        action: `/api/call/gather?conversationId=${conversationId}`,
        speechTimeout: "auto",
    });
    gather.say(spokenText);

    res.type("text/xml").send(twiml.toString());
});

router.post("/gather", async (req, res) => {
    const { conversationId } = req.query;
    const { SpeechResult } = req.body;
    const twiml = new twilio.twiml.VoiceResponse();

    const conversation = conversations[conversationId];
    if (!conversation) {
        twiml.say("Session lost. Goodbye.");
        twiml.hangup();
        return res.type("text/xml").send(twiml.toString());
    }

    if (SpeechResult) {
        conversation.messages.push({ role: "user", text: SpeechResult });
        notifyClients(conversationId, { role: "user", text: SpeechResult });

        const geminiResponse = await callGemini({
            messages: conversation.messages,
            context: conversation.context,
        });

        let replyText = geminiResponse.reply || "I'm sorry, I encountered an error.";
        let spokenText = replyText;
        const bookingMatch = replyText.match(/\[BOOKING_CONFIRMED(?:[:\-]\s*(.*?))?\]/);
        if (bookingMatch) {
            let extractedProvider, extractedSlot;
            if (bookingMatch[1]) {
                const parts = bookingMatch[1].split('|').map(s => s.trim());
                if (parts.length > 1) {
                    extractedProvider = parts[0];
                    extractedSlot = parts[1];
                } else {
                    extractedSlot = parts[0];
                }
            }
            spokenText = replyText.replace(/\[BOOKING_CONFIRMED[^\]]*\]/g, "").trim();
            conversation.context.workflow = "booked";
            const { intake, providerMatch, slotOptions } = conversation.context;
            const matchedSlot = extractedSlot || slotOptions?.find((s) => spokenText.includes(s) || SpeechResult.includes(s)) || "your selected time";
            sendNotifications({
                intake: intake || {},
                providerName: extractedProvider || providerMatch?.name || "your provider",
                slot: matchedSlot,
            }).catch(err => console.error("Notification Error:", err.message));
        }
        conversation.messages.push({ role: "assistant", text: replyText });
        notifyClients(conversationId, { role: "assistant", text: replyText });

        const gather = twiml.gather({
            input: "speech",
            action: `/api/call/gather?conversationId=${conversationId}`,
            speechTimeout: "auto",
        });
        gather.say(spokenText);
    } else {
        twiml.say("I didn't catch that. Goodbye.");
        twiml.hangup();
    }

    res.type("text/xml").send(twiml.toString());
});

export default router;