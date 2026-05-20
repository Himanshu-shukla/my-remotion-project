# Local-first AI Instagram reel generator

This app is a local workflow for turning a sample reel into a reusable editable template, then rendering a new 9:16 MP4 with Remotion.

## What works

- Create and reopen local reel projects.
- Upload a sample reel and avatar image.
- Analyze the sample reel with local FFmpeg/FFprobe.
- Extract video metadata, scene cuts, keyframes, and audio.
- Try local Whisper transcription when `whisper` is installed, with a mock fallback when it is not.
- Generate a draft template JSON with caption and avatar placement estimates.
- Review and manually correct scenes, captions, timings, caption boxes, and avatar boxes.
- Generate mock script/subtitle beats.
- Render a final MP4 locally into `public/storage/renders`.

No scraping, auth, payments, cloud storage, or automatic Instagram workflow is included.

## Setup

```bash
npm install
npm run db:init
npm run dev -- -p 3001
```

Open:

```txt
http://localhost:3001
```

FFmpeg and FFprobe are called through Remotion:

```bash
npx remotion ffmpeg
npx remotion ffprobe
```

Optional local Whisper:

```bash
whisper public/storage/projects/<projectId>/audio/source.wav --output_format json --word_timestamps True
```

If `whisper` is not available, analysis still completes with mock transcript segments.

## Workflow

1. Click `Create project`.
2. Upload a sample reel.
3. Click `Analyze sample`.
4. Review metadata, scene count, transcript provider, keyframes, and confidence values.
5. Correct scene durations, captions, caption box values, and avatar box values.
6. Save the template.
7. Generate script/subtitles if desired.
8. Click `Render final video`.
9. Download the MP4 from the render panel.

## Local storage

```txt
storage/projects.json
public/storage/uploads/
public/storage/projects/<projectId>/keyframes/
public/storage/projects/<projectId>/audio/source.wav
public/storage/projects/<projectId>/transcript/
public/storage/projects/<projectId>/analysis.json
public/storage/projects/<projectId>/draft-template.json
public/storage/renders/
```

## Main modules

```txt
packages/video-analyzer/
  metadata.ts        ffprobe metadata
  scene-detect.ts    FFmpeg scene cut timestamps
  frame-extract.ts   per-scene keyframes
  audio-extract.ts   16kHz mono WAV extraction
  transcription.ts   local Whisper with mock fallback
  layout.ts          MVP caption/avatar layout estimates

packages/template-engine/
  manual-template-schema.ts
  template-builder.ts

packages/projects/
  project-store.ts   local JSON project persistence

src/app/api/analyze-video/route.ts
src/app/api/manual-render/route.ts
src/remotion/ReelComposition.tsx
```

## Commands

```bash
npm run dev
npm run db:init
npm run build
npm run lint
npm run render
npm run remotion
```
