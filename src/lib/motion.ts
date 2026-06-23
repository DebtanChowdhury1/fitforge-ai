import { Easing } from 'react-native';

// Spring configs — use these everywhere, never raw numbers
export const SPRING = {
  GENTLE:  { mass: 1,   damping: 20, stiffness: 150 },
  SNAPPY:  { mass: 0.6, damping: 14, stiffness: 260 },
  BOUNCY:  { mass: 1,   damping: 10, stiffness: 200 },
  RIGID:   { mass: 0.4, damping: 20, stiffness: 400 },
  WOBBLY:  { mass: 1.2, damping: 8,  stiffness: 180 },
} as const;

// Timing presets
export const DURATION = {
  INSTANT:  80,
  FAST:    150,
  NORMAL:  300,
  SLOW:    500,
  CINEMATIC: 800,
} as const;

export const EASING = {
  OUT_EXPO: Easing.bezier(0.16, 1, 0.3, 1),
  OUT_QUART: Easing.bezier(0.25, 1, 0.5, 1),
  IN_OUT: Easing.bezier(0.45, 0, 0.55, 1),
} as const;

// Stagger delay per index
export const staggerDelay = (index: number, base = 60) => index * base;
