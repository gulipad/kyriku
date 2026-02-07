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
    {
      "title": "Scene Name",
      "date": "2024-01-01",
      "town": "Location",
      "coordinates": [lat, lng],
      "description": "English description",
      "descriptionEs": "Spanish description",
      "splatFile": "filename.sog",
      "fov": 14,
      "cameraPosition": [x, y, z],
      "focusPoint": [x, y, z],
      "parallaxAmount": { "yaw": 8, "pitch": 4 }
    }
  ],
  "settings": {
    "fov": 50,
    "parallaxAmount": { "yaw": 8, "pitch": 4 }
  }
}
```

Place `.sog` splat files in `public/splats/`.

### Path Aliases
- `@/*` maps to `./src/*`

## Splat Pipeline (Image → Loaded Splat)

Use this workflow to convert a photograph into a Gaussian splat and add it to the site.

### Prerequisites

- **ml-sharp**: Cloned locally. Path configured in `.pipeline.config.json` (see setup below)
- **Node.js/npx**: For the PlayCanvas splat-transform tool

### Setup

Copy the example config and set your local ml-sharp path:

```bash
cp .pipeline.config.example.json .pipeline.config.json
```

Then edit `.pipeline.config.json` with your local path. This file is gitignored.

### Steps

Given an input image (e.g. `~/photos/scene.jpg`) and a chosen name (e.g. `scene`):

#### 0. Convert HEIC to JPEG (if needed)

SHARP expects JPEG or PNG input. If the image is HEIC (common on iPhone):

```bash
sips -s format jpeg {input_image} --out /tmp/{name}.jpg
```

Use the converted JPEG as the input for the next step.

#### 1. Generate Gaussians with SHARP

Read `sharpPath` from `.pipeline.config.json`, then:

```bash
cd {sharpPath}
sharp predict -i {input_image_absolute_path} -o /tmp/sharp-output/
```

Run this from the ml-sharp directory (the `sharp` CLI depends on being run from within the repo). Use absolute paths for the input image and output directory.

This produces a `.ply` file at `/tmp/sharp-output/output.ply`.

#### 2. Convert to SOG format

```bash
npx @playcanvas/splat-transform /tmp/sharp-output/output.ply public/splats/{name}.sog -H 0
```

- `-H 0` strips all spherical harmonic bands (band 0 only = diffuse color), keeping file size small
- The tool handles Morton ordering and compression automatically

#### 3. Add config entry

Add an entry to `public/splats/config.json` in the `splats` array. Use these defaults as a starting point:

```json
{
  "title": "{Name}",
  "date": "{YYYY-MM-DD}",
  "town": "",
  "coordinates": [0, 0],
  "description": "",
  "descriptionEs": "",
  "splatFile": "{name}.sog",
  "fov": 14,
  "cameraPosition": [0, -0.1, 1.5],
  "focusPoint": [0, -0.1, -1.5],
  "parallaxAmount": { "yaw": 8, "pitch": 4 }
}
```

The `cameraPosition` and `focusPoint` will likely need tuning after visual inspection. Run `npm run dev` to preview and adjust.

#### 4. Clean up

```bash
rm -rf /tmp/sharp-output/
```

### Notes

- SHARP outputs in OpenCV coordinates; the app's coordinate transform (`src/lib/coordinates.ts`) handles conversion to Three.js space automatically
- `.sog` files go in `public/splats/` and are served statically — they're not checked into git if large (use Git LFS or deploy separately)
- The `zoomRange` field is optional — only add it if the default zoom feels wrong
