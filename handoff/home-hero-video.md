# Home Hero Video Handoff

## Change

The home page hero now uses `assets/home-hero.mp4` as a looping background video instead of the remote stock image.

## Video treatment

- Source: `/Users/hyunwoo/Downloads/0813 (2)(1).mov`
- Output: 960x540 H.264 MP4
- Duration: approximately 110 seconds
- Audio: removed
- Visual treatment: light Gaussian blur applied during encoding, plus a subtle CSS blur and scale to avoid edge artifacts
- File size: approximately 5 MB
- Poster frame: `assets/home-hero-poster.jpg`

## Implementation

- `index.html` adds an autoplaying, muted, looping, inline `<video>` element with a poster fallback.
- `styles.css` positions the video as the hero background and preserves the existing text contrast overlay.

## Verification

The output contains one H.264 video stream at 960x540 and no audio stream. The local browser runtime was unavailable for visual capture, so static references and media metadata were verified instead.
