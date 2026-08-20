export function wmoLabel(code: number, isDay = true): string {
  if (code === 0) return isDay ? "Clear" : "Clear night";
  if (code === 1) return isDay ? "Mostly clear" : "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code === 95) return "Thunderstorms";
  if (code === 96 || code === 99) return "Severe storms";
  return "Mixed sky";
}

export function isWetCode(code: number): boolean {
  return (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    code === 95 ||
    code === 96 ||
    code === 99
  );
}

export function isStormCode(code: number): boolean {
  return code === 95 || code === 96 || code === 99;
}
