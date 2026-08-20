export type Units = "f" | "c";
export type GlanceScenario = "live" | "rain";
export type GlanceSeverity = "ok" | "info" | "warn";
export type Presence = "empty" | "motion" | "still";

export type MirrorSettings = {
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  units: Units;
  cameraEnabled: boolean;
  autoGlance: boolean;
  voiceEnabled: boolean;
  cooldownSec: number;
};

export type HourPoint = {
  time: string;
  temp: number;
  precipProb: number;
  precip: number;
  weatherCode: number;
};

export type WeatherSnapshot = {
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  units: Units;
  currentTemp: number;
  feelsLike: number;
  weatherCode: number;
  isDay: boolean;
  humidity: number;
  wind: number;
  precip: number;
  high: number;
  low: number;
  dailyPrecipProb: number;
  hours: HourPoint[];
  fetchedAt: number;
};

export type GlanceResult = {
  personPresent: boolean;
  outfit: string;
  prepared: boolean;
  severity: GlanceSeverity;
  line: string;
  at: number;
  scenario: GlanceScenario;
};

export type NewsItem = {
  title: string;
  source: string;
};
