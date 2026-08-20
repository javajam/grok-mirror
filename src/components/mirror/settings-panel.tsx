import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { placeLabel, type PlaceHit } from "@/lib/mirror/geocode";
import { searchCity } from "@/lib/mirror/rpc";
import { useMirror } from "@/lib/mirror/store";

export function SettingsPanel() {
  const open = useMirror((s) => s.settingsOpen);
  const setOpen = useMirror((s) => s.setSettingsOpen);
  const settings = useMirror((s) => s.settings);
  const patch = useMirror((s) => s.patchSettings);
  const { isPending } = useCurrentUserState();

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      setSearching(true);
      void searchCity({ data: { q: query.trim() } })
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 280);
    return () => window.clearTimeout(t);
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0 bg-bg/70"
        aria-label="Close settings"
        onClick={() => setOpen(false)}
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-hair bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
              Grok Mirror
            </p>
            <h2 className="mt-1 text-xl font-medium">Settings</h2>
          </div>
          <Button variant="quiet" size="icon" onClick={() => setOpen(false)} aria-label="Close">
            <X />
          </Button>
        </div>

        <div className="mt-8 space-y-8 overflow-y-auto pr-1">
          <section className="space-y-3">
            <Label htmlFor="city">Mirror location</Label>
            <p className="text-sm font-light text-muted">
              Currently {settings.city}. Weather and Grok both use this.
            </p>
            <Input
              id="city"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a city"
              autoComplete="off"
            />
            {searching ? (
              <p className="text-xs text-muted">Searching…</p>
            ) : null}
            {hits.length ? (
              <ul className="overflow-hidden rounded-md border border-hair">
                {hits.map((hit) => (
                  <li key={`${hit.latitude}-${hit.longitude}`}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2.5 text-left text-sm hover:bg-fg/5"
                      onClick={() => {
                        patch({
                          city: placeLabel(hit),
                          latitude: hit.latitude,
                          longitude: hit.longitude,
                          timezone: hit.timezone || "auto",
                        });
                        setQuery("");
                        setHits([]);
                      }}
                    >
                      {placeLabel(hit)}
                      {hit.country ? (
                        <span className="text-muted"> · {hit.country}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Fahrenheit</p>
              <p className="text-sm font-light text-muted">Off for Celsius</p>
            </div>
            <Switch
              checked={settings.units === "f"}
              onCheckedChange={(on) => patch({ units: on ? "f" : "c" })}
            />
          </section>

          <section className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Camera</p>
              <p className="text-sm font-light text-muted">
                Frames go to Grok only. Nothing is stored.
              </p>
            </div>
            <Switch
              checked={settings.cameraEnabled}
              onCheckedChange={(on) => patch({ cameraEnabled: on })}
            />
          </section>

          <section className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Auto glance</p>
              <p className="text-sm font-light text-muted">
                When someone walks up and stands still
              </p>
            </div>
            <Switch
              checked={settings.autoGlance}
              onCheckedChange={(on) => patch({ autoGlance: on })}
              disabled={!settings.cameraEnabled}
            />
          </section>

          <section className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Voice</p>
              <p className="text-sm font-light text-muted">
                Grok speaks the line out loud
              </p>
            </div>
            <Switch
              checked={settings.voiceEnabled}
              onCheckedChange={(on) => patch({ voiceEnabled: on })}
            />
          </section>

          <section className="border-t border-hair pt-6">
            {isPending ? (
              <div className="h-8 w-32 animate-pulse rounded-full bg-fg/10" />
            ) : (
              <>
                <SignedIn>
                  <UserButton />
                </SignedIn>
                <SignedOut>
                  <p className="text-sm font-light text-muted">
                    Sign in to keep settings with your account on publish.
                  </p>
                  <Button asChild className="mt-3">
                    <Link to="/login">Sign in</Link>
                  </Button>
                </SignedOut>
              </>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
