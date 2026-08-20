import { format } from "date-fns";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function Clock() {
  const [now, setNow] = useState(() => new Date());
  const [live, setLive] = useState(false);

  useEffect(() => {
    setLive(true);
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="min-w-0">
      <div className="flex items-end gap-3 leading-none">
        <time
          suppressHydrationWarning
          className="font-sans text-clock font-light tracking-tight text-fg tabular-nums"
        >
          {format(now, "h:mm")}
        </time>
        <span
          suppressHydrationWarning
          className={cn(
            "mb-2 hidden text-xl font-light tabular-nums sm:inline md:mb-3 md:text-2xl",
            live ? "text-muted" : "text-transparent",
          )}
        >
          {live ? format(now, "ss") : "00"}
        </span>
      </div>
      <p
        suppressHydrationWarning
        className="mt-1 text-lg font-light tracking-wide text-muted sm:text-xl"
      >
        {format(now, "EEEE, MMMM d")}
      </p>
    </div>
  );
}
