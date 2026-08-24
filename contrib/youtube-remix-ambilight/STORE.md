# Store submission notes

Everything needed to publish Remix Ambilight to the Chrome Web Store or Edge
Add-ons, in the wording the dashboards ask for.

**Publish to Edge Add-ons first.** It is free, whereas Chrome charges a one-time
$5 developer registration. If the extension is only ever used on Edge, Chrome
submission can be skipped entirely.

## Listing copy

**Name:** `Remix Ambilight`

Deliberately not "HyperHDR something". Putting another project's name in the
title reads as an official integration and is a common rejection reason. The
description states the HyperHDR connection plainly instead, which is allowed as a
factual compatibility statement.

**Short description** (132 char limit):

> Drives your ambient LED strip from the YouTube video you are playing, but only while a remix track is on.

**Detailed description:**

> Remix Ambilight turns your ambient LED strip into an extension of whatever
> music video you are watching — and knows when to stay out of the way.
>
> It reads each frame directly from the YouTube player and forwards it to
> HyperHDR running on your own machine, so the lights behind your monitor or desk
> follow the video in real time. Nothing is sent over the internet.
>
> What makes it different from an ordinary screen grabber:
>
> • It only lights up for remix tracks. Titles are matched against a keyword list
>   covering remix, bootleg, mashup, nightcore, phonk, hardstyle, vinahouse and
>   many more, with accents stripped so both accented and unaccented spellings
>   are recognised.
> • It follows playback. Pause the track, mute the tab, or switch to a
>   non-remix song and the LEDs release immediately.
> • It reads the video element, not the screen. YouTube's header, sidebar and
>   comments never reach your lights, and the tab does not have to be visible.
> • It asks for almost nothing: one storage permission, one localhost host
>   permission, and access to YouTube. No tab access, no screen capture, no
>   remote code.
>
> Requires HyperHDR running locally with its web API on port 8090 (the default).
>
> Not affiliated with or endorsed by the HyperHDR project.

**Category:** Entertainment
**Language:** English

## Single purpose statement

> The extension has one purpose: to send the currently playing YouTube video's
> frames to a locally running HyperHDR instance so that ambient LED lighting can
> follow the video, gated so that it only does so for remix music tracks.

## Permission justifications

Each dashboard field, ready to paste.

**`storage`**

> Stores a single boolean recording whether the user has switched the extension
> off, so the choice survives a browser restart. No other data is persisted.

**`host_permissions: http://localhost:8090/*`**

> HyperHDR is LED controller software that runs on the user's own computer and
> exposes a JSON-RPC API on port 8090. The extension connects to it over loopback
> to deliver video frames. This address is not a remote server and no data leaves
> the user's machine.

**Content script on `www.youtube.com` and `music.youtube.com`**

> The extension reads the current frame of the page's video element, along with
> the page title and playback state, to decide whether the LEDs should be lit and
> what colour they should show. These are the only sites the extension runs on,
> and no page data is stored or transmitted anywhere except to the user's own
> local HyperHDR service.

**Remote code:** No. All code is contained in the package.

## Data usage disclosures

Answer **No** to every collection category — personally identifiable
information, health, financial, authentication, personal communications,
location, web history, and user activity. The extension collects none of them.

Tick all three certifications:

- Data is not sold to third parties
- Data is not used for purposes unrelated to the single purpose
- Data is not used to determine creditworthiness or for lending

Privacy policy URL: link to `PRIVACY.md` in the hosting repository.

## Assets

| Asset | Requirement | Status |
|---|---|---|
| Icon 128×128 | Required | `icons/icon128.png` |
| Icons 16/32/48 | Used in-browser | present |
| Screenshot | At least one, 1280×800 or 640×400 | **to capture** |
| Small promo tile 440×280 | Optional | not made |

Regenerate icons with `node tools/gen-icons.js`.

Suggested screenshot: HyperHDR's Live Video panel showing the YouTube frame
alongside the priority list with `50 | IMAGE | RemixExt` sitting above
`245 | SYSTEMGRABBER`. That single image shows the whole point of the extension.

## Before submitting

- [ ] Capture at least one screenshot
- [ ] Publish `PRIVACY.md` at a stable public URL
- [ ] Review `TARGET_INSTANCES` in `background.js` — it defaults to `[0, 1]`,
      which suits this repository's author but not a general audience. Ship `[0]`,
      or add an options page so users can choose.
- [ ] Consider whether the Vietnamese-specific keywords in `REMIX` should stay
      for a global listing. They are harmless, and genuinely useful for that
      audience, but worth a deliberate decision.
- [ ] Bump `version` in `manifest.json`

## Known review friction

**Cleartext localhost.** Reviewers sometimes query plain `http://` endpoints. The
justification above states the case: loopback to local hardware control software.
Precedent exists — several ambient-lighting extensions on both stores work the
same way.

**Reading video content.** Legitimate and long-established for this category, but
the description should stay explicit that frames go only to the user's own
machine, since that is the reviewer's actual concern.
