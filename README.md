# Focuscut

Open-source screen recordings with zooms that follow the action.

Record your screen or drop a video. Click where the viewer should look. Export a WebM from the browser. The file never uploads.

**Use it:** [louaeismail.github.io/focuscut](https://louaeismail.github.io/focuscut)

This is not CapCut. [OpenCut](https://github.com/OpenCut-app/OpenCut) already is. Focuscut is the other job: make a demo that zooms like [Cursorful](https://cursorful.com/) / Screen Studio, locally, for free.

## What it does

- Record the tab or screen from the browser
- Or drop an existing video
- Click the preview to plant a zoom
- Padding, rounded screen, backgrounds, 16:9 / 9:16 / 1:1
- Export WebM on-device

## Run locally

```bash
npm install
npm run dev
```

Requires a Chromium browser for screen recording (`getDisplayMedia`).

## Keyboard

| Key | Action |
| --- | --- |
| Space | Play / pause |
| Z | Zoom at the center |
| Click | Zoom at the cursor |
| ← → | Skip 1s |
| Delete | Remove selected zoom |

## Why this exists

People already have a video editor. What they still pay Screen Studio and Cursorful for is *focus*: the frame should follow the click. Focuscut is that piece, open source, no account.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues labeled `good first issue` are scoped.

## License

MIT
