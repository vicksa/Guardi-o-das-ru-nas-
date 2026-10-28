import * as T from "three";
import type { Materials } from "./materials";
import { part, block, shape, torus } from "./geometry";
export class GuardianActor {
  root = new T.Group();
  mixer: T.AnimationMixer;
  private actions = new Map<string, T.AnimationAction>();
  private current = "";
  core: T.Mesh;
  constructor(m: Materials) {
    const torso = new T.Group();
    torso.name = "Torso";
    torso.position.y = 1.85;
    this.root.add(torso);
    part(torso, shape.sphere, m.dark, 0, 0.15, 0, 1.16, 1, 0.68);
    block(torso, m.stone, 0, 0.1, 0.15, 1.7, 1.45, 0.8);
    const breast = part(
      torso,
      shape.sphere,
      m.pale,
      0,
      0.25,
      -0.42,
      1.05,
      0.83,
      0.4,
    );
    breast.rotation.z = 0.03;
    part(
      torso,
      new T.CylinderGeometry(0.41, 0.41, 0.13, 32),
      m.dark,
      0,
      0.3,
      -0.78,
    ).rotation.x = Math.PI / 2;
    this.core = part(
      torso,
      new T.OctahedronGeometry(0.29, 1),
      m.cyan,
      0,
      0.3,
      -0.89,
    );
    torus(torso, m.gold, 0.45, 0, 0.3, -0.82, 0.035).rotation.x = 0;
    for (const side of [-1, 1]) {
      const arm = new T.Group();
      arm.name = side < 0 ? "ArmL" : "ArmR";
      arm.position.set(side * 1.16, 0.66, 0);
      torso.add(arm);
      const shoulder = block(arm, m.pale, 0, 0, 0, 0.95, 0.7, 1.06);
      shoulder.rotation.z = side * -0.18;
      block(arm, m.gold, 0, 0.22, 0, 1, 0.08, 1.1);
      block(arm, m.dark, 0, -0.62, 0, 0.62, 1, 0.7);
      block(arm, m.stone, 0, -1.02, -0.04, 0.73, 0.7, 0.8);
      for (let i = 0; i < 3; i++)
        block(arm, m.pale, (i - 1) * 0.2, -1.25, -0.39, 0.17, 0.36, 0.2);
      torus(arm, m.gold, 0.4, 0, -0.92, 0, 0.055);
      const leg = new T.Group();
      leg.name = side < 0 ? "LegL" : "LegR";
      leg.position.set(side * 0.57, 1, 0);
      this.root.add(leg);
      block(leg, m.dark, 0, -0.34, 0, 0.62, 0.9, 0.64);
      block(leg, m.pale, 0, -0.62, -0.09, 0.7, 0.27, 0.85);
      block(leg, m.stone, 0, -0.85, -0.2, 0.78, 0.34, 1.08);
    }
    const head = new T.Group();
    head.name = "Head";
    head.position.set(0, 1.33, 0);
    torso.add(head);
    part(head, shape.sphere, m.dark, 0, 0, 0, 0.58, 0.65, 0.53);
    block(head, m.pale, 0, 0, -0.31, 0.87, 0.9, 0.35);
    block(head, m.gold, 0, 0.26, -0.52, 0.92, 0.08, 0.08);
    for (const side of [-1, 1]) {
      block(head, m.cyan, side * 0.2, 0.12, -0.51, 0.24, 0.075, 0.045);
      block(head, m.dark, side * 0.33, -0.24, -0.45, 0.1, 0.35, 0.1);
      const crest = part(
        head,
        new T.ConeGeometry(0.13, 0.75, 5),
        m.gold,
        side * 0.46,
        0.63,
        0.05,
      );
      crest.rotation.z = -side * 0.35;
    }
    block(head, m.gold, 0, 0.49, 0, 0.14, 0.47, 0.14);
    block(torso, m.gold, 0, -0.72, 0, 1.4, 0.16, 0.82);
    for (let i = 0; i < 5; i++)
      block(torso, m.pale, (i - 2) * 0.27, -0.93, -0.32, 0.23, 0.38, 0.22);
    this.mixer = new T.AnimationMixer(this.root);
    const arm = (node: string, v: number[]) =>
      new T.NumberKeyframeTrack(`${node}.rotation[x]`, [0, 0.5, 1.35], v);
    const clips = [
      new T.AnimationClip("sleep", 2, [
        new T.NumberKeyframeTrack(
          "Torso.position[y]",
          [0, 1, 2],
          [1.83, 1.87, 1.83],
        ),
      ]),
      new T.AnimationClip("stalk", 1, [
        new T.NumberKeyframeTrack(
          "LegL.rotation[x]",
          [0, 0.5, 1],
          [-0.18, 0.18, -0.18],
        ),
        new T.NumberKeyframeTrack(
          "LegR.rotation[x]",
          [0, 0.5, 1],
          [0.18, -0.18, 0.18],
        ),
      ]),
      new T.AnimationClip("windup", 1.35, [
        arm("ArmL", [0, -1.2, -1.9]),
        arm("ArmR", [0, -1.2, -1.9]),
        new T.NumberKeyframeTrack(
          "Torso.rotation[x]",
          [0, 0.7, 1.35],
          [0, -0.12, -0.2],
        ),
      ]),
      new T.AnimationClip("recover", 1.8, [
        new T.NumberKeyframeTrack(
          "ArmL.rotation[x]",
          [0, 0.22, 0.7, 1.8],
          [-1.9, 0.4, 0.25, 0],
        ),
        new T.NumberKeyframeTrack(
          "ArmR.rotation[x]",
          [0, 0.22, 0.7, 1.8],
          [-1.9, 0.4, 0.25, 0],
        ),
      ]),
      new T.AnimationClip("dead", 1.3, [
        new T.NumberKeyframeTrack(
          "Torso.rotation[z]",
          [0, 0.5, 1.3],
          [0, -0.3, -0.8],
        ),
        new T.NumberKeyframeTrack(
          "Torso.position[y]",
          [0, 0.5, 1.3],
          [1.85, 1.2, 0.65],
        ),
      ]),
    ];
    for (const clip of clips)
      this.actions.set(clip.name, this.mixer.clipAction(clip));
  }
  update(state: string, dt: number) {
    if (state !== this.current) {
      const previous = this.actions.get(this.current),
        next = this.actions.get(state)!;
      this.current = state;
      next.reset().fadeIn(0.16).play();
      const once = ["windup", "recover", "dead"].includes(state);
      next.setLoop(once ? T.LoopOnce : T.LoopRepeat, once ? 1 : Infinity);
      next.clampWhenFinished = once;
      previous?.fadeOut(0.16);
    }
    this.mixer.update(dt);
    this.core.rotation.y += dt * 0.8;
  }
}
