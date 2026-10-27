import * as T from "three";
import { Simulation, platforms, WORLD } from "./simulation";
const C = {
  stone: 0x637a7b,
  edge: 0x354f56,
  dark: 0x233f47,
  moss: 0x477c67,
  leaf: 0x6ca084,
  gold: 0xefbb72,
  magic: 0xffcf87,
  cloth: 0x247777,
};
const material = (color: number, emissive = 0) =>
  new T.MeshStandardMaterial({
    color,
    roughness: 0.86,
    flatShading: true,
    emissive,
    emissiveIntensity: emissive ? 0.7 : 0,
  });
const stone = material(C.stone),
  edge = material(C.edge),
  dark = material(C.dark),
  gold = material(C.gold),
  moss = material(C.moss),
  cloth = material(C.cloth),
  glow = new T.MeshBasicMaterial({ color: 0xffc077, toneMapped: false });
function mesh(
  geometry: T.BufferGeometry,
  mat: T.Material,
  parent: T.Object3D,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new T.Mesh(geometry, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(
  parent: T.Object3D,
  w: number,
  h: number,
  d: number,
  mat: T.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  return mesh(new T.BoxGeometry(w, h, d), mat, parent, x, y, z);
}
function ring(
  parent: T.Object3D,
  r: number,
  mat: T.Material,
  x = 0,
  y = 0,
  z = 0,
  tube = 0.025,
) {
  const m = mesh(new T.TorusGeometry(r, tube, 5, 48), mat, parent, x, y, z);
  m.rotation.x = Math.PI / 2;
  return m;
}
export class World {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(52, 1, 0.1, 230);
  mage = new T.Group();
  guardian = new T.Group();
  stone = new T.Group();
  bridge = new T.Group();
  pedestal = new T.Group();
  private clock = 0;
  private robe: T.Mesh;
  private head: T.Group;
  private arms: T.Group[] = [];
  private legs: T.Group[] = [];
  private guardianArms: T.Group[] = [];
  private orb: T.Mesh;
  private shield: T.Mesh;
  private core: T.Mesh;
  private warning: T.Mesh;
  private bolts = new T.Group();
  private particles: T.Points;
  private runes: T.Mesh[] = [];
  private cameraReady = false;
  private reduced = false;
  constructor(
    private root: HTMLElement,
    private sim: Simulation,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.28;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.root.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Cenário 3D das ruínas flutuantes",
    );
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, "#173842");
    gradient.addColorStop(0.58, "#578985");
    gradient.addColorStop(1, "#c6c5a0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 8, 256);
    this.scene.background = new T.CanvasTexture(canvas);
    this.scene.fog = new T.FogExp2(0x8ca9a0, 0.015);
    this.scene.add(new T.HemisphereLight(0xffecd1, 0x264749, 2.4));
    const sun = new T.DirectionalLight(0xffd79e, 3.1);
    sun.position.set(-15, 27, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 35;
    sun.shadow.camera.bottom = -28;
    sun.shadow.camera.far = 90;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    this.scene.add(new T.AmbientLight(0x9bc6c0, 0.3));
    mesh(
      new T.SphereGeometry(15, 32, 24),
      new T.MeshBasicMaterial({ color: 0xf4d2a2, fog: false }),
      this.scene,
      10,
      9,
      -95,
    );
    const moonRing = mesh(
      new T.TorusGeometry(18, 0.13, 6, 100),
      new T.MeshBasicMaterial({ color: 0xd8b994, fog: false }),
      this.scene,
      10,
      9,
      -95,
    );
    moonRing.rotation.x = 0.3;
    moonRing.rotation.y = -0.4;
    this.buildTerrain();
    this.buildTemple();
    this.buildFlora();
    this.scene.add(this.mage);
    this.robe = mesh(
      new T.CylinderGeometry(0.27, 0.55, 0.95, 7),
      cloth,
      this.mage,
      0,
      0.74,
      0,
    );
    this.robe.rotation.y = Math.PI / 7;
    const collar = mesh(
      new T.ConeGeometry(0.5, 0.35, 6),
      material(0xadc6b5),
      this.mage,
      0,
      1.18,
      0,
    );
    collar.rotation.z = Math.PI;
    box(this.mage, 0.12, 0.67, 0.13, gold, 0, 0.93, -0.36);
    this.head = new T.Group();
    this.head.position.y = 1.55;
    this.mage.add(this.head);
    mesh(new T.IcosahedronGeometry(0.37, 1), cloth, this.head);
    const face = mesh(
      new T.SphereGeometry(0.255, 8, 6),
      material(0x142c31),
      this.head,
      0,
      -0.015,
      -0.19,
    );
    face.scale.set(1, 0.9, 0.42);
    for (const x of [-0.09, 0.09])
      box(this.head, 0.055, 0.035, 0.02, glow, x, 0.02, -0.294);
    for (const side of [-1, 1]) {
      const arm = new T.Group();
      arm.position.set(side * 0.35, 1.13, 0);
      this.mage.add(arm);
      mesh(
        new T.CylinderGeometry(0.13, 0.16, 0.53, 6),
        cloth,
        arm,
        0,
        -0.22,
        0,
      );
      mesh(
        new T.IcosahedronGeometry(0.115, 0),
        material(0xc0a88e),
        arm,
        0,
        -0.48,
        0,
      );
      this.arms.push(arm);
      const leg = new T.Group();
      leg.position.set(side * 0.19, 0.3, 0);
      this.mage.add(leg);
      box(leg, 0.17, 0.36, 0.24, dark, 0, -0.1, 0);
      this.legs.push(leg);
    }
    const staff = new T.Group();
    staff.position.set(0.05, -0.35, -0.05);
    this.arms[1].add(staff);
    mesh(
      new T.CylinderGeometry(0.036, 0.055, 1.65, 6),
      material(0x66554a),
      staff,
      0,
      0.12,
      0,
    );
    const crook = ring(staff, 0.17, gold, 0, 0.97, 0, 0.045);
    crook.rotation.x = 0;
    this.orb = mesh(new T.OctahedronGeometry(0.15), glow, staff, 0, 0.97, 0);
    const pendant = ring(this.mage, 0.09, gold, 0, 1, -0.37, 0.02);
    pendant.rotation.x = 0;
    this.shield = mesh(
      new T.SphereGeometry(0.91, 20, 12),
      new T.MeshBasicMaterial({
        color: 0x8ef2db,
        transparent: true,
        opacity: 0.16,
        wireframe: true,
      }),
      this.mage,
      0,
      0.9,
      0,
    );
    this.shield.visible = false;
    this.scene.add(this.guardian);
    mesh(
      new T.DodecahedronGeometry(1.13, 0),
      edge,
      this.guardian,
      0,
      2,
      0,
    ).scale.set(1.15, 1.2, 0.7);
    box(this.guardian, 1.5, 0.32, 0.9, stone, 0, 1.05, 0);
    for (const side of [-1, 1]) {
      const arm = new T.Group();
      arm.position.set(side * 1.3, 2.65, 0);
      this.guardian.add(arm);
      mesh(new T.DodecahedronGeometry(0.52, 0), stone, arm, 0, 0, 0);
      box(arm, 0.6, 1.2, 0.7, edge, 0, -0.65, 0);
      mesh(new T.DodecahedronGeometry(0.43, 0), stone, arm, 0, -1.35, 0);
      ring(arm, 0.37, glow, 0, -1.1, 0);
      this.guardianArms.push(arm);
      box(this.guardian, 0.61, 1, 0.72, edge, side * 0.55, 0.53, 0);
      box(this.guardian, 0.78, 0.35, 1.05, stone, side * 0.55, 0.15, -0.12);
    }
    mesh(
      new T.DodecahedronGeometry(0.65, 0),
      stone,
      this.guardian,
      0,
      3.15,
      0,
    ).scale.set(0.92, 1.04, 0.85);
    box(this.guardian, 0.87, 0.12, 0.16, glow, 0, 3.2, -0.53);
    for (const side of [-1, 1]) {
      const horn = mesh(
        new T.ConeGeometry(0.18, 0.8, 4),
        gold,
        this.guardian,
        side * 0.48,
        3.73,
        0,
      );
      horn.rotation.z = side * -0.6;
    }
    this.core = mesh(
      new T.OctahedronGeometry(0.4),
      glow,
      this.guardian,
      0,
      2.16,
      -0.77,
    );
    ring(this.guardian, 0.49, gold, 0, 2.16, -0.71, 0.04).rotation.x = 0;
    this.scene.add(this.stone);
    box(this.stone, 1.05, 1.05, 1.05, edge).rotation.y = 0.1;
    for (const y of [-0.38, 0.38])
      box(this.stone, 1.1, 0.08, 1.1, gold, 0, y, 0);
    const rune = ring(this.stone, 0.27, glow, 0, 0, -0.54, 0.035);
    rune.rotation.x = 0;
    const diamond = mesh(
      new T.OctahedronGeometry(0.14),
      glow,
      this.stone,
      0,
      0,
      -0.56,
    );
    diamond.scale.z = 0.18;
    this.warning = ring(
      this.scene,
      2.7,
      new T.MeshBasicMaterial({
        color: 0xff8b67,
        transparent: true,
        opacity: 0.85,
      }),
      0,
      0.03,
      0,
      0.065,
    );
    this.warning.visible = false;
    this.scene.add(this.bolts);
    const positions = new Float32Array(130 * 3);
    for (let i = 0; i < 130; i++) {
      positions[i * 3] = Math.sin(i * 7.13) * 27;
      positions[i * 3 + 1] = (i % 11) * 0.65 + 1;
      positions[i * 3 + 2] = Math.cos(i * 12.91) * 32 - 8;
    }
    const particleGeo = new T.BufferGeometry();
    particleGeo.setAttribute("position", new T.BufferAttribute(positions, 3));
    this.particles = new T.Points(
      particleGeo,
      new T.PointsMaterial({
        color: C.magic,
        size: 0.055,
        transparent: true,
        opacity: 0.75,
        sizeAttenuation: true,
      }),
    );
    this.scene.add(this.particles);
    this.resize();
    new ResizeObserver(() => this.resize()).observe(root);
  }
  private island(
    p: { x: number; z: number; w: number; d: number; y: number },
    parent: T.Object3D,
  ) {
    const g = new T.Group();
    g.position.set(p.x, p.y, p.z);
    parent.add(g);
    box(g, p.w, 0.55, p.d, edge, 0, -0.3, 0);
    const rock = mesh(
      new T.ConeGeometry(Math.max(p.w, p.d) * 0.52, 5, 7, 1),
      dark,
      g,
      0,
      -2.8,
      0,
    );
    rock.rotation.z = Math.PI;
    rock.scale.x = p.w / Math.max(p.w, p.d);
    rock.scale.z = p.d / Math.max(p.w, p.d);
    const nx = Math.floor(p.w / 1.2),
      nz = Math.floor(p.d / 1.2),
      tiles = new T.InstancedMesh(
        new T.BoxGeometry(1.12, 0.12, 1.12),
        stone,
        nx * nz,
      );
    let n = 0;
    const obj = new T.Object3D();
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        obj.position.set(
          (i - (nx - 1) / 2) * 1.2,
          0.015,
          (j - (nz - 1) / 2) * 1.2,
        );
        obj.rotation.y = Math.sin(i * 3 + j * 11) * 0.025;
        obj.updateMatrix();
        tiles.setMatrixAt(n, obj.matrix);
        tiles.setColorAt(
          n++,
          new T.Color().setHSL(
            0.48,
            0.09,
            0.4 + (Math.sin(i * 32 + j * 14) + 1) * 0.045,
          ),
        );
      }
    tiles.receiveShadow = true;
    g.add(tiles);
    for (let i = 0; i < 7; i++) {
      const b = mesh(
        new T.DodecahedronGeometry(1.2, 0),
        edge,
        g,
        Math.cos(i * 2.4) * p.w * 0.42,
        -0.8 - Math.abs(Math.sin(i * 3)),
        Math.sin(i * 2.4) * p.d * 0.42,
      );
      b.scale.set(1, 1.6, 1);
    }
  }
  private buildTerrain() {
    for (const [i, p] of platforms.entries())
      this.island(p, i === 1 ? this.bridge : this.scene);
    this.scene.add(this.bridge);
    this.bridge.visible = false;
    this.pedestal.position.set(WORLD.pedestal.x, 0, WORLD.pedestal.z);
    this.scene.add(this.pedestal);
    mesh(
      new T.CylinderGeometry(0.85, 1.1, 0.35, 8),
      stone,
      this.pedestal,
      0,
      0.16,
      0,
    );
    ring(this.pedestal, 0.68, glow, 0, 0.36, 0, 0.035);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      mesh(
        new T.OctahedronGeometry(0.09),
        glow,
        this.pedestal,
        Math.cos(a) * 0.7,
        0.5,
        Math.sin(a) * 0.7,
      );
    }
    for (const z of [7, 2, -2, -10, -14]) {
      for (const side of [-1, 1]) {
        const x = side * (z > -3 ? 5 : 3.3);
        box(this.scene, 0.45, 0.6, 0.45, stone, x, 0.3, z);
        mesh(new T.OctahedronGeometry(0.21), glow, this.scene, x, 0.85, z);
      }
    }
    const arena = ring(
      this.scene,
      5.6,
      material(0x93a792),
      0,
      0.09,
      -20,
      0.055,
    );
    this.runes.push(arena);
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      const r = box(
        this.scene,
        0.11,
        0.025,
        0.4,
        gold,
        Math.cos(a) * 5.2,
        0.12,
        -20 + Math.sin(a) * 5.2,
      );
      r.rotation.y = -a;
    }
    // Small remote ruins and cloud banks give the islands a sense of altitude.
    for (let i = 0; i < 12; i++) {
      const x = (i % 2 ? 1 : -1) * (24 + i * 4),
        z = -12 - i * 7;
      const rock = mesh(
        new T.ConeGeometry(4 + (i % 3), 6, 5),
        dark,
        this.scene,
        x,
        -8 - (i % 3),
        z,
      );
      rock.rotation.z = Math.PI;
      box(this.scene, 5, 0.5, 4, edge, x, -5 - (i % 3), z);
      if (i % 2 === 0) this.column(x, -5 - (i % 3), z, 2);
    }
    const cloudGeo = new T.IcosahedronGeometry(1, 1),
      cloudMat = material(0xa0b8ae);
    const clouds = new T.InstancedMesh(cloudGeo, cloudMat, 80);
    const obj = new T.Object3D();
    for (let i = 0; i < 80; i++) {
      obj.position.set(
        Math.sin(i * 31.7) * 75,
        -11 - (i % 5) * 2,
        -40 + Math.cos(i * 13.3) * 70,
      );
      obj.scale.set(8 + (i % 4), 1.7, 4 + (i % 5));
      obj.updateMatrix();
      clouds.setMatrixAt(i, obj.matrix);
    }
    this.scene.add(clouds);
  }
  private column(x: number, y: number, z: number, height = 4) {
    box(this.scene, 1.1, 0.4, 1.1, stone, x, y + 0.2, z);
    mesh(
      new T.CylinderGeometry(0.36, 0.43, height, 7),
      stone,
      this.scene,
      x,
      y + height / 2 + 0.4,
      z,
    );
    box(this.scene, 1.1, 0.3, 1.1, stone, x, y + height + 0.4, z);
    ring(this.scene, 0.39, gold, x, y + height * 0.7, z, 0.025);
  }
  private buildTemple() {
    for (const z of [-16.2, -22.5])
      for (const x of [-5, 5]) this.column(x, 0, z, 4.6);
    box(this.scene, 11, 0.65, 1.2, edge, 0, 5.2, -22.5);
    box(this.scene, 5, 0.6, 1.1, stone, -3, 5.2, -16.2);
    box(this.scene, 2, 0.6, 1.1, stone, 4.6, 5.2, -16.2).rotation.z = -0.12;
    const gate = new T.Group();
    gate.position.set(0, 0, -25);
    this.scene.add(gate);
    for (const side of [-1, 1]) box(gate, 0.85, 4, 0.9, edge, side * 2, 2, 0);
    box(gate, 5, 0.7, 1.1, stone, 0, 4, 0);
    const halo = ring(gate, 1.6, glow, 0, 2.2, -0.1, 0.055);
    halo.rotation.x = 0;
    for (const x of [-6, 6])
      for (const z of [-17, -21, -24]) {
        const b = box(this.scene, 0.9, 0.6, 0.9, edge, x, 0.3, z);
        b.rotation.y = z;
      }
    const opening = new T.Group();
    opening.position.set(0, 0, -9.6);
    this.scene.add(opening);
    for (const s of [-1, 1]) {
      box(opening, 0.55, 2.8, 0.65, edge, s * 2.5, 1.4, 0);
      mesh(new T.OctahedronGeometry(0.22), glow, opening, s * 2.5, 3, 0);
    }
  }
  private buildFlora() {
    const stems = new T.InstancedMesh(
        new T.ConeGeometry(0.16, 0.8, 3),
        material(C.leaf),
        230,
      ),
      obj = new T.Object3D();
    let n = 0;
    for (let i = 0; i < 230; i++) {
      const p = platforms[i % 3 === 0 ? 2 : i % 3 === 1 ? 0 : 3];
      const angle = i * 2.399;
      const radius = 0.42 + 0.07 * Math.sin(i);
      obj.position.set(
        p.x + Math.cos(angle) * p.w * radius,
        0.3,
        p.z + Math.sin(angle) * p.d * radius,
      );
      obj.rotation.set(Math.sin(i) * 0.2, i, Math.cos(i) * 0.2);
      obj.scale.set(1, 0.5 + (i % 7) / 9, 1);
      obj.updateMatrix();
      stems.setMatrixAt(n++, obj.matrix);
    }
    this.scene.add(stems);
    for (let i = 0; i < 14; i++) {
      const x = (i % 2 ? 1 : -1) * (3.6 + (i % 3)),
        z = 8 - i * 2.4;
      const group = new T.Group();
      this.scene.add(group);
      group.position.set(x, 0, z);
      const trunk = mesh(
        new T.CylinderGeometry(0.08, 0.18, 1.4, 5),
        material(0x586452),
        group,
        0,
        0.7,
        0,
      );
      trunk.rotation.z = 0.16;
      for (let j = 0; j < 3; j++) {
        const leaf = mesh(
          new T.IcosahedronGeometry(0.6, 0),
          moss,
          group,
          Math.sin(j * 2) * 0.4,
          1.2 + j * 0.3,
          Math.cos(j * 2) * 0.3,
        );
        leaf.scale.set(1.4, 0.6, 1);
      }
    }
  }
  resize() {
    const w = this.root.clientWidth,
      h = this.root.clientHeight;
    if (w < 1 || h < 1) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  setQuality(low: boolean) {
    this.renderer.setPixelRatio(
      low ? 1 : Math.min(window.devicePixelRatio, 1.6),
    );
    this.renderer.shadowMap.enabled = !low;
    this.resize();
  }
  setReduced(reduced: boolean) {
    this.reduced = reduced;
  }
  frame(dt: number) {
    const s = this.sim;
    this.clock += Math.min(dt, 0.05);
    const t = this.clock,
      p = s.player;
    this.mage.position.set(p.x, p.y, p.z);
    this.mage.rotation.y = p.yaw;
    this.stone.position.set(s.stone.x, s.stone.y, s.stone.z);
    this.stone.rotation.y = s.stone.held ? t * 0.5 : 0.12;
    this.bridge.visible = s.bridge;
    const walking = s.status === "playing" && Math.abs(s.command.move) > 0.1;
    const gait = walking ? Math.sin(t * 10) * 0.48 : Math.sin(t * 2) * 0.035;
    this.legs.forEach((leg, i) => (leg.rotation.x = gait * (i ? 1 : -1)));
    this.arms.forEach((arm, i) => {
      arm.rotation.x = s.charge > 0.02 ? -1.1 : gait * (i ? -1 : 1) * 0.5;
      arm.rotation.z = s.stone.held ? (i ? 0.4 : -0.4) : 0;
    });
    this.robe.rotation.z = walking ? Math.sin(t * 10) * 0.025 : 0;
    this.head.rotation.z = Math.sin(t * 1.7) * 0.025;
    this.orb.scale.setScalar(1 + s.charge * 2);
    this.orb.rotation.y = t;
    this.shield.visible = s.shield && s.status === "playing";
    this.shield.rotation.y = t * 0.3;
    this.mage.visible = s.status !== "lost" || Math.sin(t * 5) > -0.5;
    const g = s.guardian;
    this.guardian.position.set(g.x, 0, g.z);
    this.guardian.rotation.y = Math.atan2(p.x - g.x, p.z - g.z) + Math.PI;
    this.guardian.scale.y = g.hp === 0 ? 0.42 : 1;
    this.guardian.rotation.z = g.hp === 0 ? 0.45 : 0;
    this.core.rotation.y = t;
    this.core.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    this.guardianArms.forEach(
      (arm, i) =>
        (arm.rotation.x =
          g.state === "windup"
            ? -1.7
            : g.state === "recover"
              ? 0.4
              : Math.sin(t * 2 + i) * 0.06),
    );
    this.warning.visible = g.state === "windup";
    this.warning.position.set(g.attackX, 0.12, g.attackZ);
    this.warning.scale.setScalar(0.65 + (1 - g.timer / 1.35) * 0.35);
    while (this.bolts.children.length > s.bolts.length) {
      const o = this.bolts.children.pop() as T.Mesh;
      o.geometry.dispose();
      o.parent = null;
    }
    while (this.bolts.children.length < s.bolts.length) {
      mesh(new T.IcosahedronGeometry(0.22, 1), glow, this.bolts);
    }
    this.bolts.children.forEach((b, i) => {
      const bolt = s.bolts[i];
      b.position.set(bolt.x, bolt.y, bolt.z);
      b.scale.setScalar(0.7 + bolt.damage * 0.2);
    });
    if (!this.reduced) this.particles.rotation.y = t * 0.007;
    const title = s.status === "title";
    const target = new T.Vector3();
    const look = new T.Vector3();
    if (title) {
      target.set(17 + Math.sin(t * 0.035) * 1.5, 12.5, 21);
      look.set(0, 0, -7);
    } else {
      target.set(
        p.x + Math.sin(p.yaw) * 8.5,
        p.y + 5.5,
        p.z + Math.cos(p.yaw) * 8.5,
      );
      look.set(p.x - Math.sin(p.yaw) * 2, p.y + 0.8, p.z - Math.cos(p.yaw) * 2);
    }
    this.camera.position.lerp(
      target,
      this.cameraReady ? 1 - Math.exp(-dt * 5) : 1,
    );
    this.camera.lookAt(look);
    this.cameraReady = true;
    this.renderer.render(this.scene, this.camera);
  }
}
