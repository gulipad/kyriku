# Splat-O-Rama

A 3D Gaussian Splat viewer with a retro CLI aesthetic. Built with Next.js and PlayCanvas.

**A project for Ana, by Guli**

## Features

- View 3D Gaussian Splats in the browser
- Retro terminal-style interface
- Click and drag to orbit around splats
- Keyboard and touch controls
- Mobile-friendly with compressed SOG format

## Controls

### Desktop
| Key | Action |
|-----|--------|
| `←` `→` | Navigate between splats |
| `W` / `S` | Zoom in / out |
| `Shift` + Drag | Pan |
| `R` | Reset camera |

### Mobile
- **Double tap** to navigate between splats
- **Drag** to orbit
- **Pinch** to zoom

## Tech Stack

- [Next.js 14](https://nextjs.org/) with App Router
- [PlayCanvas](https://playcanvas.com/) for WebGL rendering
- [@playcanvas/react](https://github.com/playcanvas/react) for React integration
- [SOG format](https://blog.playcanvas.com/playcanvas-open-sources-sog-format-for-gaussian-splatting/) for compressed splats

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Adding Splats

1. Export your Gaussian Splat as `.ply` from your preferred tool
2. Convert to `.sog` format using [SuperSplat](https://github.com/playcanvas/supersplat) for better compression and mobile support
3. Place the `.sog` file in `public/splats/`
4. Add an entry to `public/splats/config.json`:

```json
{
  "title": "My Splat",
  "date": "2024-01-01",
  "location": "Somewhere",
  "splatFile": "my-splat.sog",
  "fov": 20,
  "focusPoint": [0, 0, 0]
}
```

## License

MIT
