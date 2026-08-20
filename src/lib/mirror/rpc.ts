import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { GlanceResult, GlanceScenario, GlanceSeverity, NewsItem, WeatherSnapshot } from "./types";
import { loadWeatherSnapshot } from "./weather";
import type { PlaceHit } from "./geocode";

const GlanceInput = z.object({
  imageDataUrl: z.string().max(1_800_000).optional(),
  scenario: z.enum(["live", "rain"]),
  forecast: z.string().min(1).max(2500),
  locationName: z.string().min(1).max(80),
  localTime: z.string().min(1).max(80),
});

const WeatherInput = z.object({
  latitude: z.number(),
  longitude: z.number(),
  city: z.string().min(1).max(80),
  units: z.enum(["f", "c"]),
  timezone: z.string().max(80),
});

const TtsInput = z.object({
  text: z.string().min(1).max(280),
});

const CityInput = z.object({
  q: z.string().min(2).max(80),
});

const glanceHits: number[] = [];

function glanceRateOk(): boolean {
  const now = Date.now();
  while (glanceHits.length && now - glanceHits[0] > 10 * 60 * 1000) glanceHits.shift();
  if (glanceHits.length >= 12) return false;
  glanceHits.push(now);
  return true;
}

const SYSTEM = `You are Grok, living inside a household smart mirror. Someone may be standing in front of you. You can see them when a photo is provided, and you always know the weather forecast.

Your job is a six-second glance: what they are wearing versus what the sky will do in the next 12 hours.

If they are NOT dressed for the forecast — t-shirt and shorts while thunderstorms or a cold front are coming, sandals in the rain, no jacket when it drops into the 40s — warn them specifically (jacket, umbrella, different shoes) and when the weather turns.

If they ARE prepared, say so in one dry line and add one useful detail (timing, wind, UV).

If nobody is clearly in the photo, set personPresent to false.

Voice: a sharp, warm friend. Not a butler, not a weatherman, not a chatbot. Dry humor is good. Never cruel about bodies, age, or looks. Never mention being an AI, a model, or "analyzing an image." Never use emoji or markdown.

Reply with JSON only, no fences:
{"personPresent":boolean,"outfit":string,"prepared":boolean,"severity":"ok"|"info"|"warn","line":string}

"line" is 1-2 spoken sentences, max 220 characters.`;

export const getAiStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ available: boolean }> => {
    return { available: Boolean(process.env.XAI_API_KEY) };
  },
);

export const loadWeather = createServerFn({ method: "POST" })
  .validator((input: unknown) => WeatherInput.parse(input))
  .handler(async ({ data }): Promise<WeatherSnapshot> => {
    return loadWeatherSnapshot(data);
  });

export const searchCity = createServerFn({ method: "POST" })
  .validator((input: unknown) => CityInput.parse(input))
  .handler(async ({ data }): Promise<PlaceHit[]> => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", data.q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "6");
    url.searchParams.set("addressdetails", "1");
    const res = await fetch(url, {
      headers: {
        "User-Agent": "GrokMirror/1.0 (personal smart mirror)",
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as {
      display_name?: string;
      lat?: string;
      lon?: string;
      address?: { city?: string; town?: string; village?: string; state?: string; country?: string };
    }[];
    return rows.map((r) => {
      const name =
        r.address?.city || r.address?.town || r.address?.village || r.display_name?.split(",")[0] || "Unknown";
      return {
        name,
        admin: r.address?.state ?? "",
        country: r.address?.country ?? "",
        latitude: Number(r.lat),
        longitude: Number(r.lon),
        timezone: "auto",
      };
    });
  });

export const fetchHeadlines = createServerFn({ method: "GET" }).handler(
  async (): Promise<NewsItem[]> => {
    try {
      const res = await fetch("https://feeds.npr.org/1001/rss.xml", {
        headers: { "User-Agent": "GrokMirror/1.0" },
      });
      if (!res.ok) return [];
      return parseRss(await res.text()).slice(0, 6);
    } catch (err) {
      console.error("[news]", err);
      return [];
    }
  },
);

export const runGlance = createServerFn({ method: "POST" })
  .validator((input: unknown) => GlanceInput.parse(input))
  .handler(async ({ data }): Promise<
    { ok: true; result: GlanceResult } | { ok: false; error: string }
  > => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "Grok is not available in this environment." };
    if (!glanceRateOk()) return { ok: false, error: "Give it a minute — the mirror just looked." };

    const content: Array<Record<string, unknown>> = [
      { type: "text", text: buildUserText(data) },
    ];
    if (data.imageDataUrl?.startsWith("data:image/")) {
      content.unshift({
        type: "image_url",
        image_url: { url: data.imageDataUrl, detail: "low" },
      });
    }

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.7,
        max_tokens: 220,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[glance]", res.status, errText.slice(0, 400));
      return { ok: false, error: `Grok could not glance (${res.status}).` };
    }

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = body.choices?.[0]?.message?.content ?? "";
    return { ok: true, result: parseGlance(raw, data.scenario) };
  });

export const speakLine = createServerFn({ method: "POST" })
  .validator((input: unknown) => TtsInput.parse(input))
  .handler(async ({ data }): Promise<
    { ok: true; audio: string } | { ok: false; error: string }
  > => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "Voice is not available." };

    const res = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ text: data.text, voice_id: "eve" }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[tts]", res.status, errText.slice(0, 300));
      return { ok: false, error: `Voice failed (${res.status}).` };
    }

    const mime = res.headers.get("content-type") || "audio/mpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 80) return { ok: false, error: "Voice returned empty audio." };
    return {
      ok: true,
      audio: `data:${mime.split(";")[0]};base64,${buf.toString("base64")}`,
    };
  });

function buildUserText(data: z.infer<typeof GlanceInput>): string {
  const bits = [
    `Local time: ${data.localTime}.`,
    `Location: ${data.locationName}.`,
    `Forecast:\n${data.forecast}`,
  ];
  if (data.scenario === "rain") {
    bits.push(
      "SCENARIO: Rain walk-up. Current sky may look fine. Thunderstorms are coming in a few hours. If there is no photo, assume the person is wearing a short-sleeve t-shirt, shorts, and sneakers — no jacket, no umbrella.",
    );
  } else if (!data.imageDataUrl) {
    bits.push(
      "No photo this time. Give a short weather-prep line for whoever walks up next, as if they might be underdressed.",
    );
  }
  bits.push("JSON only.");
  return bits.join("\n\n");
}

function parseGlance(raw: string, scenario: GlanceScenario): GlanceResult {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  let personPresent = true;
  let outfit = "";
  let prepared = false;
  let severity: GlanceSeverity = "info";
  let line = stripped.slice(0, 220);

  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(stripped.slice(start, end + 1)) as Record<string, unknown>;
      personPresent = Boolean(obj.personPresent);
      outfit = String(obj.outfit ?? "").slice(0, 120);
      prepared = Boolean(obj.prepared);
      if (obj.severity === "ok" || obj.severity === "info" || obj.severity === "warn") {
        severity = obj.severity;
      }
      line = String(obj.line ?? line).replace(/\s+/g, " ").trim().slice(0, 240);
    } catch {
      /* keep fallback */
    }
  }

  if (!line) {
    line = "Sky's got plans. I'll tell you if yours don't match.";
    severity = "info";
  }

  return {
    personPresent,
    outfit,
    prepared,
    severity,
    line,
    at: Date.now(),
    scenario,
  };
}

function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const block of blocks) {
    const raw =
      pick(block, /<title><!\[CDATA\[(.*?)\]\]><\/title>/i) ||
      pick(block, /<title>(.*?)<\/title>/i);
    if (!raw) continue;
    const title = decode(raw).replace(/\s+/g, " ").trim();
    if (!title || title.toLowerCase() === "npr news") continue;
    items.push({ title, source: "NPR" });
  }
  return items;
}

function pick(s: string, re: RegExp): string | null {
  const m = s.match(re);
  return m?.[1] ?? null;
}

function decode(s: string): string {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[|\]\]>/g, "");
}
