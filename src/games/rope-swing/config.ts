import { Anchor } from "./types";

export const GRAVITY = 1400;
export const ROPE_LENGTH = 150;
export const GRAB_RADIUS = 46;
export const ANCHOR_SPACING_MIN = 210;
export const ANCHOR_SPACING_MAX = 300;
export const ANCHOR_COUNT = 16;
export const FALL_LIMIT = 420; // world units below the anchor baseline before it's a fall
export const TIME_LIMIT = 90;
export const PLAYER_RADIUS = 14;

export function generateAnchors(): Anchor[] {
  const anchors: Anchor[] = [];
  let x = 60;
  let y = 0;
  for (let i = 0; i < ANCHOR_COUNT; i++) {
    anchors.push({ x, y });
    x += ANCHOR_SPACING_MIN + Math.random() * (ANCHOR_SPACING_MAX - ANCHOR_SPACING_MIN);
    y += (Math.random() - 0.5) * 90;
    y = Math.max(-60, Math.min(60, y));
  }
  return anchors;
}

export const COURSE_LENGTH = (ANCHOR_COUNT - 1) * ((ANCHOR_SPACING_MIN + ANCHOR_SPACING_MAX) / 2) + 60;
