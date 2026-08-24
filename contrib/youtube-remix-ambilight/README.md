# YouTube Remix Ambilight

A Manifest V3 browser extension that reads pixels straight from YouTube's
`<video>` element and pushes them into HyperHDR — but only while a remix track
is actually playing.

The point is to keep music running in a background tab, work in another window,
and still have the LEDs follow the video. The YouTube tab never has to be on
screen.

## Install

1. Open `edge://extensions` (or `chrome://extensions`) and turn on **Developer mode**
2. Click **Load unpacked** and select this directory
3. Done. The extension is **enabled by default** — there is nothing to click.

Click the toolbar icon to toggle it off and back on. A green `ON` badge means it
is running.

There is nothing else to configure. HyperHDR serves its web API on port `8090`
with `localApiAuth` defaulting to `false`, so requests from localhost need no token.

On Windows, `install.ps1` copies the extension to a stable location first and
opens the extensions page for you. This matters more than it sounds — see
[Keeping it installed](#keeping-it-installed).

## Configuration

Everything lives at the top of `content.js` and `background.js`.

| Constant | File | Default | Notes |
|---|---|---|---|
| `WIDTH` / `HEIGHT` | content.js | 480×270 | See [Choosing a resolution](#choosing-a-resolution) |
| `FPS` | content.js | 15 | Drop to 10 if the CPU runs hot |
| `JPEG_QUALITY` | content.js | 0.5 | |
| `REMIX` | content.js | (keyword list) | What counts as a remix |
| `TARGET_INSTANCES` | background.js | `[0, 1]` | Which HyperHDR instances receive frames |
| `PRIORITY` | background.js | 50 | Lower wins; the screen grabber sits at 245 |
| `DURATION` | background.js | 2000 | ms — stop sending and the LEDs release after this |

## When the LEDs run

All four conditions must hold. They are checked in `gate()` in `content.js`:

1. The page title matches `REMIX`
2. The video is genuinely playing — `!paused && !ended && readyState >= 2`
3. Nothing is muted — `!muted && volume > 0`
4. The tab is on YouTube (the content script only injects there)

Titles are stripped of diacritics before matching, so an unaccented keyword
covers every spelling: `viet mix` matches both "Việt Mix" and "Viet Mix", and
`sap san` matches "Sập Sàn".

## How it works

```
content.js  (auto-injected on every youtube.com load)
   ├── locate <video>, check the four conditions above
   ├── drawImage(video) → canvas 480×270 → toDataURL JPEG
   └── sendMessage ──→ background.js ──WebSocket──→ HyperHDR
```

Five decisions are worth recording, because each one came from something that
was tried and broke.

**A content script instead of `chrome.tabCapture`.** `tabCapture` sits behind the
`activeTab` permission, and Chrome revokes `activeTab` on every navigation —
including an ordinary refresh. Pressing F5 silently killed capture and required
clicking the toolbar icon again. A content script re-injects on every page load,
so it simply cannot suffer from this. As a bonus, `drawImage(video)` draws the
video element itself, so YouTube's header, sidebar and comments never enter the
frame and there is no crop geometry to compute.

**Why the pixels are readable at all.** YouTube plays through Media Source
Extensions, with a `blob:https://www.youtube.com/...` URL minted by the page
itself. A blob URL created by the page is same-origin, so it does not taint the
canvas. If a progressive cross-origin stream ever shows up instead, `toDataURL`
throws `SecurityError`, which the code catches and reports rather than dying
silently.

**The WebSocket lives in the service worker.** A content script is bound by the
page's Content Security Policy, and YouTube blocks `connect-src` to localhost.
The service worker is an extension context and is not subject to that policy.

**WebSocket rather than `fetch`.** HyperHDR's JSON-RPC `image` command has no
`instance` parameter. The target instance is *per-connection state*, set with
`instance/switchTo` and defaulting to 0. Every `fetch` opens a fresh connection,
so `switchTo` never survives and every frame lands on instance 0. The fix is one
durable socket per target instance, switched once on open, with frames sent only
after the server confirms.

**Two frame clocks running in parallel, deliberately.** Chrome clamps
`setInterval` to 1 Hz in hidden tabs. `requestVideoFrameCallback` fires once per
decoded video frame and never goes through a timer, so it escapes that clamp.
Both call `tick()`, which rate-limits itself to `FPS`.

## Choosing a resolution

Do not guess — derive it from the actual LED layout. Fetch `serverinfo` and find
the narrowest LED zone:

```js
for (const l of info.leds) minW = Math.min(minW, l.hmax - l.hmin);
```

On a 197-LED strip the narrowest zone spans **0.5% of the image width**:

| Resolution | px per LED zone | |
|---|---|---|
| 96×54 | 0.48 | several LEDs share one pixel column |
| 192×108 | 0.96 | still under a single pixel |
| 480×270 | 2.40 | first size where averaging means something |

The vertical axis is usually comfortable (the narrowest zone is around 14% of
image height), so width is the binding constraint.

**JPEG rather than raw RGB.** At 480×270 raw RGB is roughly 518 KB of base64 per
frame — about 15 MB/s across two instances — while JPEG lands near 30–50 KB. The
larger win is CPU: `toDataURL` encodes natively and removes `getImageData`
entirely, and that GPU-to-CPU readback was the most expensive step in the chain.
HyperHDR decodes the result through `stbi_load_from_memory` via `format: "auto"`.

## Keeping it installed

A common question: IDM asks to install its extension every time the browser
starts — can this do the same?

It can, but **only once the extension is published to a store**. The mechanism
IDM uses is Chrome's *External Extensions* registry key:

```
HKLM\Software\Wow6432Node\Google\Chrome\Extensions\<extension-id>
    update_url = https://clients2.google.com/service/update2/crx
```

The critical detail is that `update_url` must point at the Chrome Web Store.
Since Chrome 33, Windows refuses off-store installs through this path — point it
at a local `.crx` and Chrome installs it, then immediately disables it with a
"not from the Chrome Web Store" warning. IDM does not install silently either;
it only prompts, and the user still has to accept.

The one route that installs without a store is enterprise policy:

```
HKCU\Software\Policies\Microsoft\Edge\ExtensionSettings
    <extension-id> = {"installation_mode":"force_installed","update_url":"..."}
```

This does accept a self-hosted update URL, but it requires packing a `.crx`,
generating a signing key, and publishing an update manifest — and in exchange the
user can no longer remove the extension. That is far too heavy for a personal tool.

In practice **Load unpacked is a one-time step** and survives every browser
restart. The only thing that undoes it is the source directory being deleted,
renamed or moved — which is exactly why `install.ps1` copies the extension to
`%LOCALAPPDATA%` first, so it is independent of this repository.

The remaining annoyance is the "Disable developer mode extensions" prompt on
browser startup. Only two things silence it for good: publishing to a store, or
the policy above.

## Troubleshooting

The **YouTube page console** (F12) carries `[HyperHDR-CS]`.
The service worker console (`edge://extensions` → *service worker*) carries `[HyperHDR-BG]`.

| Symptom | Usual cause |
|---|---|
| `--- BLOCKED: ...` | The log names the condition that failed |
| `canvas is tainted` | A cross-origin progressive stream; pixels are unreadable |
| No `instance N ready` | HyperHDR is not running, or the port is wrong |
| Log says frames were sent but nothing changes | Wrong instance — check `TARGET_INSTANCES` |

To confirm HyperHDR is receiving anything, independently of the extension:

```bash
curl -s -X POST http://localhost:8090/json-rpc -d '{"command":"serverinfo"}' \
  | grep -A3 priorities
```

`50 | IMAGE | RemixExt` should appear above `245 | SYSTEMGRABBER`.

## Known limitations

**Chrome may suspend video decoding in hidden tabs** to save power.
`requestVideoFrameCallback` is the best available defence, but if the decoder
stops entirely there is no frame in existence to read. If that happens, the right
direction is the Web Audio API — `createMediaElementSource` plus an
`AnalyserNode`, driving the LEDs from the audio spectrum instead of pixels. Audio
is never throttled in background tabs, so it sidesteps this whole class of problem.

**YouTube only.** Add more sites by extending `matches` in `manifest.json`.

## Files

```
manifest.json        MV3 manifest
content.js           runs inside the YouTube page: gating + frame capture
background.js        service worker: WebSocket transport to HyperHDR
icons/               generated icon set
tools/gen-icons.js   regenerates icons/ — no dependencies
install.ps1          copies to a stable location, opens the extensions page
PRIVACY.md           privacy policy (required for store submission)
STORE.md             listing copy, permission justifications, checklist
```

## Publishing

See `STORE.md`. It holds the listing text, the per-permission justifications the
dashboards ask for, the data-usage answers, and the outstanding items.

Two things to settle before submitting: `TARGET_INSTANCES` defaults to `[0, 1]`,
which matches this repository's author rather than a general audience, and the
listing still needs a screenshot.

Edge Add-ons is the easier target — it is free, whereas Chrome charges a one-time
$5 developer registration.

## Licence

Same licence as HyperHDR.

Not affiliated with or endorsed by the HyperHDR project.
