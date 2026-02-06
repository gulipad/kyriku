# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `npm run dev`
- **Build**: `npm run build`
- **Start production**: `npm run start`
- **Lint**: `npm run lint`

## Architecture

This is a Next.js 14 application that displays 3D Gaussian splats (.ply files) with a mouse-driven parallax effect.

### Core Technologies
- **Next.js 14** with App Router (TypeScript)
- **Three.js** for WebGL rendering
- **Spark.js** (sparkjs.dev) for Gaussian splat rendering - loaded dynamically from CDN

### Key Components

**SplatViewer** (`src/components/SplatViewer/`)
- Main viewer component using Three.js
- Uses dynamic import with `ssr: false` since Three.js requires browser APIs
- Manages scene, camera, renderer lifecycle in React refs
- Loads splats via `useSplatLoader` hook which uses Spark.js `SplatMesh`

**Off-Axis Projection** (`useOffAxisCamera.ts`)
- Creates parallax effect by modifying camera's projection matrix based on mouse position
- Uses asymmetric frustum (off-axis projection) rather than moving the camera

**Coordinate Transform** (`src/lib/coordinates.ts`)
- Converts from OpenCV coordinates (y-down, z-forward) to Three.js coordinates (y-up, z-backward)
- Required for splats exported from Apple SHARP

### Configuration

Splats are configured via `public/splats/config.json`:
```json
{
  "splats": [
    { "title": "Scene Name", "date": "2024-01-01", "plyFile": "filename.ply" }
  ],
  "settings": {
    "parallaxIntensity": 0.15,
    "cameraDistance": 3,
    "fov": 50
  }
}
```

Place `.ply` splat files in `public/splats/`.

### Path Aliases
- `@/*` maps to `./src/*`
