import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Simulation } from "./simulation";
import { makeMaterials, radialTexture } from "./art/materials";
import { MageActor } from "./art/character";
import { GuardianActor } from "./art/guardian";
import { Environment } from "./art/environment";
import { part, torus } from "./art/geometry";
export class World {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(49, 1, 0.1, 220);
  ready: Promise<void>;
  character: MageActor;
  golem: GuardianActor;
  environment: Environment;
  mage: T.Group;
  guardian: T.Group;
  stone: T.Group;
  bridge: T.Group;
  pedestal: T.Group;
  private composer?: EffectComposer;
  private clock = 0;
  private cameraReady = false;
  private low = false;
  private software = false;
  private renderElapsed = 1;
  get lowQuality() {
    return this.low;
  }
  private reduced = false;
  private warning: T.Mesh;
  private bolts: T.Mesh[] = [];
  private boltMaterial = new T.MeshBasicMaterial({
    color: 0xffda9b,
    toneMapped: false,
  });
  private boltHalo = new T.SpriteMaterial({
    map: radialTexture("rgba(255,173,79,.85)"),
    transparent: true,
    blending: T.AdditiveBlending,
    depthWrite: false,
  });
  stats = { calls: 0, triangles: 0, geometries: 0, textures: 0 };
  private particles: T.Points;
  private mageShadow: T.Mesh;
  private guardianShadow: T.Mesh;
  private beam: T.Line;
  private positionBuffer = new Float32Array(36);
  private orbLight = new T.PointLight(0xffc682, 0, 5, 2);
  constructor(
    private root: HTMLElement,
    private sim: Simulation,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    const gl = this.renderer.getContext();
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const rendererName = debug
      ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))
      : "";
    this.software = /swiftshader|llvmpipe|software rasterizer/i.test(
      rendererName,
    );
    this.low = this.software || matchMedia("(pointer: coarse)").matches;
    this.renderer.setPixelRatio(
      this.low
        ? Math.min(1, (this.software ? 480 : 960) / innerWidth)
        : Math.min(devicePixelRatio, 1.5),
    );
    this.renderer.info.autoReset = false;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = !this.low;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Cenário 3D das ruínas flutuantes",
    );
    root.append(this.renderer.domElement);
    const sky = document.createElement("canvas");
    sky.width = 8;
    sky.height = 512;
    const ctx = sky.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#080f25");
    g.addColorStop(0.55, "#233452");
    g.addColorStop(1, "#506881");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 512);
    const skyMap = new T.CanvasTexture(sky);
    skyMap.colorSpace = T.SRGBColorSpace;
    this.scene.background = skyMap;
    this.scene.fog = new T.FogExp2(0x293b58, 0.012);
    const ambient = new T.HemisphereLight(0xb6ceff, 0x131b32, 0.95);
    this.scene.add(ambient);
    const sun = new T.DirectionalLight(0xffd1a0, 3.4);
    sun.position.set(-12, 24, 10);
    sun.target.position.set(0, 0, -9);
    this.scene.add(sun, sun.target);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    Object.assign(sun.shadow.camera, {
      left: -17,
      right: 17,
      top: 28,
      bottom: -24,
      near: 0.5,
      far: 80,
    });
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.00015;
    sun.shadow.camera.updateProjectionMatrix();
    const rim = new T.DirectionalLight(0x96bbff, 1.15);
    rim.position.set(8, 10, -22);
    this.scene.add(rim);
    const room = new RoomEnvironment();
    const pmrem = new T.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(room, 0.08).texture;
    this.scene.environmentIntensity = 0.36;
    room.dispose();
    pmrem.dispose();
    const mats = makeMaterials();
    this.environment = new Environment(this.scene, mats);
    this.stone = this.environment.stone;
    this.bridge = this.environment.bridge;
    this.pedestal = this.environment.pedestal;
    this.character = new MageActor(mats);
    this.mage = this.character.root;
    this.scene.add(this.mage);
    this.ready = this.character.ready;
    this.golem = new GuardianActor(mats);
    this.guardian = this.golem.root;
    this.scene.add(this.guardian);
    this.warning = torus(
      this.scene,
      new T.MeshBasicMaterial({
        color: 0xff796c,
        transparent: true,
        opacity: 0.9,
        toneMapped: false,
      }),
      2.7,
      0,
      0.12,
      0,
      0.06,
    );
    this.warning.visible = false;
    const shadowMat = new T.MeshBasicMaterial({
      map: radialTexture("rgba(0,0,0,.7)"),
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    this.mageShadow = part(
      this.scene,
      new T.PlaneGeometry(2.3, 2.3),
      shadowMat,
      0,
      0.13,
      0,
    );
    this.guardianShadow = part(
      this.scene,
      new T.PlaneGeometry(4.2, 4.2),
      shadowMat,
      0,
      0.13,
      -18,
    );
    this.mageShadow.rotation.x = this.guardianShadow.rotation.x = -Math.PI / 2;
    this.mageShadow.castShadow = this.guardianShadow.castShadow = false;
    const beamGeo = new T.BufferGeometry();
    beamGeo.setAttribute(
      "position",
      new T.BufferAttribute(this.positionBuffer, 3),
    );
    this.beam = new T.Line(
      beamGeo,
      new T.LineBasicMaterial({
        color: 0x7cf6e0,
        transparent: true,
        opacity: 0.8,
        toneMapped: false,
      }),
    );
    this.beam.frustumCulled = false;
    this.beam.visible = false;
    this.scene.add(this.beam, this.orbLight);
    const positions = new Float32Array(170 * 3);
    for (let i = 0; i < 170; i++) {
      positions[i * 3] = Math.sin(i * 7.13) * 29;
      positions[i * 3 + 1] = (i % 11) * 0.5 + 0.4;
      positions[i * 3 + 2] = Math.cos(i * 12.91) * 32 - 8;
    }
    const pg = new T.BufferGeometry();
    pg.setAttribute("position", new T.BufferAttribute(positions, 3));
    this.particles = new T.Points(
      pg,
      new T.PointsMaterial({
        map: radialTexture("rgba(255,211,146,1)"),
        color: 0xffd292,
        size: 0.09,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    this.scene.add(this.particles);
    // Distant stars give atmospheric depth, rather than an opaque foreground disc.
    const starPos = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      starPos[i * 3] = Math.sin(i * 13.1) * 140;
      starPos[i * 3 + 1] = 13 + (i % 31) * 2;
      starPos[i * 3 + 2] = -70 - Math.abs(Math.cos(i * 8.7)) * 90;
    }
    const starGeo = new T.BufferGeometry();
    starGeo.setAttribute("position", new T.BufferAttribute(starPos, 3));
    this.scene.add(
      new T.Points(
        starGeo,
        new T.PointsMaterial({
          color: 0xd2ddf7,
          size: 0.16,
          transparent: true,
          opacity: 0.65,
          fog: false,
        }),
      ),
    );
    // Subtle layered cloud banks stay beneath the playable surfaces.
    const cloudMap = radialTexture("rgba(99,132,174,.25)");
    for (let i = 0; i < 12; i++) {
      const cloud = new T.Mesh(
        new T.PlaneGeometry(28, 19),
        new T.MeshBasicMaterial({
          map: cloudMap,
          transparent: true,
          depthWrite: false,
          side: T.DoubleSide,
          opacity: 0.5,
        }),
      );
      cloud.rotation.x = -Math.PI / 2;
      cloud.position.set(
        Math.sin(i * 2.4) * 34,
        -9 - (i % 3),
        -10 + Math.cos(i * 2.4) * 35,
      );
      this.scene.add(cloud);
    }
    if (!this.low) this.createComposer();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(root);
  }
  private createComposer() {
    if (this.composer) return;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(
      new UnrealBloomPass(new T.Vector2(1, 1), 0.42, 0.5, 1.15),
    );
    this.composer.addPass(new OutputPass());
    this.composer.setSize(this.root.clientWidth, this.root.clientHeight);
  }
  resize() {
    const w = this.root.clientWidth,
      h = this.root.clientHeight;
    if (!w || !h) return;
    this.renderer.setPixelRatio(
      this.low
        ? Math.min(1, (this.software ? 480 : 960) / w)
        : Math.min(devicePixelRatio, 1.5),
    );
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
  }
  setQuality(low: boolean) {
    this.low = low;
    this.renderer.setPixelRatio(
      low
        ? Math.min(1, (this.software ? 480 : 960) / innerWidth)
        : Math.min(devicePixelRatio, 1.5),
    );
    this.renderer.shadowMap.enabled = !low;
    if (!low) this.createComposer();
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.resize();
  }
  setReduced(reduced: boolean) {
    this.reduced = reduced;
  }
  frame(dt: number) {
    this.renderElapsed += dt;
    // Leave time for input and local hand inference instead of queueing GPU work.
    const interval = this.low ? (this.software ? 1 / 15 : 1 / 30) : 1 / 60;
    if (this.renderElapsed < interval) return false;
    dt = Math.min(this.renderElapsed, 0.15);
    this.renderElapsed = 0;
    const s = this.sim,
      p = s.player,
      g = s.guardian;
    this.clock += Math.min(dt, 0.15);
    const t = this.clock;
    this.character.update(s, dt);
    this.guardian.position.set(g.x, 0, g.z);
    this.guardian.rotation.y = Math.atan2(p.x - g.x, p.z - g.z) + Math.PI;
    this.golem.update(g.state, s.status === "paused" ? 0 : Math.min(dt, 0.15));
    this.stone.position.set(s.stone.x, s.stone.y, s.stone.z);
    this.stone.rotation.y = s.stone.held ? t * 0.5 : 0.12;
    this.bridge.visible = s.bridge;
    this.environment.rune.rotation.z = -t * 0.1;
    this.mageShadow.position.set(p.x, 0.13, p.z);
    this.mageShadow.visible = p.y < 3 && Number.isFinite(s.floor);
    this.mageShadow.scale.setScalar(Math.max(0.5, 1 - p.y * 0.12));
    this.guardianShadow.position.set(g.x, 0.13, g.z);
    this.warning.visible = g.state === "windup";
    this.warning.position.set(g.attackX, 0.14, g.attackZ);
    this.warning.scale.setScalar(0.65 + (1 - g.timer / 1.35) * 0.35);
    this.beam.visible = s.stone.held;
    for (let i = 0; i < 12; i++) {
      const q = i / 11;
      this.positionBuffer[i * 3] = T.MathUtils.lerp(p.x, s.stone.x, q);
      this.positionBuffer[i * 3 + 1] =
        T.MathUtils.lerp(p.y + 1.2, s.stone.y, q) +
        Math.sin(q * Math.PI) * 0.45;
      this.positionBuffer[i * 3 + 2] = T.MathUtils.lerp(p.z, s.stone.z, q);
    }
    this.beam.geometry.attributes.position.needsUpdate = true;
    this.orbLight.position.set(p.x, p.y + 1.4, p.z - 0.5);
    this.orbLight.intensity = s.charge * 13;
    while (this.bolts.length > s.bolts.length) {
      const b = this.bolts.pop()!;
      this.scene.remove(b);
      b.geometry.dispose();
    }
    while (this.bolts.length < s.bolts.length) {
      const b = part(
        this.scene,
        new T.IcosahedronGeometry(0.21, 1),
        this.boltMaterial,
      );
      b.add(new T.Sprite(this.boltHalo));
      b.children[0].scale.set(3.8, 3.8, 1);
      this.bolts.push(b);
    }
    this.bolts.forEach((b, i) => {
      const v = s.bolts[i];
      b.position.set(v.x, v.y, v.z);
      b.scale.setScalar(0.7 + v.damage * 0.2);
    });
    if (!this.reduced) this.particles.rotation.y = t * 0.005;
    const title = s.status === "title";
    const target = title
      ? new T.Vector3(16.5 + Math.sin(t * 0.025), 11.5, 20)
      : new T.Vector3(
          p.x + Math.sin(p.yaw) * 7.8,
          p.y + 4.8,
          p.z + Math.cos(p.yaw) * 7.8,
        );
    const look = title
      ? new T.Vector3(0, 0.1, -8)
      : new T.Vector3(
          p.x - Math.sin(p.yaw) * 2,
          p.y + 0.8,
          p.z - Math.cos(p.yaw) * 2,
        );
    this.camera.position.lerp(
      target,
      this.cameraReady ? 1 - Math.exp(-dt * 5) : 1,
    );
    this.camera.lookAt(look);
    this.cameraReady = true;
    this.renderer.info.reset();
    if (this.composer && !this.low) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
    this.stats = {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    };
    return true;
  }
}
