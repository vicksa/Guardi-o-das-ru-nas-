import { type Command, neutral } from "./controls";
export type Vec = { x: number; z: number };
export const WORLD = {
  spawn: { x: 0, z: 8 },
  stone: { x: 2.5, z: 3.6 },
  pedestal: { x: -2.4, z: 1.8 },
  guardian: { x: 0, z: -18 },
};
export type Platform = {
  x: number;
  z: number;
  w: number;
  d: number;
  y: number;
};
export const platforms: Platform[] = [
  { x: 0, z: 4, w: 13, d: 14, y: 0 },
  { x: 0, z: -5.3, w: 3.5, d: 4.6, y: 0 },
  { x: 0, z: -12, w: 9, d: 6, y: 0 },
  { x: 0, z: -20, w: 15, d: 12, y: 0 },
];
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.z - b.z);
export type GameEvent = {
  type:
    | "bridge"
    | "hit"
    | "hurt"
    | "fall"
    | "cast"
    | "grab"
    | "place"
    | "win"
    | "lose"
    | "checkpoint"
    | "blocked";
  value?: number;
};
export class Simulation {
  player = { x: 0, y: 0, z: 8, vy: 0, yaw: 0, hp: 5, grounded: true };
  guardian = {
    x: 0,
    z: -18,
    hp: 12,
    maxHp: 12,
    state: "sleep" as "sleep" | "stalk" | "windup" | "recover" | "dead",
    timer: 0,
    attackX: 0,
    attackZ: 0,
  };
  stone = { x: 2.5, y: 0.7, z: 3.6, held: false, placed: false };
  bolts: {
    x: number;
    y: number;
    z: number;
    dx: number;
    dz: number;
    life: number;
    damage: number;
  }[] = [];
  status: "title" | "playing" | "paused" | "won" | "lost" = "title";
  bridge = false;
  checkpoint = false;
  charge = 0;
  shield = false;
  time = 0;
  hurtUntil = 0;
  castReady = 0;
  lastJump = -10;
  command = neutral();
  private jumpBuffer = 0;
  private lastGroundedAt = -Infinity;
  constructor(private emit: (event: GameEvent) => void = () => {}) {}
  start() {
    this.reset();
    this.status = "playing";
  }
  reset() {
    this.player = {
      ...WORLD.spawn,
      y: 0,
      vy: 0,
      yaw: 0,
      hp: 5,
      grounded: true,
    };
    this.guardian = {
      ...WORLD.guardian,
      hp: 12,
      maxHp: 12,
      state: "sleep",
      timer: 0,
      attackX: 0,
      attackZ: 0,
    };
    this.stone = { ...WORLD.stone, y: 0.7, held: false, placed: false };
    this.bridge = this.checkpoint = false;
    this.charge = this.time = this.hurtUntil = this.castReady = 0;
    this.lastJump = -10;
    this.bolts = [];
    this.command = neutral();
    this.jumpBuffer = 0;
    this.lastGroundedAt = -Infinity;
    this.shield = false;
  }
  cancelInput() {
    this.command = neutral();
    this.charge = 0;
  }
  pause() {
    if (this.status === "playing") {
      this.status = "paused";
      this.command = neutral();
      this.charge = 0;
    }
  }
  resume() {
    if (this.status === "paused") this.status = "playing";
  }
  get objective() {
    return !this.bridge
      ? "Leve o bloco ao pedestal"
      : !this.checkpoint
        ? "Atravesse a passagem restaurada"
        : this.guardian.hp > 0
          ? "Derrote o guardião de pedra"
          : "O santuário está livre";
  }
  get interaction() {
    if (this.stone.placed) return "";
    if (this.stone.held)
      return distance(this.player, WORLD.pedestal) < 4
        ? "Encaixar no pedestal"
        : "Soltar o bloco";
    return distance(this.player, this.stone) < 5 ? "Erguer o bloco" : "";
  }
  get floor() {
    return this.floorAt(this.player.x, this.player.z);
  }
  floorAt(x: number, z: number) {
    for (const [i, p] of platforms.entries()) {
      if (i === 1 && !this.bridge) continue;
      if (Math.abs(x - p.x) <= p.w / 2 && Math.abs(z - p.z) <= p.d / 2)
        return p.y;
    }
    return -Infinity;
  }
  private hurt(amount: number, fall = false) {
    if (this.status !== "playing" || (this.time < this.hurtUntil && !fall))
      return;
    if (this.shield && !fall) {
      this.emit({ type: "blocked" });
      this.hurtUntil = this.time + 0.5;
      return;
    }
    this.player.hp -= amount;
    this.hurtUntil = this.time + 1.3;
    this.emit({ type: fall ? "fall" : "hurt" });
    if (this.player.hp <= 0) {
      this.status = "lost";
      this.command = neutral();
      this.emit({ type: "lose" });
    }
  }
  interact() {
    if (this.status !== "playing" || this.stone.placed) return false;
    if (this.stone.held) {
      this.stone.held = false;
      if (distance(this.player, WORLD.pedestal) < 4) {
        Object.assign(this.stone, { ...WORLD.pedestal, y: 0.9, placed: true });
        this.bridge = true;
        this.emit({ type: "bridge" });
      } else {
        this.stone.x = this.player.x - Math.sin(this.player.yaw) * 1.8;
        this.stone.z = this.player.z - Math.cos(this.player.yaw) * 1.8;
        this.stone.y = 0.7;
        if (!Number.isFinite(this.floorAt(this.stone.x, this.stone.z)))
          Object.assign(this.stone, { ...WORLD.stone, y: 0.7 });
        this.emit({ type: "place" });
      }
      return true;
    }
    if (distance(this.player, this.stone) < 5) {
      this.stone.held = true;
      this.emit({ type: "grab" });
      return true;
    }
    return false;
  }
  cast() {
    if (this.status !== "playing" || this.time < this.castReady) return false;
    const power = this.charge;
    this.charge = 0;
    this.castReady = this.time + 0.4;
    const g = this.guardian;
    let dx = -Math.sin(this.player.yaw),
      dz = -Math.cos(this.player.yaw);
    const d = distance(this.player, g),
      tx = (g.x - this.player.x) / Math.max(d, 0.01),
      tz = (g.z - this.player.z) / Math.max(d, 0.01);
    if (g.hp > 0 && d < 22 && dx * tx + dz * tz > 0.05) {
      dx = tx;
      dz = tz;
    }
    this.bolts.push({
      x: this.player.x + dx * 0.7,
      y: this.player.y + 1.1,
      z: this.player.z + dz * 0.7,
      dx,
      dz,
      life: 2.1,
      damage: power > 0.65 ? 3 : power > 0.2 ? 2 : 1,
    });
    this.emit({ type: "cast", value: power });
    return true;
  }
  update(dt: number) {
    if (this.status !== "playing") return;
    dt = Math.min(Math.max(dt, 0), 0.05);
    this.time += dt;
    const c = this.command,
      p = this.player,
      g = this.guardian;
    this.shield = c.shield && !c.charge;
    const turning = c.turn * 1.85 * dt;
    p.yaw -= turning;
    const speed = this.shield ? 2.4 : 4.6;
    p.x += -Math.sin(p.yaw) * c.move * speed * dt;
    p.z += -Math.cos(p.yaw) * c.move * speed * dt;
    if (p.grounded) this.lastGroundedAt = this.time;
    if (c.jump) this.jumpBuffer = this.time + 0.18;
    if (
      this.jumpBuffer > this.time &&
      this.time - this.lastGroundedAt <= 0.16 &&
      this.time - this.lastJump > 0.25
    ) {
      p.vy = 6.8;
      p.grounded = false;
      this.lastGroundedAt = -Infinity;
      this.lastJump = this.time;
      this.jumpBuffer = 0;
    }
    const oldY = p.y;
    p.vy -= 17 * dt;
    p.y += p.vy * dt;
    const floor = this.floorAt(p.x, p.z);
    if (
      p.vy <= 0 &&
      Number.isFinite(floor) &&
      oldY >= floor - 0.04 &&
      p.y <= floor
    ) {
      p.y = floor;
      p.vy = 0;
      p.grounded = true;
    } else if (!Number.isFinite(floor) || p.y > floor + 0.02)
      p.grounded = false;
    if (p.y < -8) {
      this.hurt(1, true);
      p.x = 0;
      p.z = this.checkpoint ? -11 : 8;
      p.y = 0;
      p.vy = 0;
      p.grounded = true;
      if (this.stone.held) {
        this.stone.held = false;
        Object.assign(this.stone, { ...WORLD.stone, y: 0.7 });
      }
    }
    if (this.bridge && p.z < -8 && !this.checkpoint && p.grounded) {
      this.checkpoint = true;
      p.hp = Math.min(5, p.hp + 1);
      this.emit({ type: "checkpoint" });
    }
    if (c.grab) {
      this.interact();
      c.grab = false;
    }
    if (c.charge) this.charge = Math.min(1, this.charge + dt * 0.85);
    if (c.cast) {
      this.cast();
      c.cast = false;
    } else if (!c.charge) this.charge = 0;
    if (this.stone.held) {
      this.stone.x = p.x - Math.sin(p.yaw) * 1.7;
      this.stone.z = p.z - Math.cos(p.yaw) * 1.7;
      this.stone.y = p.y + 1.8 + Math.sin(this.time * 3) * 0.12;
    }
    for (const bolt of this.bolts) {
      bolt.life -= dt;
      bolt.x += bolt.dx * dt * 17;
      bolt.z += bolt.dz * dt * 17;
      if (
        bolt.life > 0 &&
        this.checkpoint &&
        g.hp > 0 &&
        distance(bolt, g) < 1.8
      ) {
        if (g.state === "sleep") {
          g.state = "stalk";
          g.timer = 0.6;
        }
        g.hp = Math.max(0, g.hp - bolt.damage);
        bolt.life = 0;
        this.emit({ type: "hit", value: g.hp });
        if (!g.hp) {
          g.state = "dead";
          this.status = "won";
          this.command = neutral();
          this.emit({ type: "win" });
        }
      }
    }
    this.bolts = this.bolts.filter((b) => b.life > 0);
    if (this.status !== "playing" || g.hp <= 0) return;
    if (g.state === "sleep" && p.z < -12) {
      g.state = "stalk";
      g.timer = 1.2;
    }
    if (g.state === "stalk") {
      const d = distance(g, p);
      g.timer -= dt;
      if (d > 4) {
        g.x += ((p.x - g.x) / d) * dt * 1.1;
        g.z += ((p.z - g.z) / d) * dt * 1.1;
        g.x = Math.max(-5, Math.min(5, g.x));
        g.z = Math.max(-24, Math.min(-15, g.z));
      }
      if (g.timer <= 0) {
        g.state = "windup";
        g.timer = 1.35;
        g.attackX = p.x;
        g.attackZ = p.z;
      }
    } else if (g.state === "windup") {
      g.timer -= dt;
      if (g.timer <= 0) {
        if (distance(p, { x: g.attackX, z: g.attackZ }) < 2.7 && p.y < 1.1)
          this.hurt(1);
        g.state = "recover";
        g.timer = 1.8;
      }
    } else if (g.state === "recover") {
      g.timer -= dt;
      if (g.timer <= 0) {
        g.state = "stalk";
        g.timer = 1.1;
      }
    }
  }
}
