import { describe, it, expect } from "vitest";
import { Simulation, WORLD, platforms } from "../src/simulation";
import {
  GestureController,
  classify,
  neutral,
  type Hand,
  type Pose,
} from "../src/controls";
function advance(sim: Simulation, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) sim.update(1 / 60);
}
function hands(pose: Pose, x = 0.5, y = 0.5): Hand[] {
  const make = (kind: Pose, hx: number, hy: number) => {
    const points = Array.from({ length: 21 }, () => ({ x: hx, y: 0.8 }));
    points[9] = { x: hx, y: hy };
    points[4] = { x: hx - 0.2, y: 0.7 };
    for (const [n, t] of [8, 12, 16, 20].entries()) {
      const open =
        kind === "open" ||
        (kind === "victory" && n < 2) ||
        (kind === "pinch" && n > 0);
      points[t - 2] = { x: hx + n * 0.01, y: 0.57 };
      points[t] = { x: hx + n * 0.01, y: open ? 0.25 : 0.65 };
    }
    if (kind === "pinch") points[4] = { ...points[8] };
    return points;
  };
  return [
    { side: "Left", score: 0.8, points: make("open", x, y) },
    { side: "Right", score: 0.8, points: make(pose, 0.2, 0.5) },
  ];
}
describe("gestures", () => {
  for (const pose of ["open", "fist", "victory", "pinch"] as Pose[])
    it(`recognizes ${pose}`, () =>
      expect(classify(hands(pose)[1].points)).toBe(pose));
  it("moves and jumps simultaneously in both turn directions with short movements", () => {
    for (const side of [-1, 1]) {
      const c = new GestureController();
      c.calibrate(hands("open"));
      c.update(hands("victory", 0.5 - side * 0.07, 0.43), 0);
      const r = c.update(hands("victory", 0.5 - side * 0.07, 0.43), 140);
      expect(r.turn * side).toBeGreaterThan(0);
      expect(r.move).toBeGreaterThan(0);
      expect(r.jump).toBe(true);
      expect(
        c.update(hands("victory", 0.5 - side * 0.07, 0.43), 700).jump,
      ).toBe(true);
    }
  });
  it("stops with a left fist and does not shift the neutral center", () => {
    const c = new GestureController();
    const pair = hands("open", 0.4, 0.4);
    pair[0].points = hands("fist")[1].points;
    expect(c.update(pair, 200)).toMatchObject({ turn: 0, move: 0 });
    expect(c.center).toEqual({ x: 0.5, y: 0.5 });
  });
  it("charges fist and casts exactly once on stable palm release", () => {
    const c = new GestureController();
    c.update(hands("fist"), 0);
    expect(c.update(hands("fist"), 150).charge).toBe(true);
    expect(c.update(hands("open"), 170).charge).toBe(true);
    expect(c.update(hands("open"), 310).cast).toBe(true);
    expect(c.update(hands("open"), 500)).toMatchObject({
      cast: false,
      shield: true,
    });
  });
  it("does not cast when a hand disappears", () => {
    const c = new GestureController();
    c.update(hands("fist"), 0);
    c.update(hands("fist"), 150);
    expect(c.update(hands("fist").slice(0, 1), 200)).toEqual(neutral());
    expect(c.update(hands("open"), 400).cast).toBe(false);
  });
});
describe("mission", () => {
  it("has three islands and a bridge that is initially absent", () => {
    const s = new Simulation();
    s.start();
    expect(platforms).toHaveLength(4);
    expect(s.floorAt(0, -5)).toBe(-Infinity);
    expect(s.floorAt(0, 8)).toBe(0);
  });
  it("requires proximity to pick the stone and activates the bridge at the pedestal", () => {
    const s = new Simulation();
    s.start();
    expect(s.interact()).toBe(false);
    s.player.z = 4;
    expect(s.interact()).toBe(true);
    expect(s.stone.held).toBe(true);
    expect(s.interact()).toBe(true);
    expect(s.bridge).toBe(true);
    expect(s.stone.placed).toBe(true);
    expect(s.floorAt(0, -5)).toBe(0);
  });
  it("moves forward and backward and turns without snapping the camera direction", () => {
    const s = new Simulation();
    s.start();
    s.command.move = 1;
    advance(s, 0.5);
    expect(s.player.z).toBeLessThan(8);
    s.command.move = -1;
    advance(s, 0.5);
    expect(s.player.z).toBeCloseTo(8);
    s.command.turn = 1;
    advance(s, 0.2);
    expect(s.player.yaw).toBeLessThan(0);
  });
  it("jumps while moving, lands, and repeats held jump without double jumping", () => {
    const s = new Simulation();
    s.start();
    s.command = { ...neutral(), move: 1, jump: true };
    let last = 0,
      takeoffs = 0;
    for (let i = 0; i < 70; i++) {
      s.update(1 / 60);
      if (s.player.vy > 5 && last <= 0) takeoffs++;
      last = s.player.vy;
    }
    expect(takeoffs).toBe(2);
    expect(s.player.z).toBeLessThan(8);
  });
  it("falling costs one life and restarts at the checkpoint", () => {
    const s = new Simulation();
    s.start();
    s.checkpoint = s.bridge = true;
    s.player.x = 30;
    s.player.y = -9;
    s.update(0.02);
    expect(s.player.hp).toBe(4);
    expect(s.player.z).toBe(-11);
  });
  it("a charge only launches when cast is explicit and cancels safely", () => {
    const s = new Simulation();
    s.start();
    s.command.charge = true;
    advance(s, 1.2);
    expect(s.charge).toBeGreaterThan(0.9);
    s.cancelInput();
    s.update(0.02);
    expect(s.bolts).toHaveLength(0);
    expect(s.charge).toBe(0);
  });
  it("charged spells defeat the guardian with its original 12 HP after the puzzle", () => {
    const s = new Simulation();
    s.start();
    s.bridge = s.checkpoint = true;
    s.player.z = -12;
    for (let shot = 0; shot < 4; shot++) {
      s.charge = 1;
      expect(s.cast()).toBe(true);
      advance(s, 0.75);
    }
    expect(s.guardian.hp).toBe(0);
    expect(s.status).toBe("won");
  });
  it("spells cannot bypass the puzzle from the starting island", () => {
    const s = new Simulation();
    s.start();
    s.player.z = -12;
    s.charge = 1;
    s.cast();
    advance(s, 1);
    expect(s.guardian.hp).toBe(12);
  });
  it("telegraphed attacks can be blocked, jumped or avoided", () => {
    for (const response of ["shield", "jump", "dodge", "none"]) {
      const s = new Simulation();
      s.start();
      s.checkpoint = s.bridge = true;
      s.player.z = -19;
      s.guardian.state = "windup";
      s.guardian.timer = 0.1;
      s.guardian.attackX = 0;
      s.guardian.attackZ = -19;
      if (response === "shield") s.command.shield = true;
      if (response === "jump") {
        s.player.y = 2;
        s.player.grounded = false;
      }
      if (response === "dodge") s.player.x = 4;
      advance(s, 0.15);
      expect(s.player.hp).toBe(response === "none" ? 4 : 5);
    }
  });
  it("pause freezes mission and cancels charge; retry restores every objective", () => {
    const s = new Simulation();
    s.start();
    s.command.move = 1;
    s.command.charge = true;
    advance(s, 0.2);
    s.pause();
    const p = { ...s.player };
    advance(s, 1);
    expect(s.player).toEqual(p);
    expect(s.charge).toBe(0);
    s.bridge = true;
    s.player.hp = 0;
    s.status = "lost";
    s.start();
    expect(s.player.hp).toBe(5);
    expect(s.bridge).toBe(false);
    expect(s.player.z).toBe(WORLD.spawn.z);
  });
});

it("accepts a slightly late jump after the bridge edge without allowing air jumps", () => {
  const s = new Simulation();
  s.start();
  s.bridge = true;
  s.player.z = -7.55;
  s.command.move = 1;
  advance(s, 0.1);
  expect(s.player.grounded).toBe(false);
  s.command.jump = true;
  s.update(1 / 60);
  expect(s.player.vy).toBeGreaterThan(5);
  const takeoff = s.player.vy;
  advance(s, 0.2);
  expect(s.player.vy).toBeLessThan(takeoff);
});
