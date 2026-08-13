# Focuscut

[![CI](https://github.com/LouaeIsmail/focuscut/actions/workflows/ci.yml/badge.svg)](https://github.com/LouaeIsmail/focuscut/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Open-source screen recordings with zooms that follow the action.

**Use it:** [louaeismail.github.io/focuscut](https://louaeismail.github.io/focuscut)

Record or drop a video. Clicks become zooms. Export locally. Nothing uploads. No account.

This is not a CapCut clone. [OpenCut](https://github.com/OpenCut-app/OpenCut) already is. Focuscut is the Screen Studio / [Cursorful](https://cursorful.com/) job: a demo that follows the click.

## Features

- Record a tab or screen at up to 60fps, or drop an existing file
- **End recording** on the page (you do not need the browser’s Stop sharing bar)
- Auto zooms from clicks via the optional [helper extension](extension/README.md)
- Manual zooms: click the preview or press `Z`
- Padding down to 0 (flush, no forced margin)
- Contain or cover, 16:9 / 9:16 / 1:1 / source
- 14 backgrounds, custom color, or a background image
- Corners, border, optional shadow, zoom ease
- Trim in/out
- Export 1080p60, 1440p60, or 4K30 WebM on-device

## Click helper

A website cannot see clicks in other windows. To plant zooms automatically while you record:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → the `extension/` folder in this repo
4. Reload Focuscut and record again

Without the helper, click the preview after recording to aim zooms.

## Run locally

```bash
npm install
npm run dev
```

Chromium is required for screen recording (`getDisplayMedia`).

## Keyboard

| Key | Action |
| --- | --- |
| Space | Play / pause |
| Z | Zoom at the center |
| Click | Zoom at the cursor |
| [ / ] | Set trim in / out |
| ← → | Skip 1s |
| Delete | Remove selected zoom |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues labeled `good first issue` are scoped.

## License

MIT
