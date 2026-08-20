# Grok Mirror

A MagicMirror-style smart mirror with a Grok twist: it can **see what you’re wearing** and tell you when the weather is about to ruin your outfit.

Classic two-way glass, black dashboard, big clock. Then someone walks up in a t-shirt while thunderstorms are three hours out — and the mirror says so.

## The rain walk-up

That’s the feature this is built around.

1. Weather looks fine *right now*.
2. The forecast turns wet later.
3. You stand there dressed for sunshine.
4. Grok glances (camera optional) and tells you to grab a jacket.

Tap **Rain walk-up** to force that scenario even if the real sky is clear — useful while you’re building the frame. Tap **Look** for a live glance using the current forecast (and the camera, if you turn it on).

Frames are sent to Grok for that one glance. They are not stored.

## Run locally

```bash
git clone https://github.com/javajam/new.git grok-mirror
cd grok-mirror
npm install
npm run dev
```

Set `XAI_API_KEY` in the environment for Grok vision and voice. Weather uses the National Weather Service (US) with Open-Meteo as fallback.

## Raspberry Pi kiosk

This is a web app. Easiest path once it’s published: open it full-screen in Chromium.

```bash
chromium-browser --kiosk --app=https://YOUR-APP.grok.me \
  --enable-features=UseOzonePlatform \
  --ozone-platform=wayland \
  --password-store=basic
```

On X11, drop the Ozone flags. Autostart that command from `~/.config/autostart/` or from MagicMirror’s usual boot scripts.

In **Settings**:

- Set the city to wherever the mirror actually lives
- Turn **Camera** on so walk-ups can glance automatically
- Leave **Voice** on if you want the line spoken

The Pi needs a camera module or USB webcam, and the kiosk user must be in the `video` group.

## Privacy

- Camera is **off** until you enable it
- A small rec dot appears at the top while the camera is live
- Images are not written to disk; they are used for a single Grok request
- Auto-glance waits until someone stands still, then cools down for a few minutes

## Stack

React, TanStack Start, National Weather Service / Open-Meteo, xAI Grok for vision + voice.
