import type { Units, WeatherSnapshot } from "./types";
import { isStormCode, isWetCode, wmoLabel } from "./wmo";

export function formatTemp(n: number, units: Units): string {
  return `${Math.round(n)}°${units === "f" ? "F" : "C"}`;
}

export function hourLabel(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const ampm = h >= 12 ? "p" : "a";
  const hr = h % 12 || 12;
  return `${hr}${ampm}`;
}

export function summarizeForecast(w: WeatherSnapshot, rainOverride = false): string {
  const unit = w.units === "f" ? "°F" : "°C";
  const current = `Now in ${w.city}: ${w.currentTemp}${unit}, ${wmoLabel(w.weatherCode, w.isDay)}, feels ${w.feelsLike}${unit}, wind ${w.wind} ${w.units === "f" ? "mph" : "km/h"}, humidity ${w.humidity}%. Today high ${w.high}${unit} / low ${w.low}${unit}.`;

  const next = w.hours.slice(0, 12).map((h) => {
    const bits = [`${hourLabel(h.time)} ${Math.round(h.temp)}${unit}`];
    if (h.precipProb >= 20) bits.push(`${h.precipProb}% precip`);
    if (isStormCode(h.weatherCode)) bits.push("thunderstorms");
    else if (isWetCode(h.weatherCode)) bits.push(wmoLabel(h.weatherCode));
    return bits.join(" ");
  });

  const wetSoon = w.hours.slice(0, 12).find((h) => h.precipProb >= 40 || isWetCode(h.weatherCode));
  const stormSoon = w.hours.slice(0, 12).find((h) => isStormCode(h.weatherCode) || h.precipProb >= 70);

  let outlook = "Next 12 hours: " + next.join("; ") + ".";
  if (stormSoon) {
    outlook += ` Storm risk around ${hourLabel(stormSoon.time)}.`;
  } else if (wetSoon) {
    outlook += ` Rain risk around ${hourLabel(wetSoon.time)}.`;
  } else {
    outlook += " No meaningful rain in the next 12 hours.";
  }

  if (rainOverride) {
    outlook +=
      " DEMO OVERRIDE: Treat current conditions as sunny and warm, but thunderstorms arrive in about 3 hours with heavy rain and wind. The person is not dressed for that unless the photo clearly shows a rain jacket or umbrella.";
  }

  return `${current} ${outlook}`;
}
