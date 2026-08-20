import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function WeatherIcon({
  code,
  isDay = true,
  className,
}: {
  code: number;
  isDay?: boolean;
  className?: string;
}) {
  const Icon = pick(code, isDay);
  return <Icon className={cn("shrink-0", className)} strokeWidth={1.25} />;
}

function pick(code: number, isDay: boolean) {
  if (code === 0) return isDay ? Sun : Moon;
  if (code === 1 || code === 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code === 85 || code === 86) return CloudSnow;
  if (code === 95 || code === 96 || code === 99) return CloudLightning;
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82)
  ) {
    return CloudRain;
  }
  return Cloud;
}
