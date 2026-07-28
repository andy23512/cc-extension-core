/**
 * Geometry for placing the draggable overlay inside its container.
 *
 * Position is stored normalized (0–1 on each axis) so it survives the container
 * being resized: 0 pins the overlay to the left/top margin, 1 to the
 * right/bottom margin. These helpers convert between that normalized form and
 * pixels, and clamp the wheel-driven opacity — the pure arithmetic that used to
 * live inline (and twice over) in the overlay's drag and resize handlers.
 */

/** The gap kept between the overlay and every edge of its container, in px. */
export const OVERLAY_MARGIN = 8;

const OPACITY_MIN = 0.2;
const OPACITY_MAX = 1;
const OPACITY_STEP = 0.1;

function clamp(value: number, min: number, max: number): number {
  return Math.max(Math.min(value, min === max ? value : max), min);
}

/**
 * The opacity after one wheel notch: scrolling up (negative deltaY) brightens,
 * down dims, each by one step, clamped to the usable range. A zero delta leaves
 * it unchanged.
 */
export function nextOpacityForWheel(opacity: number, deltaY: number): number {
  if (deltaY === 0) {
    return opacity;
  }
  const next = opacity + (deltaY < 0 ? OPACITY_STEP : -OPACITY_STEP);
  return Math.min(Math.max(next, OPACITY_MIN), OPACITY_MAX);
}

/**
 * The normalized (0–1) position of an overlay edge, given its pixel start, its
 * size, and the container size along that axis. The inverse of
 * {@link pixelAxisPosition}. Clamped so a drag past the margin still maps into
 * range.
 */
export function normalizedAxisPosition(
  start: number,
  size: number,
  containerSize: number,
  margin: number = OVERLAY_MARGIN,
): number {
  const max = containerSize - margin - size;
  return clamp((start - margin) / (max - margin), 0, 1);
}

/**
 * The pixel start of an overlay edge, given its normalized (0–1) position, its
 * size, and the container size along that axis. The inverse of
 * {@link normalizedAxisPosition}.
 */
export function pixelAxisPosition(
  normalized: number,
  size: number,
  containerSize: number,
  margin: number = OVERLAY_MARGIN,
): number {
  const max = containerSize - margin - size;
  return margin + (max - margin) * normalized;
}
