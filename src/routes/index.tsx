import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ActionBar } from "@/components/mirror/action-bar";
import { CameraEngine } from "@/components/mirror/camera-engine";
import { Clock } from "@/components/mirror/clock";
import { GrokLine } from "@/components/mirror/grok-line";
import { NewsRail } from "@/components/mirror/news-rail";
import { SettingsPanel } from "@/components/mirror/settings-panel";
import { WeatherPanel } from "@/components/mirror/weather-panel";
import { getAiStatus, fetchHeadlines, loadWeather } from "@/lib/mirror/rpc";
import { DEFAULT_SETTINGS, useMirror } from "@/lib/mirror/store";
import type { NewsItem } from "@/lib/mirror/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [weather, headlines] = await Promise.all([
      loadWeather({
        data: {
          latitude: DEFAULT_SETTINGS.latitude,
          longitude: DEFAULT_SETTINGS.longitude,
          city: DEFAULT_SETTINGS.city,
          units: DEFAULT_SETTINGS.units,
          timezone: DEFAULT_SETTINGS.timezone,
        },
      }).catch(() => null),
      fetchHeadlines().catch((): NewsItem[] => []),
    ]);
    return { weather, headlines };
  },
  component: Home,
});

function Home() {
  const loaded = Route.useLoaderData();
  const settings = useMirror((s) => s.settings);
  const setWeather = useMirror((s) => s.setWeather);
  const setWeatherError = useMirror((s) => s.setWeatherError);
  const setSettingsOpen = useMirror((s) => s.setSettingsOpen);
  const cameraOn = settings.cameraEnabled;
  const cameraReady = useMirror((s) => s.cameraReady);
  const [aiOn, setAiOn] = useState(true);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (loaded.weather) setWeather(loaded.weather);
  }, [loaded.weather, setWeather]);

  useEffect(() => {
    const sameAsDefault =
      Math.abs(settings.latitude - DEFAULT_SETTINGS.latitude) < 0.01 &&
      Math.abs(settings.longitude - DEFAULT_SETTINGS.longitude) < 0.01 &&
      settings.units === DEFAULT_SETTINGS.units;
    if (sameAsDefault && loaded.weather) return;

    let cancelled = false;
    const load = async () => {
      try {
        const snap = await loadWeather({
          data: {
            latitude: settings.latitude,
            longitude: settings.longitude,
            city: settings.city,
            units: settings.units,
            timezone: settings.timezone,
          },
        });
        if (!cancelled) setWeather(snap);
      } catch (err) {
        if (!cancelled) {
          setWeatherError(
            err instanceof Error ? err.message : "Weather unavailable",
          );
        }
      }
    };
    void load();
    const id = window.setInterval(load, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [
    settings.latitude,
    settings.longitude,
    settings.city,
    settings.units,
    settings.timezone,
    loaded.weather,
    setWeather,
    setWeatherError,
  ]);

  useEffect(() => {
    void getAiStatus()
      .then((s) => setAiOn(s.available))
      .catch(() => setAiOn(false));
  }, []);

  useEffect(() => {
    let t: number | null = null;
    const bump = () => {
      setIdle(false);
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => setIdle(true), 4000);
    };
    bump();
    window.addEventListener("pointermove", bump);
    window.addEventListener("keydown", bump);
    window.addEventListener("touchstart", bump);
    return () => {
      if (t) window.clearTimeout(t);
      window.removeEventListener("pointermove", bump);
      window.removeEventListener("keydown", bump);
      window.removeEventListener("touchstart", bump);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "s" || e.key === "S") setSettingsOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSettingsOpen]);

  return (
    <main
      className={cn(
        "relative flex min-h-svh flex-col bg-bg text-fg",
        idle && "kiosk-idle",
      )}
    >
      <CameraEngine />
      {cameraOn && cameraReady ? (
        <span
          className="absolute top-4 left-1/2 z-10 size-2 -translate-x-1/2 rounded-full bg-fg/80"
          title="Camera on"
        />
      ) : null}

      <header className="flex items-start justify-between gap-6 px-5 pt-6 sm:px-10 sm:pt-10">
        <Clock />
        <WeatherPanel initial={loaded.weather} />
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <GrokLine />
      </div>

      <footer className="flex flex-col gap-6 px-5 pb-6 sm:flex-row sm:items-end sm:justify-between sm:px-10 sm:pb-8">
        <NewsRail initial={loaded.headlines ?? []} />
        <div className="flex flex-col items-center gap-3 sm:items-end">
          {!aiOn ? (
            <p className="text-xs text-muted">Grok is offline in this environment.</p>
          ) : null}
          <ActionBar />
        </div>
      </footer>

      <SettingsPanel />
    </main>
  );
}
