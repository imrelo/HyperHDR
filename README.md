![MIT](https://img.shields.io/badge/License-MIT-brightgreen) ![C++20](https://img.shields.io/badge/Language-C%2B%2B20-blue) ![CMake](https://img.shields.io/badge/Build%20System-CMake-orange) ![DirectX](https://img.shields.io/badge/DirectX-supported-lightblue) ![Fork](https://img.shields.io/badge/status-personal%20fork-yellow)

# HyperHDR — imrelo fork

This is a personal fork of **[HyperHDR](https://github.com/awawa-dev/HyperHDR)**,
an open-source ambient lighting system created and maintained by
**[awawa-dev](https://github.com/awawa-dev)**.

Effectively all of the software is upstream's work. This fork adds the two
things described below and changes nothing else. If you want HyperHDR itself,
go to the upstream project — it is the one that is released, signed, packaged
and supported.

---

## What this fork adds

> Both additions live on the branch
> **[`imrelo/screen-capture-monitor-multiselect`](https://github.com/imrelo/HyperHDR/tree/imrelo/screen-capture-monitor-multiselect)**,
> not on `master`. Apart from this README, `master` tracks upstream unchanged,
> so merging in new upstream work stays as close to trivial as possible.

### 1. Pick and order the monitors the screen grabber captures

Upstream's software screen grabber captures either one display or every display
at once, and its `reorder_displays` option only cycles blindly through
permutations until one happens to look right.

This fork adds a **`monitorOrder`** setting to the system grabber, so you can:

* capture an arbitrary **subset** of your displays — for example only 1 and 3 out
  of 3 — instead of all-or-one
* put them in an **explicit order**, chosen from a list, rather than guessing at
  permutations
* keep a display in your saved order while it is unplugged; it is shown as
  unavailable and skipped until it comes back

When a selection is present the old blind `reorder_displays` permutation is
ignored, and a log line says so, since the two would otherwise fight each other.

Configure it under **Configuration → Software Screen Capture**, next to the
device selector. It only appears in multi-monitor mode, since it means nothing
otherwise.

Implementation: `monitorOrder` in the grabber schema, plumbed through
`Grabber` / `SystemWrapper`, and applied in `DxGrabber` where displays are
enumerated and ordered.

### 2. Remix Ambilight — a browser extension

[`contrib/youtube-remix-ambilight/`](https://github.com/imrelo/HyperHDR/tree/imrelo/screen-capture-monitor-multiselect/contrib/youtube-remix-ambilight)

A Manifest V3 extension that reads frames straight from YouTube's `<video>`
element and pushes them into HyperHDR over the JSON-RPC `image` command — but
only while a **remix track** is actually playing.

* Lights follow the music in a **background tab**, so you can work in another
  window without the video on screen
* Gated on the track being a remix, genuinely playing, and not muted; pause it
  and the LEDs release
* Reads the video element rather than the screen, so YouTube's own interface
  never reaches your lights
* Asks for almost nothing: one `storage` permission, one localhost host
  permission, and access to YouTube. No tab access, no screen capture, no
  remote code

See its [README](https://github.com/imrelo/HyperHDR/blob/imrelo/screen-capture-monitor-multiselect/contrib/youtube-remix-ambilight/README.md) for setup and for the
reasoning behind the design.

---

## About HyperHDR

HyperHDR analyses video and audio in real time to drive LED lighting for TVs and
music setups, with a focus on stability, low CPU usage and high-fidelity colour.
It runs on Windows, macOS (x64 and arm64) and Linux (x64 and ARM, including
Raspberry Pi), supports USB grabbers and hardware-accelerated screen capture,
handles SDR and HDR content with automatic tone mapping, and works with a wide
range of LED hardware.

For the full and current feature list, see the
[upstream README](https://github.com/awawa-dev/HyperHDR#readme).

## Downloads

**This fork** has no releases. Builds come from GitHub Actions on this
repository, and those installers are **not code-signed** — Windows SmartScreen
will warn about them. Build them yourself, or take them from the Actions tab.

**For official, signed releases, use upstream:**
[github.com/awawa-dev/HyperHDR/releases](https://github.com/awawa-dev/HyperHDR/releases)

Upstream also maintains a Linux repository at
[awawa-dev.github.io](https://awawa-dev.github.io/).

## Documentation and support

Documentation and community support belong to the upstream project. Please do
not take questions about HyperHDR itself to this fork.

* [Wiki](https://wiki.hyperhdr.eu/)
* [Compiling from source](https://awawa-dev.github.io/wiki/Compiling-HyperHDR.html)
* [Support forum](https://github.com/awawa-dev/HyperHDR/discussions)

Issues with the two additions listed above are the exception — those belong here.

## Credits

HyperHDR is created and maintained by
[awawa-dev](https://github.com/awawa-dev) and its contributors.
Copyright © 2020-2026 awawa-dev. All credit for the software belongs to them.

## Licence

MIT, unchanged from upstream. See [LICENSE](LICENSE).

The MIT licence permits modification and redistribution provided the copyright
notice and licence text are preserved, which they are.
