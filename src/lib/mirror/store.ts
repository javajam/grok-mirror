import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  GlanceResult,
  GlanceScenario,
  MirrorSettings,
  Presence,
  WeatherSnapshot,
} from "./types";

export const DEFAULT_SETTINGS: MirrorSettings = {
  city: "Dallas–Fort Worth",
  latitude: 32.7767,
  longitude: -96.797,
  timezone: "America/Chicago",
  units: "f",
  cameraEnabled: false,
  autoGlance: true,
  voiceEnabled: true,
  cooldownSec: 180,
};

type MirrorState = {
  settings: MirrorSettings;
  patchSettings: (patch: Partial<MirrorSettings>) => void;
  weather: WeatherSnapshot | null;
  setWeather: (weather: WeatherSnapshot | null) => void;
  weatherError: string | null;
  setWeatherError: (msg: string | null) => void;
  glance: GlanceResult | null;
  glancing: boolean;
  glanceError: string | null;
  setGlance: (glance: GlanceResult | null) => void;
  setGlancing: (glancing: boolean) => void;
  setGlanceError: (msg: string | null) => void;
  presence: Presence;
  setPresence: (presence: Presence) => void;
  cameraReady: boolean;
  cameraError: string | null;
  setCameraReady: (ready: boolean) => void;
  setCameraError: (msg: string | null) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  lastLiveGlanceAt: number;
  markLiveGlance: () => void;
  canAutoGlance: () => boolean;
  lastScenario: GlanceScenario | null;
  setLastScenario: (scenario: GlanceScenario | null) => void;
};

export const useMirror = create<MirrorState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      patchSettings: (patch) =>
        set({ settings: { ...get().settings, ...patch } }),
      weather: null,
      setWeather: (weather) => set({ weather, weatherError: null }),
      weatherError: null,
      setWeatherError: (weatherError) => set({ weatherError }),
      glance: null,
      glancing: false,
      glanceError: null,
      setGlance: (glance) => set({ glance, glanceError: null }),
      setGlancing: (glancing) => set({ glancing }),
      setGlanceError: (glanceError) =>
        set(
          glanceError
            ? { glanceError, glancing: false }
            : { glanceError: null },
        ),
      presence: "empty",
      setPresence: (presence) => set({ presence }),
      cameraReady: false,
      cameraError: null,
      setCameraReady: (cameraReady) => set({ cameraReady }),
      setCameraError: (cameraError) => set({ cameraError }),
      settingsOpen: false,
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      lastLiveGlanceAt: 0,
      markLiveGlance: () => set({ lastLiveGlanceAt: Date.now() }),
      canAutoGlance: () => {
        const { settings, lastLiveGlanceAt, glancing } = get();
        if (glancing) return false;
        if (!settings.autoGlance || !settings.cameraEnabled) return false;
        return Date.now() - lastLiveGlanceAt > settings.cooldownSec * 1000;
      },
      lastScenario: null,
      setLastScenario: (lastScenario) => set({ lastScenario }),
    }),
    {
      name: "grok-mirror-v1",
      partialize: (s) => ({ settings: s.settings }),
    },
  ),
);
