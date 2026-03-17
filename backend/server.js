
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { callGemini } from "./routes/gemini.js";
import { sendNotifications } from "./routes/notify.js";
import callRouter, { conversations } from "./routes/call.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "kyron-backend" });
});

app.use("/api/call", callRouter);

app.post("/api/chat/message", async (req, res) => {
    try {
        const { context, messages, conversationId } = req.body || {};

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: "messages array is required" });
        }
        if (conversationId) {
            conversations[conversationId] = { context, messages };
        }

        const gemini = await callGemini({ context, messages });
        if (!gemini.ok) {
            return res.status(502).json({ error: gemini.error });
        }
        return res.json({ reply: gemini.reply });
    } catch (error) {
        return res.status(500).json({ error: String(error) });
    }
});

app.post("/api/notify", async (req, res) => {
    try {
        const { intake, providerName, slot } = req.body;
        if (!intake || !providerName || !slot) {
            return res.status(400).json({ error: "intake, providerName, and slot are required" });
        }
        await sendNotifications({ intake, providerName, slot });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: String(error) });
    }
});

app.listen(port, () => {
    console.log(`Kyron backend running on http://localhost:${port}`);
});
