import { CloudLightning, Eye } from "lucide-react";
import { useMirror } from "@/lib/mirror/store";
import { cn } from "@/lib/utils";

const IDLE =
  "The sky's got plans. I'll tell you if yours don't match.";

export function GrokLine() {
  const glance = useMirror((s) => s.glance);
  const glancing = useMirror((s) => s.glancing);
  const error = useMirror((s) => s.glanceError);

  const line = glancing
    ? "Looking…"
    : error
      ? error
      : glance?.line || IDLE;

  const severity = glance?.severity ?? "info";
  const warn = !glancing && !error && severity === "warn";
  const ok = !glancing && !error && severity === "ok";

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center px-4 text-center">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted">
        {warn ? (
          <CloudLightning className="size-3.5 text-warn" strokeWidth={1.5} />
        ) : (
          <Eye className="size-3.5" strokeWidth={1.5} />
        )}
        {glancing ? "Grok" : warn ? "Bring something" : ok ? "You're set" : "Grok"}
      </p>
      <p
        key={line}
        className={cn(
          "line-in mt-4 font-display text-quote font-normal italic leading-snug text-fg",
          glancing && "text-muted",
          error && "not-italic text-muted",
        )}
      >
        {line}
      </p>
      {glance?.outfit && glance.personPresent && !glancing ? (
        <p className="mt-4 text-sm font-light text-muted">{glance.outfit}</p>
      ) : null}
    </section>
  );
}
