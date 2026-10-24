
import express from "express";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(express.json({ limit: "20kb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const hits = new Map();

function rateLimit(req, res, next) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const windowMs = 60_000;
  const max = 12;

  let record = hits.get(key);

  if (!record || now - record.start > windowMs) {
    record = { start: now, count: 0 };
  }

  record.count += 1;
  hits.set(key, record);

  if (record.count > max) {
    return res.status(429).json({
      error: "Tul sok uzenet erkezett. Varj egy kicsit, majd probald ujra."
    });
  }

  next();
}

app.post("/api/chat", rateLimit, async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const previousResponseId =
      req.body?.previousResponseId || undefined;

    if (!message) {
      return res.status(400).json({
        error: "Az uzenet nem lehet ures."
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        error: "Az uzenet tul hosszu."
      });
    }

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions:
        "Te a Nexora Gaming segitokesz AI-asszisztense vagy. " +
        "Alapertelmezetten magyarul valaszolj. " +
        "Adj vilagos, tomor es hasznos valaszokat. " +
        "A valaszaid legyenek eletkornak megfeleloek es biztonsagosak.",
      input: message,
      previous_response_id: previousResponseId,
      tools: [{ type: "web_search" }],
      max_output_tokens: 900
    });

    res.json({
      reply: response.output_text || "Most nem tudtam valaszt adni.",
      responseId: response.id
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Az AI most nem erheto el. Ellenorizd a beallitasokat."
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Nexora Gaming fut a ${port} porton.`);
});

