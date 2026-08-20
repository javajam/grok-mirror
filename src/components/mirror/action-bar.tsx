import { CloudLightning, Eye, Settings2 } from "lucide-react";
import { captureJpeg } from "@/lib/mirror/capture";
import { glanceNow } from "@/lib/mirror/run-glance";
import { useMirror } from "@/lib/mirror/store";
import { Button } from "@/components/ui/button";

export function ActionBar() {
  const glancing = useMirror((s) => s.glancing);
  const cameraReady = useMirror((s) => s.cameraReady);
  const presence = useMirror((s) => s.presence);
  const cameraOn = useMirror((s) => s.settings.cameraEnabled);
  const setSettingsOpen = useMirror((s) => s.setSettingsOpen);

  const look = async (scenario: "live" | "rain") => {
    const video = document.querySelector("video");
    const frame =
      cameraReady && video instanceof HTMLVideoElement
        ? captureJpeg(video)
        : null;
    await glanceNow({ scenario, imageDataUrl: frame });
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      <Button size="lg" disabled={glancing} onClick={() => void look("live")}>
        <Eye />
        Look
      </Button>
      <Button size="lg" disabled={glancing} onClick={() => void look("rain")}>
        <CloudLightning />
        Rain walk-up
      </Button>
      <Button
        size="lg"
        variant="quiet"
        onClick={() => setSettingsOpen(true)}
        aria-label="Settings"
      >
        <Settings2 />
        <span className="hidden sm:inline">Settings</span>
      </Button>
      <p className="basis-full text-center text-xs text-muted sm:ml-2 sm:basis-auto">
        {cameraOn
          ? cameraReady
            ? presence === "still"
              ? "Someone’s here"
              : presence === "motion"
                ? "Motion"
                : "Camera watching"
            : "Waiting on camera"
          : "Camera off — Rain walk-up still works"}
      </p>
    </div>
  );
}
