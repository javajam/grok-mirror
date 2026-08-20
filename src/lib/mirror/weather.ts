import type { HourPoint, Units, WeatherSnapshot } from "./types";

const UA = "GrokMirror/1.0 (personal smart mirror)";
const TTL_MS = 5 * 60 * 1000;

let cache: { key: string; at: number; data: WeatherSnapshot } | null = null;

export async function loadWeatherSnapshot(opts: {
  latitude: number;
  longitude: number;
  city: string;
  units: Units;
  timezone: string;
}): Promise<WeatherSnapshot> {
  const key = `${opts.latitude.toFixed(3)},${opts.longitude.toFixed(3)},${opts.units}`;
  if (cache && cache.key === key && Date.now() - cache.at < TTL_MS) {
    return { ...cache.data, city: opts.city || cache.data.city };
  }

  let data: WeatherSnapshot;
  try {
    data = await fromNws(opts);
  } catch (nwsErr) {
    try {
      data = await fromOpenMeteo(opts);
    } catch {
      throw nwsErr instanceof Error ? nwsErr : new Error("Weather unavailable");
    }
  }
  cache = { key, at: Date.now(), data };
  return data;
}

async function fromNws(opts: {
  latitude: number;
  longitude: number;
  city: string;
  units: Units;
  timezone: string;
}): Promise<WeatherSnapshot> {
  const pointsUrl = `https://api.weather.gov/points/${opts.latitude.toFixed(4)},${opts.longitude.toFixed(4)}`;
  const points = await getJson<{
    properties?: {
      timeZone?: string;
      forecastHourly?: string;
      relativeLocation?: { properties?: { city?: string; state?: string } };
    };
  }>(pointsUrl);

  const hourlyUrl = points.properties?.forecastHourly;
  if (!hourlyUrl) throw new Error("No forecast for this location");

  const hourly = await getJson<{ properties?: { periods?: NwsPeriod[] } }>(hourlyUrl);
  const periods = hourly.properties?.periods ?? [];
  if (!periods.length) throw new Error("Forecast was empty");

  const now = Date.now();
  const hours: HourPoint[] = [];
  for (const p of periods) {
    const t = new Date(p.startTime).getTime();
    if (t < now - 40 * 60 * 1000) continue;
    const unit = (p.temperatureUnit || "F").toUpperCase();
    hours.push({
      time: p.startTime,
      temp: toUnit(p.temperature, unit, opts.units),
      precipProb: p.probabilityOfPrecipitation?.value ?? 0,
      precip: 0,
      weatherCode: nwsCode(p.shortForecast || ""),
    });
    if (hours.length >= 16) break;
  }
  if (!hours.length) throw new Error("Forecast was empty");

  const current = periods[0];
  const currentUnit = (current.temperatureUnit || "F").toUpperCase();
  const temps = hours.slice(0, 24).map((h) => h.temp);
  const loc = points.properties?.relativeLocation?.properties;
  const city =
    opts.city ||
    [loc?.city, loc?.state].filter(Boolean).join(", ") ||
    "Home";

  const windMph = parseWind(current.windSpeed || "");
  const wind = opts.units === "f" ? windMph : Math.round(windMph * 1.609);

  return {
    city,
    latitude: opts.latitude,
    longitude: opts.longitude,
    timezone: points.properties?.timeZone || opts.timezone,
    units: opts.units,
    currentTemp: Math.round(toUnit(current.temperature, currentUnit, opts.units)),
    feelsLike: Math.round(toUnit(current.temperature, currentUnit, opts.units)),
    weatherCode: nwsCode(current.shortForecast || ""),
    isDay: Boolean(current.isDaytime),
    humidity: current.relativeHumidity?.value ?? 0,
    wind,
    precip: 0,
    high: Math.round(Math.max(...temps)),
    low: Math.round(Math.min(...temps)),
    dailyPrecipProb: Math.max(...hours.slice(0, 12).map((h) => h.precipProb), 0),
    hours,
    fetchedAt: Date.now(),
  };
}

type NwsPeriod = {
  startTime: string;
  isDaytime?: boolean;
  temperature: number;
  temperatureUnit?: string;
  probabilityOfPrecipitation?: { value: number | null };
  relativeHumidity?: { value: number | null };
  windSpeed?: string;
  shortForecast?: string;
};

async function fromOpenMeteo(opts: {
  latitude: number;
  longitude: number;
  city: string;
  units: Units;
  timezone: string;
}): Promise<WeatherSnapshot> {
  const imperial = opts.units === "f";
  const params = new URLSearchParams({
    latitude: String(opts.latitude),
    longitude: String(opts.longitude),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "relative_humidity_2m",
      "precipitation",
      "is_day",
    ].join(","),
    hourly: [
      "temperature_2m",
      "precipitation_probability",
      "weather_code",
      "precipitation",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
    ].join(","),
    timezone: opts.timezone || "auto",
    forecast_days: "2",
    temperature_unit: imperial ? "fahrenheit" : "celsius",
    wind_speed_unit: imperial ? "mph" : "kmh",
    precipitation_unit: imperial ? "inch" : "mm",
  });
  const data = await getJson<{
    timezone?: string;
    current?: {
      temperature_2m?: number;
      apparent_temperature?: number;
      weather_code?: number;
      wind_speed_10m?: number;
      relative_humidity_2m?: number;
      precipitation?: number;
      is_day?: number;
    };
    hourly?: {
      time?: string[];
      temperature_2m?: number[];
      precipitation_probability?: number[];
      weather_code?: number[];
      precipitation?: number[];
    };
    daily?: {
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_probability_max?: number[];
    };
  }>(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

  const hours: HourPoint[] = [];
  const now = Date.now();
  const times = data.hourly?.time ?? [];
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]).getTime();
    if (t < now - 30 * 60 * 1000) continue;
    hours.push({
      time: times[i],
      temp: n(data.hourly?.temperature_2m?.[i]),
      precipProb: n(data.hourly?.precipitation_probability?.[i]),
      precip: n(data.hourly?.precipitation?.[i]),
      weatherCode: n(data.hourly?.weather_code?.[i]),
    });
    if (hours.length >= 16) break;
  }

  return {
    city: opts.city,
    latitude: opts.latitude,
    longitude: opts.longitude,
    timezone: data.timezone || opts.timezone,
    units: opts.units,
    currentTemp: Math.round(n(data.current?.temperature_2m)),
    feelsLike: Math.round(n(data.current?.apparent_temperature)),
    weatherCode: n(data.current?.weather_code),
    isDay: Boolean(data.current?.is_day),
    humidity: n(data.current?.relative_humidity_2m),
    wind: Math.round(n(data.current?.wind_speed_10m)),
    precip: n(data.current?.precipitation),
    high: Math.round(n(data.daily?.temperature_2m_max?.[0])),
    low: Math.round(n(data.daily?.temperature_2m_min?.[0])),
    dailyPrecipProb: n(data.daily?.precipitation_probability_max?.[0]),
    hours,
    fetchedAt: Date.now(),
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Weather unavailable (${res.status})`);
  }
  return (await res.json()) as T;
}

function nwsCode(text: string): number {
  const t = text.toLowerCase();
  if (t.includes("tornado")) return 99;
  if (t.includes("thunder") || t.includes("t-storm")) return t.includes("severe") ? 96 : 95;
  if (t.includes("snow") || t.includes("sleet") || t.includes("ice")) return 71;
  if (t.includes("freezing")) return 66;
  if (t.includes("shower")) return 80;
  if (t.includes("rain") || t.includes("drizzle")) return 61;
  if (t.includes("fog") || t.includes("mist")) return 45;
  if (t.includes("overcast") || t.includes("mostly cloudy")) return 3;
  if (t.includes("partly") || t.includes("mostly sunny") || t.includes("mostly clear")) return 2;
  if (t.includes("sunny") || t.includes("clear") || t.includes("fair")) return 0;
  if (t.includes("cloud")) return 3;
  return 1;
}

function parseWind(s: string): number {
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

function toUnit(temp: number, from: string, units: Units): number {
  const isF = from.startsWith("F");
  if (units === "f") return isF ? temp : temp * 1.8 + 32;
  return isF ? (temp - 32) * (5 / 9) : temp;
}

function n(v: unknown): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}
