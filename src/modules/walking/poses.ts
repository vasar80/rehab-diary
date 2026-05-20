/**
 * Seven poses representing one full gait cycle (right heel strike → next right heel strike).
 *
 * Convention for angles:
 *  - hipAngle:      0 = leg points straight down. Positive = leg moves forward (rightward on screen).
 *                                                  Negative = leg moves backward (leftward).
 *  - kneeBend:      0 = leg fully extended. Positive degrees = lower leg flexes backward at the knee
 *                   (the foot rises up and slightly behind the knee — natural for swing phase).
 *  - shoulderAngle: 0 = arm hangs straight down. Positive = arm forward, negative = arm back.
 *  - elbowBend:     positive degrees = forearm bends forward (small, mostly natural swing).
 *
 * The figure walks rightward on the screen.
 * Arms swing opposite to the same-side leg (right leg forward → right arm back).
 */

export type LegPose = {
  hipAngle: number;
  kneeBend: number;
  /**
   * If true, the foot is in the air; otherwise it is grounded on the ground line.
   * Used only for visual hints (we don't reposition automatically — angles do the work).
   */
  airborne?: boolean;
};

export type ArmPose = {
  shoulderAngle: number;
  elbowBend?: number;
};

export type Pose = {
  rightLeg: LegPose;
  leftLeg: LegPose;
  rightArm: ArmPose;
  leftArm: ArmPose;
};

export type FrameId =
  | 'right-strike'
  | 'right-load'
  | 'right-stance'
  | 'right-toe-off'
  | 'left-strike'
  | 'left-load'
  | 'left-stance';

export const POSES: Record<FrameId, Pose> = {
  // 1. Right heel strike — both legs spread apart, right ahead, left behind, both grounded.
  'right-strike': {
    rightLeg: { hipAngle: 26, kneeBend: 4 },
    leftLeg: { hipAngle: -26, kneeBend: 6 },
    rightArm: { shoulderAngle: -22, elbowBend: 12 },
    leftArm: { shoulderAngle: 22, elbowBend: 12 },
  },
  // 2. Right loading response — weight transferring onto right foot, left heel lifting.
  'right-load': {
    rightLeg: { hipAngle: 12, kneeBend: 14 },
    leftLeg: { hipAngle: -22, kneeBend: 18, airborne: true },
    rightArm: { shoulderAngle: -16, elbowBend: 10 },
    leftArm: { shoulderAngle: 16, elbowBend: 10 },
  },
  // 3. Right mid-stance — right leg vertical, left swinging through.
  'right-stance': {
    rightLeg: { hipAngle: 0, kneeBend: 0 },
    leftLeg: { hipAngle: -8, kneeBend: 58, airborne: true },
    rightArm: { shoulderAngle: -6, elbowBend: 8 },
    leftArm: { shoulderAngle: 6, elbowBend: 8 },
  },
  // 4. Right terminal stance — right hip extending back, left swinging forward.
  'right-toe-off': {
    rightLeg: { hipAngle: -16, kneeBend: 12 },
    leftLeg: { hipAngle: 16, kneeBend: 30, airborne: true },
    rightArm: { shoulderAngle: 16, elbowBend: 10 },
    leftArm: { shoulderAngle: -16, elbowBend: 10 },
  },
  // 5. Left heel strike — mirror of frame 1.
  'left-strike': {
    rightLeg: { hipAngle: -26, kneeBend: 6 },
    leftLeg: { hipAngle: 26, kneeBend: 4 },
    rightArm: { shoulderAngle: 22, elbowBend: 12 },
    leftArm: { shoulderAngle: -22, elbowBend: 12 },
  },
  // 6. Left loading response — mirror of frame 2.
  'left-load': {
    rightLeg: { hipAngle: -22, kneeBend: 18, airborne: true },
    leftLeg: { hipAngle: 12, kneeBend: 14 },
    rightArm: { shoulderAngle: 16, elbowBend: 10 },
    leftArm: { shoulderAngle: -16, elbowBend: 10 },
  },
  // 7. Left mid-stance — mirror of frame 3.
  'left-stance': {
    rightLeg: { hipAngle: -8, kneeBend: 58, airborne: true },
    leftLeg: { hipAngle: 0, kneeBend: 0 },
    rightArm: { shoulderAngle: 6, elbowBend: 8 },
    leftArm: { shoulderAngle: -6, elbowBend: 8 },
  },
};

/**
 * Canonical order of frames. Walking right.
 * The user must reorder shuffled cards into this sequence.
 */
export const CANONICAL_ORDER: readonly FrameId[] = [
  'right-strike',
  'right-load',
  'right-stance',
  'right-toe-off',
  'left-strike',
  'left-load',
  'left-stance',
] as const;

export const TOTAL_FRAMES = CANONICAL_ORDER.length;
