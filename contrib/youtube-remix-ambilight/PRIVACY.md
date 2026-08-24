# Privacy Policy — Remix Ambilight

Last updated: 2026-08-25

## Summary

Remix Ambilight does not collect, transmit, store or sell any personal
information. Nothing it reads ever leaves your computer.

## What the extension accesses

**Video frames on YouTube.** While enabled, and only while a video whose title
matches the extension's remix keyword list is actually playing, the extension
draws the current frame of the page's `<video>` element onto an off-screen
canvas and reduces it to a 480×270 JPEG.

**The page title.** Used solely to decide whether the current track counts as a
remix. It is compared against a fixed keyword list built into the extension and
is never stored or sent anywhere.

**Playback state.** Whether the video is paused, ended, or muted — used solely to
decide whether the LEDs should be lit.

The extension runs only on `www.youtube.com` and `music.youtube.com`. It has no
access to any other site.

## Where that data goes

Frames are sent to `localhost:8090`, which is the HyperHDR service running on
your own machine, over a connection that never leaves the loopback interface.

There is no remote server. The extension contacts no third party, includes no
analytics, no telemetry, no advertising, and no tracking of any kind. It contains
no remotely hosted code.

## What is stored

A single boolean flag in `chrome.storage.local` recording whether you have
switched the extension off. That is the entirety of its persistent state. It
stays on your device and is never transmitted.

No video frame is ever written to disk. Frames exist only in memory long enough
to be forwarded to HyperHDR, and are then discarded.

## Permissions and why they exist

| Permission | Why |
|---|---|
| `storage` | Remember the on/off toggle across browser restarts |
| `host_permissions: http://localhost:8090/*` | Reach the HyperHDR service on your own machine |
| Content script on YouTube | Read the video frame that drives the LEDs |

The extension deliberately requests no `tabs`, no `activeTab`, no `tabCapture`,
no `scripting` and no broad host permissions.

## Children

The extension is not directed at children and collects no data from anyone.

## Changes

Any future change to this policy will be committed to this repository alongside
the version of the extension it applies to.

## Contact

Please open an issue on the repository that hosts this extension.
