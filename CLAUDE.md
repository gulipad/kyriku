# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `npm run dev`
- **Build**: `npm run build`
- **Start production**: `npm run start`
- **Lint**: `npm run lint`

## Architecture

This is a Next.js 14 application that displays 3D Gaussian splats (.sog files) with a mouse-driven parallax effect.

### Core Technologies
- **Next.js 14** with App Router (TypeScript)
- **PlayCanvas** (`@playcanvas/react`) for WebGL rendering
- **Spark.js** (`@sparkjsdev/spark`) for Gaussian splat rendering

### Key Components

**SplatViewer** (`src/components/SplatViewer/`)
- Main viewer component using PlayCanvas React
- Uses dynamic import with `ssr: false` since PlayCanvas requires browser APIs
- Loads splats via `useSplat()` hook, renders with `<GSplat>`

**Parallax** (`useParallax.ts`)
- Creates parallax effect by orbiting the camera around a focus point based on mouse position
- Mouse position maps to yaw/pitch offsets, smoothed with exponential decay
- Runs on `requestAnimationFrame`

**Coordinate Transform**
- OpenCV-to-PlayCanvas conversion handled by rotating the splat entity `[180, 0, 0]`
- No separate transform file; applied inline in `SplatViewer.tsx`

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

#### 1. Extract GPS coordinates

Extract GPS coordinates from the original image's EXIF data (run on the original, not the SHARP output):

```bash
node -e "require('exifr').gps('{input_image_absolute_path}').then(g => g ? console.log(JSON.stringify([g.latitude, g.longitude])) : console.log('No GPS data found'))"
```

Save the `[lat, lng]` output for use in the config entry (step 4). `exifr` can read HEIC files directly, so run this on the original image before any conversion. If no GPS data is found, use `[0, 0]` as a placeholder.

#### 2. Generate Gaussians with SHARP

Read `sharpPath` from `.pipeline.config.json`, then:

```bash
cd {sharpPath}
sharp predict -i {input_image_absolute_path} -o /tmp/sharp-output/
```

Run this from the ml-sharp directory (the `sharp` CLI depends on being run from within the repo). Use absolute paths for the input image and output directory.

This produces a `.ply` file at `/tmp/sharp-output/output.ply`.

#### 3. Convert to SOG format

```bash
npx @playcanvas/splat-transform /tmp/sharp-output/output.ply public/splats/{name}.sog -H 0
```

- `-H 0` strips all spherical harmonic bands (band 0 only = diffuse color), keeping file size small
- The tool handles Morton ordering and compression automatically

#### 4. Add config entry

Add an entry to `public/splats/config.json` in the `splats` array. Use these defaults as a starting point:

```json
{
  "title": "{Name}",
  "date": "{YYYY-MM-DD}",
  "town": "",
  "coordinates": [{lat}, {lng}],
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

#### 5. Clean up

```bash
rm -rf /tmp/sharp-output/
```

### Notes

- SHARP outputs in OpenCV coordinates; the app converts to PlayCanvas space via a `[180, 0, 0]` rotation on the splat entity
- `.sog` files go in `public/splats/` and are served statically — they're not checked into git if large (use Git LFS or deploy separately)
- The `zoomRange` field is optional — only add it if the default zoom feels wrong
