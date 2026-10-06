import express from “express”; import OpenAI from “openai”; import path
from “path”; import { fileURLToPath } from “url”;

const app = express(); const port = process.env.PORT || 3000;

if (!process.env.OPENAI_API_KEY) { console.warn(“FIGYELEM: nincs
beállítva OPENAI_API_KEY környezeti változó.”); }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, });

app.use(express.json({ limit: “20kb” })); const __filename =
fileURLToPath(import.meta.url); const __dirname =
path.dirname(__filename);

app.get(“/”, (_req, res) => { res.sendFile(path.join(__dirname,
“index.html”)); });

const hits = new Map(); function rateLimit(req, res, next) { const key =
req.ip || “unknown”; const now = Date.now(); const windowMs = 60_000;
const max = 12;

let record = hits.get(key); if (!record || now - record.start >
windowMs) { record = { start: now, count: 0 }; }

record.count += 1; hits.set(key, record);

if (record.count > max) { return res.status(429).json({ error: “Túl sok
üzenet érkezett. Várj egy kicsit, majd próbáld újra.” }); } next(); }

app.post(“/api/chat”, rateLimit, async (req, res) => { try { const
message = String(req.body?.message || ““).trim(); const
previousResponseId = req.body?.previousResponseId || undefined;

    if (!message) {
      return res.status(400).json({ error: "Az üzenet nem lehet üres." });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: "Az üzenet túl hosszú." });
    }

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions: [
        "Te a Nexora Gaming weboldal segítőkész AI-asszisztense vagy.",
        "Alapértelmezetten magyarul válaszolj, de igazodj a felhasználó nyelvéhez.",
        "Adj világos, tömör és hasznos válaszokat.",
        "Ha friss vagy időérzékeny információt kérnek, használj webes keresést, ha elérhető.",
        "Ne állítsd, hogy mindent biztosan tudsz; ha bizonytalan vagy, jelezd.",
        "A felhasználó lehet kiskorú, ezért tartsd a válaszokat életkornak megfelelőnek és biztonságosnak.",
        "Ne adj útmutatást veszélyes, tiltott vagy életkorhoz kötött tevékenységekhez.",
        "Sürgős egészségügyi, jogi vagy pénzügyi ügyeknél jelezd, hogy szakember segítsége lehet szükséges."
      ].join(" "),
      input: message,
      previous_response_id: previousResponseId,
      tools: [{ type: "web_search" }],
      max_output_tokens: 900
    });

    res.json({
      reply: response.output_text || "Most nem tudtam szöveges választ készíteni.",
      responseId: response.id
    });

} catch (error) { console.error(error); const status = error?.status ||
500; res.status(status >= 400 && status < 600 ? status : 500).json({
error: “Az AI most nem érhető el. Ellenőrizd a szerver beállításait és
próbáld újra.” }); } });

app.get(“/api/health”, (_req, res) => { res.json({ ok: true }); });

app.listen(port, () => {
console.log(Nexora Gaming fut: http://localhost:${port}); });
