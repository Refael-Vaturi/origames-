import { Obstacle } from "./types";

export const RUN_SPEED = 220; // world units/sec
export const GRAVITY = 2600;
export const JUMP_VELOCITY = -820;
export const PLAYER_RADIUS = 22;
export const FLOOR_Y_RATIO = 0.72;
export const COURSE_LENGTH = 3400;
export const TIME_LIMIT = 60;
export const KNOCKBACK_DISTANCE = 90;
export const KNOCK_DURATION = 0.7;
export const INVULN_DURATION = 1.1;

export function generateCourse(): Obstacle[] {
  const obstacles: Obstacle[] = [];
  let x = 420;
  let i = 0;
  while (x < COURSE_LENGTH - 300) {
    if (i % 2 === 0) {
      obstacles.push({ type: "gap", x, width: 70 + Math.random() * 50 });
      x += 260 + Math.random() * 120;
    } else {
      obstacles.push({
        type: "spinner",
        x,
        armLength: 90 + Math.random() * 20,
        speed: (1.4 + Math.random() * 1.2) * (Math.random() < 0.5 ? 1 : -1),
        angle: Math.random() * Math.PI * 2,
      });
      x += 300 + Math.random() * 140;
    }
    i++;
  }
  return obstacles;
}
