import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Simulation } from "../simulation";
import type { Materials } from "./materials";
import { part, shape, torus } from "./geometry";
export class MageActor {
  root = new T.Group();
  ready: Promise<void>;
  mixer?: T.AnimationMixer;
  actions = new Map<string, T.AnimationAction>();
  current = "";
  model?: T.Group;
  orb: T.Mesh;
  shield: T.Mesh;
  private staff?: T.Group;
  private hand?: T.Object3D;
  private handPosition = new T.Vector3();
  private lastCast = -10;
  private lastCastReady = 0;
  constructor(private mats: Materials) {
    this.orb = part(
      this.root,
      new T.OctahedronGeometry(0.17, 1),
      mats.glow,
      0,
      1.4,
      0,
    );
    this.orb.visible = false;
    this.shield = part(
      this.root,
      new T.SphereGeometry(0.92, 28, 18),
      new T.MeshPhysicalMaterial({
        color: 0x73e8dc,
        transparent: true,
        opacity: 0.19,
        roughness: 0.18,
        metalness: 0.3,
        clearcoat: 1,
        depthWrite: false,
      }),
      0,
      1,
      0,
    );
    this.shield.visible = false;
    this.ready = new GLTFLoader()
      .loadAsync(`${import.meta.env.BASE_URL}art/mage/mage.glb`)
      .then((gltf) => {
        const model = gltf.scene;
        this.model = model;
        model.name = "KayKitMage";
        model.traverse((obj) => {
          if (obj instanceof T.Mesh) {
            obj.castShadow = obj.receiveShadow = true;
            if (obj instanceof T.SkinnedMesh) obj.frustumCulled = false;
            const material = obj.material as T.MeshStandardMaterial;
            material.roughness = 0.72;
            material.envMapIntensity = 0.65;
          }
        });
        this.mixer = new T.AnimationMixer(model);
        for (const clip of gltf.animations)
          this.actions.set(clip.name, this.mixer.clipAction(clip));
        this.play("Idle");
        this.mixer.update(0.01);
        model.updateMatrixWorld(true);
        const bounds = new T.Box3().setFromObject(model);
        const scale = 2.05 / bounds.getSize(new T.Vector3()).y;
        model.scale.setScalar(scale);
        model.position.y = -bounds.min.y * scale + 0.09;
        model.rotation.y = Math.PI;
        this.root.add(model);
        let hand: T.Object3D | undefined;
        model.traverse((o) => {
          if (/handslot.*r$/i.test(o.name)) hand = o;
        });
        const staff = new T.Group();
        const shaft = part(
          staff,
          shape.cylinder,
          mats.gold,
          0,
          0.35,
          0,
          0.028,
          1.65,
          0.028,
        );
        shaft.rotation.z = -0.06;
        torus(staff, mats.gold, 0.18, 0, 1.18, 0, 0.045).rotation.x = 0;
        this.root.remove(this.orb);
        staff.add(this.orb);
        this.orb.position.set(0, 1.18, 0);
        this.orb.visible = true;
        this.hand = hand;
        this.staff = staff;
        this.root.add(staff);
        staff.position.set(0.48, 0.7, 0);
        staff.rotation.z = -0.08;
      });
  }
  private play(name: string) {
    if (this.current === name) return;
    const next = this.actions.get(name) ?? this.actions.get("Idle");
    if (!next) return;
    const prior = this.actions.get(this.current);
    this.current = name;
    next.reset();
    const once = ["Death_A", "Spellcast_Shoot", "Hit_A", "Interact"].includes(
      name,
    );
    next.setLoop(once ? T.LoopOnce : T.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.fadeIn(0.16).play();
    prior?.fadeOut(0.16);
  }
  update(sim: Simulation, dt: number) {
    const p = sim.player;
    this.root.position.set(p.x, p.y, p.z);
    this.root.rotation.y = p.yaw;
    if (sim.castReady !== this.lastCastReady) {
      if (sim.castReady > this.lastCastReady) this.lastCast = sim.time;
      this.lastCastReady = sim.castReady;
    }
    const active = sim.status === "playing";
    const name =
      sim.status === "lost"
        ? "Death_A"
        : sim.status === "won"
          ? "Cheer"
          : active && !p.grounded
            ? "Jump_Idle"
            : active && sim.charge > 0.02
              ? "Spellcasting"
              : active && sim.time - this.lastCast < 0.45
                ? "Spellcast_Shoot"
                : active && sim.shield
                  ? "Blocking"
                  : active && Math.abs(sim.command.move) > 0.1
                    ? sim.command.move < 0
                      ? "Walking_Backwards"
                      : Math.abs(sim.command.move) > 0.65
                        ? "Running_A"
                        : "Walking_A"
                    : active && sim.stone.held
                      ? "Interact"
                      : "Idle";
    this.play(name);
    this.mixer?.update(sim.status === "paused" ? 0 : Math.min(dt, 0.15));
    if (this.hand && this.staff) {
      this.root.updateMatrixWorld(true);
      this.hand.getWorldPosition(this.handPosition);
      this.staff.position.copy(this.root.worldToLocal(this.handPosition));
    }
    this.orb.scale.setScalar(1 + sim.charge * 1.5);
    this.orb.rotation.y += dt;
    this.shield.visible = active && sim.shield;
    this.shield.rotation.y += dt * 0.4;
  }
}
