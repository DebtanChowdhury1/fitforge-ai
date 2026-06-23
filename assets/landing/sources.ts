/**
 * Landing screen asset swap-point.
 *
 * Drop the rendered video at `assets/landing/landing-demo.mp4`, then change
 * LANDING_VIDEO below from `null` to `require('./landing-demo.mp4')`.
 *
 * While LANDING_VIDEO is null (or if the device fails to play it), the landing
 * screen automatically renders the static hero-image fallback with the same
 * headline overlay — so the app builds and runs RIGHT NOW, before the video
 * exists.
 *
 * Video specs (per design brief):
 *   MP4 / H.264, 9:16 vertical (1080x1920), < 15 MB, muted, scenes 1-4 hard-loop.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const LANDING_VIDEO: number | null = null;
// export const LANDING_VIDEO = require('./landing-demo.mp4');

// Static fallback shown on low-end devices or when the video can't load.
// Swap `landing-hero.png` for a real branded still once you have one.
export const LANDING_HERO = require('./landing-hero.png');
