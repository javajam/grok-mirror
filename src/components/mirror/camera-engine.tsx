import { useEffect, useRef } from "react";
import { captureJpeg, frameScore } from "@/lib/mirror/capture";
import { glanceNow } from "@/lib/mirror/run-glance";
import { useMirror } from "@/lib/mirror/store";

type Mode = "empty" | "motion" | "still";

export function CameraEngine() {
  const enabled = useMirror((s) => s.settings.cameraEnabled);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevRef = useRef<Uint8ClampedArray | null>(null);
  const modeRef = useRef<Mode>("empty");
  const stillSinceRef = useRef(0);
  const firedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!enabled || !video) {
      useMirror.getState().setCameraReady(false);
      useMirror.getState().setPresence("empty");
      return;
    }

    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let cancelled = false;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        useMirror.getState().setCameraReady(true);
        useMirror.getState().setCameraError(null);
        timer = window.setInterval(sample, 350);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Camera permission was denied.";
        useMirror.getState().setCameraError(msg);
        useMirror.getState().setCameraReady(false);
      }
    };

    const sample = () => {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return;
      if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
      const canvas = canvasRef.current;
      canvas.width = 64;
      canvas.height = 36;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, 64, 36);
      const next = ctx.getImageData(0, 0, 64, 36).data;
      const score = frameScore(prevRef.current, next);
      prevRef.current = new Uint8ClampedArray(next);

      let mode: Mode = modeRef.current;
      if (score > 14) {
        mode = "motion";
        stillSinceRef.current = 0;
        firedRef.current = false;
      } else if (score > 3.5) {
        if (mode === "motion") {
          if (!stillSinceRef.current) stillSinceRef.current = Date.now();
          if (Date.now() - stillSinceRef.current > 1600) mode = "still";
        } else if (mode === "empty") {
          mode = "still";
        }
      } else if (mode !== "motion") {
        mode = "empty";
        stillSinceRef.current = 0;
        firedRef.current = false;
      }

      if (mode !== modeRef.current) {
        modeRef.current = mode;
        useMirror.getState().setPresence(mode);
      }

      if (
        mode === "still" &&
        !firedRef.current &&
        useMirror.getState().canAutoGlance()
      ) {
        firedRef.current = true;
        const frame = captureJpeg(v);
        void glanceNow({ scenario: "live", imageDataUrl: frame });
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
      prevRef.current = null;
      modeRef.current = "empty";
      useMirror.getState().setCameraReady(false);
      useMirror.getState().setPresence("empty");
    };
  }, [enabled]);

  return (
    <video
      ref={videoRef}
      className="pointer-events-none fixed -left-[9999px] size-px opacity-0"
      playsInline
      muted
      autoPlay
    />
  );
}
