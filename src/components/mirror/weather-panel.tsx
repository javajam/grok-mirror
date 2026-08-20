import { formatTemp, hourLabel } from "@/lib/mirror/forecast";
import { useMirror } from "@/lib/mirror/store";
import type { WeatherSnapshot } from "@/lib/mirror/types";
import { wmoLabel } from "@/lib/mirror/wmo";
import { WeatherIcon } from "./weather-icon";

export function WeatherPanel({
  initial,
}: {
  initial?: WeatherSnapshot | null;
}) {
  const weather = useMirror((s) => s.weather) ?? initial ?? null;
  const err = useMirror((s) => s.weatherError);

  if (err && !weather) {
    return (
      <div className="max-w-xs text-right text-sm text-muted">{err}</div>
    );
  }
  if (!weather) {
    return (
      <div className="text-right text-sm text-muted">Reading the sky…</div>
    );
  }

  const upcoming = weather.hours.slice(1, 6);

  return (
    <div className="min-w-0 text-right">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">
        {weather.city}
      </p>
      <div className="mt-1 flex items-center justify-end gap-3">
        <WeatherIcon
          code={weather.weatherCode}
          isDay={weather.isDay}
          className="size-10 text-fg/85"
        />
        <span className="font-sans text-temp font-light leading-none tabular-nums">
          {formatTemp(weather.currentTemp, weather.units)}
        </span>
      </div>
      <p className="mt-1 text-base font-light text-muted">
        {wmoLabel(weather.weatherCode, weather.isDay)}
        <span className="mx-2 text-muted/40">·</span>
        H {Math.round(weather.high)}°
        <span className="mx-1.5 text-muted/50">/</span>
        L {Math.round(weather.low)}°
      </p>
      <div className="mt-4 hidden justify-end gap-3 sm:flex">
        {upcoming.map((h) => (
          <div key={h.time} className="w-11 text-center">
            <p className="text-xs uppercase tracking-wider text-muted">
              {hourLabel(h.time)}
            </p>
            <WeatherIcon
              code={h.weatherCode}
              className="mx-auto mt-1 size-4 text-fg/80"
            />
            <p className="mt-1 text-sm font-light tabular-nums">
              {Math.round(h.temp)}°
            </p>
            <p
              className={
                h.precipProb >= 20
                  ? "text-xs tabular-nums text-accent"
                  : "text-xs text-transparent"
              }
            >
              {h.precipProb >= 20 ? `${h.precipProb}%` : "0"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
