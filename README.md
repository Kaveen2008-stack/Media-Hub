# Video Editor (Pixeldrain + GitHub Actions + Next.js)

Flow: Pixeldrain videos -> edit in browser (live preview) -> Render on GitHub Actions (FFmpeg) -> edited copy uploaded to Pixeldrain.

## Setup
1. Push to a private GitHub repo (root must contain .github/, worker/, web/).
2. Repo secret: PIXELDRAIN_API_KEY  (YT_COOKIES no longer needed)
3. Vercel: Root Directory = web. Env vars:
   GITHUB_TOKEN (Actions: Read and write), GITHUB_REPO, GITHUB_REF=main,
   PIXELDRAIN_API_KEY, DASHBOARD_PASSWORD

## Features
Trim, speed 0.25-4x, aspect crop (9:16/1:1/4:5/16:9), zoom+pan, rotate, flip,
brightness/contrast/saturation/gamma/hue/temperature, B&W/sepia/invert,
blur/sharpen/vignette/grain, fades, text layers, volume/mute, background music
(from your Pixeldrain files), resolution + quality.
