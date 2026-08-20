export function captureJpeg(
  video: HTMLVideoElement,
  maxWidth = 640,
  quality = 0.62,
): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const w = Math.max(1, Math.round(video.videoWidth * scale));
  const h = Math.max(1, Math.round(video.videoHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export function frameScore(
  prev: Uint8ClampedArray | null,
  next: Uint8ClampedArray,
): number {
  if (!prev || prev.length !== next.length) return 0;
  let acc = 0;
  let n = 0;
  for (let i = 0; i < next.length; i += 48) {
    acc +=
      Math.abs(next[i] - prev[i]) +
      Math.abs(next[i + 1] - prev[i + 1]) +
      Math.abs(next[i + 2] - prev[i + 2]);
    n += 1;
  }
  return n ? acc / n / 3 : 0;
}
