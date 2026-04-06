

# Add Dramatic Revive Sound Effect

## Overview
Add a synthesized "revive" sound effect to `useSound.ts` and trigger it when the player uses the Revive button in the Iron Dome game.

## Changes

### 1. `src/hooks/useSound.ts` — Add `playRevive` function
- Dramatic ascending chord with shimmer effect
- Combine a rising sine sweep (200Hz → 1200Hz) with a bright triangle arpeggio ([523, 784, 1047, 1319]) and a soft noise burst for a "magical resurrection" feel
- Duration ~0.8s

### 2. `src/games/iron-dome/IronDomeGame.tsx` — Trigger sound on revive
- Import `playRevive` from `useSound`
- Call `playRevive()` inside `performRevive` when the revive animation starts

