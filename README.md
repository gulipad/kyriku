# Kyriku 3D

A 3D Gaussian Splat viewer with a retro CLI aesthetic, documenting [Kyriku](https://kyriku.org/)'s work in Ngozi, Burundi. Built with Next.js and PlayCanvas.

**A project for [Kyriku](https://kyriku.org/), by [Gulipad](https://gulipad.com)**

## Features

- View 3D Gaussian Splats in the browser
- Retro terminal-style boot animation
- Mouse-driven parallax with intro reveal
- English/Spanish language toggle with browser locale detection
- Mobile-friendly with touch parallax, pinch-to-zoom, and double-tap navigation

## Controls

### Desktop
| Key | Action |
|-----|--------|
| `←` `→` | Navigate between splats |
| `+` / `-` | Zoom in / out |
| Scroll | Zoom in / out |

### Mobile
- **Drag** to look around
- **Pinch** to zoom
- **Double tap** to navigate between splats

## Tech Stack

- [Next.js 14](https://nextjs.org/) with App Router
- [PlayCanvas](https://playcanvas.com/) for WebGL rendering
- [@playcanvas/react](https://github.com/playcanvas/react) for React integration
- [SOG format](https://blog.playcanvas.com/playcanvas-open-sources-sog-format-for-gaussian-splatting/) for compressed splats

## Getting Started

```bash
npm install
npm run dev
```

## License

MIT
