export type Point = { x: number; y: number; z?: number };
export interface Hand {
  side: "Left" | "Right";
  points: Point[];
  score: number;
}
export type Pose = "none" | "open" | "fist" | "victory" | "pinch";
export type Command = {
  move: number;
  turn: number;
  jump: boolean;
  charge: boolean;
  cast: boolean;
  shield: boolean;
  grab: boolean;
};
export const neutral = (): Command => ({
  move: 0,
  turn: 0,
  jump: false,
  charge: false,
  cast: false,
  shield: false,
  grab: false,
});
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function classify(p: Point[]): Pose {
  if (p.length !== 21) return "none";
  const extended = [8, 12, 16, 20].map(
    (t) => distance(p[t], p[0]) > distance(p[t - 2], p[0]) * 1.18,
  );
  if (
    extended.slice(1).some(Boolean) &&
    distance(p[4], p[8]) < Math.max(0.01, distance(p[0], p[9])) * 0.42
  )
    return "pinch";
  if (extended.every(Boolean)) return "open";
  if (extended[0] && extended[1] && !extended[2] && !extended[3])
    return "victory";
  if (extended.every((v) => !v)) return "fist";
  if (distance(p[4], p[8]) < Math.max(0.01, distance(p[0], p[9])) * 0.42)
    return "pinch";
  return "none";
}
export function resolveHands(hands: Hand[]): Hand[] {
  const valid = hands
    .filter(
      (h) =>
        Number.isFinite(h.score) &&
        h.points.length === 21 &&
        h.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
    )
    .slice(0, 2);
  if (valid.length !== 2 || valid[0].side !== valid[1].side) return valid;
  const [left, right] = [...valid].sort(
    (a, b) => b.points[9].x - a.points[9].x,
  );
  return [
    { ...left, side: "Left" },
    { ...right, side: "Right" },
  ];
}
export class GestureController {
  center = { x: 0.5, y: 0.5 };
  sensitivity = 2;
  pose: Pose = "none";
  private candidate: Pose = "none";
  private since = 0;
  private stable: Pose = "none";
  private charged = false;
  calibrate(hands: Hand[]) {
    const l = resolveHands(hands).find((h) => h.side === "Left");
    if (l) this.center = { x: 1 - l.points[9].x, y: l.points[9].y };
    this.reset();
  }
  reset() {
    this.pose = this.candidate = this.stable = "none";
    this.since = 0;
    this.charged = false;
  }
  update(hands: Hand[], now: number): Command {
    const pair = resolveHands(hands);
    const l = pair.find((h) => h.side === "Left"),
      r = pair.find((h) => h.side === "Right");
    if (!l || !r) {
      this.reset();
      return neutral();
    }
    const command = neutral();
    const threshold = 0.07 / this.sensitivity;
    const axis = (v: number) =>
      Math.abs(v) <= threshold
        ? 0
        : Math.sign(v) * Math.min(1, (Math.abs(v) - threshold) / 0.045 + 0.35);
    if (classify(l.points) !== "fist") {
      command.turn = axis(1 - l.points[9].x - this.center.x);
      command.move = axis(this.center.y - l.points[9].y);
    }
    this.pose = classify(r.points);
    if (this.pose !== this.candidate) {
      this.candidate = this.pose;
      this.since = now;
    }
    if (now - this.since >= 120 && this.stable !== this.candidate) {
      const previous = this.stable;
      this.stable = this.candidate;
      command.cast =
        this.charged && previous === "fist" && this.stable === "open";
      if (this.stable !== "fist") this.charged = false;
      command.grab = this.stable === "pinch";
    }
    command.charge = this.stable === "fist";
    if (command.charge) this.charged = true;
    command.jump = this.pose === "victory" && this.stable === "victory";
    command.shield =
      this.pose === "open" && this.stable === "open" && !command.cast;
    return command;
  }
}
