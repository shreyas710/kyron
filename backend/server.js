
import express from "express";
import cors from "cors";
import { callGemini } from "./gemini.js";

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "kyron-backend" });
});

app.post("/api/chat/message", async (req, res) => {
    try {
        const { message, context, messages } = req.body || {};

        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "message is required" });
        }

        const gemini = await callGemini({ message, context, messages });
        if (!gemini.ok) {
            return res.status(502).json({ error: gemini.error });
        }

        return res.json({ reply: gemini.reply });
    } catch (error) {
        return res.status(500).json({ error: String(error) });
    }
});

app.listen(port, () => {
    console.log(`Kyron backend running on http://localhost:${port}`);
});
