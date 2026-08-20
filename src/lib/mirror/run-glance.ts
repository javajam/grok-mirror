import { runGlance, speakLine } from "./rpc";
import { summarizeForecast } from "./forecast";
import { useMirror } from "./store";
import type { GlanceScenario } from "./types";

let audio: HTMLAudioElement | null = null;

export async function glanceNow(opts: {
  scenario: GlanceScenario;
  imageDataUrl?: string | null;
}): Promise<void> {
  const {
    weather,
    settings,
    setGlancing,
    setGlance,
    setGlanceError,
    markLiveGlance,
    setLastScenario,
  } = useMirror.getState();

  if (!weather) {
    setGlanceError("Weather isn’t in yet — hang on a second.");
    return;
  }

  setGlancing(true);
  setGlanceError(null);

  const localTime = new Date().toLocaleString("en-US", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const result = await runGlance({
    data: {
      imageDataUrl: opts.imageDataUrl || undefined,
      scenario: opts.scenario,
      forecast: summarizeForecast(weather, opts.scenario === "rain"),
      locationName: settings.city,
      localTime,
    },
  });

  if (!result.ok) {
    setGlanceError(result.error);
    return;
  }

  setGlance(result.result);
  setLastScenario(opts.scenario);
  setGlancing(false);
  if (opts.scenario === "live") markLiveGlance();

  if (settings.voiceEnabled && result.result.line) {
    void playVoice(result.result.line);
  }
}

async function playVoice(text: string) {
  try {
    const spoken = await speakLine({ data: { text } });
    if (!spoken.ok) return;
    audio?.pause();
    audio = new Audio(spoken.audio);
    void audio.play().catch(() => {
      /* autoplay may be blocked until a tap */
    });
  } catch {
    /* voice is optional */
  }
}
