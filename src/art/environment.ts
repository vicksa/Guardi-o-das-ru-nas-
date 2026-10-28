import * as T from "three";
import { platforms, WORLD } from "../simulation";
import { block, part, shape, torus, batch } from "./geometry";
import { radialTexture, runeTexture, type Materials } from "./materials";
export class Environment {
  bridge = new T.Group();
  stone = new T.Group();
  pedestal = new T.Group();
  rune: T.Mesh;
  portal: T.Group;
  light = new T.PointLight(0xffc477, 18, 7, 2);
  private runeMat: T.MeshBasicMaterial;
  constructor(
    private scene: T.Scene,
    private m: Materials,
  ) {
    this.runeMat = new T.MeshBasicMaterial({
      map: runeTexture(),
      color: 0x6fe9db,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      toneMapped: false,
    });
    for (const [i, p] of platforms.entries())
      this.island(p, i === 1 ? this.bridge : scene, i);
    scene.add(this.bridge);
    this.bridge.visible = false;
    this.pedestal.position.set(WORLD.pedestal.x, 0, WORLD.pedestal.z);
    scene.add(this.pedestal);
    part(
      this.pedestal,
      new T.CylinderGeometry(0.76, 1, 0.34, 16),
      m.dark,
      0,
      0.17,
      0,
    );
    part(
      this.pedestal,
      new T.CylinderGeometry(0.67, 0.76, 0.16, 16),
      m.gold,
      0,
      0.39,
      0,
    );
    this.rune = part(
      this.pedestal,
      new T.CircleGeometry(0.64, 48),
      this.runeMat,
      0,
      0.49,
      0,
    );
    this.rune.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      part(
        this.pedestal,
        new T.OctahedronGeometry(0.12),
        m.cyan,
        Math.cos(a) * 0.86,
        0.6,
        Math.sin(a) * 0.86,
      );
    }
    scene.add(this.stone);
    block(this.stone, m.dark, 0, 0, 0, 1.05, 1.05, 1.05);
    block(this.stone, m.gold, 0, -0.4, 0, 1.08, 0.09, 1.08);
    block(this.stone, m.gold, 0, 0.4, 0, 1.08, 0.09, 1.08);
    for (let i = 0; i < 4; i++) {
      const face = new T.Group();
      face.rotation.y = (i * Math.PI) / 2;
      this.stone.add(face);
      const mark = part(
        face,
        new T.PlaneGeometry(0.72, 0.72),
        this.runeMat,
        0,
        0,
        0.533,
      );
      mark.rotation.z = Math.PI / 4;
      part(face, new T.OctahedronGeometry(0.13), m.cyan, 0, 0, 0.56);
    }
    const contact = new T.Mesh(
      new T.PlaneGeometry(1.7, 1.7),
      new T.MeshBasicMaterial({
        map: radialTexture("rgba(0,0,0,.7)"),
        transparent: true,
        depthWrite: false,
      }),
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.05;
    this.pedestal.add(contact);
    this.portal = this.temple();
    scene.add(this.portal);
    this.light.position.set(0, 2, -23);
    scene.add(this.light);
    for (const z of [7, 2, -2, -10, -14, -23])
      for (const side of [-1, 1]) this.lantern(side * (z > -3 ? 5 : 3.4), z);
    const sky = new T.Group();
    for (let i = 0; i < 9; i++) {
      const x = (i % 2 ? 1 : -1) * (24 + i * 6),
        z = -22 - i * 8;
      part(sky, shape.rock, m.dark, x, -7 - (i % 3), z, 5 + (i % 3), 4, 4);
      block(sky, m.stone, x, -3 - (i % 3), z, 7, 0.7, 5);
      this.column(sky, x, -2.7 - (i % 3), z, 2.7);
    }
    batch(sky);
    scene.add(sky);
  }
  private island(
    p: { x: number; y: number; z: number; w: number; d: number },
    parent: T.Object3D,
    index: number,
  ) {
    const group = new T.Group();
    group.position.set(p.x, p.y, p.z);
    parent.add(group);
    block(group, this.m.dark, 0, -0.5, 0, p.w, 0.8, p.d);
    // Uneven cliff strata instead of an inverted geometric pyramid.
    for (let i = 0; i < 14; i++) {
      const a = (i * Math.PI * 2) / 14;
      const rx = Math.cos(a) * p.w * 0.35,
        rz = Math.sin(a) * p.d * 0.35;
      const rock = part(
        group,
        shape.rock,
        i % 3 ? this.m.dark : this.m.stone,
        rx,
        -(1.8 + (i % 3) * 0.6) - 0.7,
        rz,
        p.w * 0.2,
        1.8 + (i % 3) * 0.6,
        p.d * 0.18,
      );
      rock.rotation.set(i * 0.38, i * 1.1, i * 0.17);
    }
    part(
      group,
      shape.rock,
      this.m.dark,
      0,
      -4.3,
      0,
      p.w * 0.32,
      3.4,
      p.d * 0.32,
    ).rotation.y = index;
    const nx = Math.floor(p.w / 1.15),
      nz = Math.floor(p.d / 1.3);
    for (let x = 0; x < nx; x++)
      for (let z = 0; z < nz; z++) {
        const px = (x - (nx - 1) / 2) * 1.16,
          pz = (z - (nz - 1) / 2) * 1.32;
        const tile = block(
          group,
          (x + z * 3) % 7 ? this.m.stone : this.m.pale,
          px,
          0.015 + Math.sin(x * 31 + z) * 0.018,
          pz,
          1.09,
          0.14,
          1.24,
        );
        tile.rotation.y = Math.sin(x * 27 + z * 5) * 0.035;
      }
    // Moss cushions, roots, ferns and pebbles stay along the edges of the route.
    if (index !== 1) {
      for (let i = 0; i < 18; i++) {
        const a = i * 2.399;
        const x = Math.cos(a) * (p.w * 0.45),
          z = Math.sin(a) * (p.d * 0.45);
        part(group, shape.rock, this.m.moss, x, 0.09, z, 0.6, 0.12, 0.45);
        this.fern(group, x, 0.1, z, 0.6 + (i % 4) * 0.15);
        if (i % 3 === 0) {
          const rock = part(
            group,
            shape.rock,
            this.m.stone,
            x,
            0.2,
            z,
            0.37,
            0.25,
            0.42,
          );
          rock.rotation.y = i;
        }
      }
      for (const side of [-1, 1])
        for (let j = 0; j < 2; j++)
          this.tree(
            group,
            side * (p.w / 2 - 0.65),
            0,
            (j ? 1 : -1) * p.d * 0.34,
            index + j,
          );
    }
    batch(group);
  }
  private fern(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    scale: number,
  ) {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    parent.add(g);
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7;
      const curve = new T.CatmullRomCurve3([
        new T.Vector3(0, 0, 0),
        new T.Vector3(Math.cos(a) * 0.3, 0.6, Math.sin(a) * 0.3),
        new T.Vector3(Math.cos(a) * 0.7, 0.42, Math.sin(a) * 0.7),
      ]);
      part(g, new T.TubeGeometry(curve, 6, 0.013, 3, false), this.m.moss);
      for (let j = 1; j < 5; j++) {
        const t = j / 5,
          p = curve.getPoint(t);
        for (const side of [-1, 1]) {
          const leafShape = new T.Shape();
          leafShape.moveTo(0, 0);
          leafShape.quadraticCurveTo(0.17, 0.06, 0.22, 0.29);
          leafShape.quadraticCurveTo(0.02, 0.2, 0, 0);
          const leaf = part(
            g,
            new T.ShapeGeometry(leafShape),
            this.m.leaf,
            p.x,
            p.y,
            p.z,
          );
          leaf.rotation.set(-0.4, a + side * 0.7, side * 0.6);
          leaf.scale.setScalar(1 - t * 0.55);
        }
      }
    }
  }
  private tree(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    seed: number,
  ) {
    const group = new T.Group();
    group.position.set(x, y, z);
    parent.add(group);
    const height = 1.7 + (seed % 3) * 0.35;
    const trunk = new T.CatmullRomCurve3([
      new T.Vector3(0, 0, 0),
      new T.Vector3(0.1, height * 0.4, 0.05),
      new T.Vector3(-0.13, height, 0.1),
    ]);
    part(group, new T.TubeGeometry(trunk, 9, 0.105, 6, false), this.m.bark);
    for (let i = 0; i < 4; i++) {
      const a = i * 2.4 + seed;
      const leaf = part(
        group,
        shape.sphere,
        this.m.leaf,
        Math.cos(a) * 0.35,
        height + Math.sin(i) * 0.2,
        Math.sin(a) * 0.35,
        0.62,
        0.33,
        0.55,
      );
      leaf.rotation.set(0.1, a, 0.12);
    }
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1;
      part(
        group,
        new T.TubeGeometry(
          new T.CatmullRomCurve3([
            new T.Vector3(0, 0.2, 0),
            new T.Vector3(Math.cos(a) * 0.35, 0.05, Math.sin(a) * 0.35),
            new T.Vector3(Math.cos(a) * 0.7, 0.02, Math.sin(a) * 0.7),
          ]),
          5,
          0.05,
          4,
          false,
        ),
        this.m.bark,
      );
    }
  }
  private column(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    h: number,
  ) {
    const g = new T.Group();
    g.position.set(x, y, z);
    parent.add(g);
    block(g, this.m.dark, 0, 0.13, 0, 1.3, 0.26, 1.3);
    block(g, this.m.pale, 0, 0.34, 0, 1.06, 0.17, 1.06);
    const profile = [
      new T.Vector2(0.46, 0.4),
      new T.Vector2(0.46, 0.52),
      new T.Vector2(0.35, 0.64),
      new T.Vector2(0.32, h - 0.3),
      new T.Vector2(0.45, h - 0.18),
      new T.Vector2(0.46, h),
    ];
    part(g, new T.LatheGeometry(profile, 16), this.m.stone);
    for (const yy of [0.55, h - 0.25])
      torus(g, this.m.gold, 0.41, 0, yy, 0, 0.035);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      part(
        g,
        shape.cylinder,
        this.m.pale,
        Math.cos(a) * 0.326,
        h * 0.52,
        Math.sin(a) * 0.326,
        0.024,
        h - 0.95,
        0.024,
      );
    }
    block(g, this.m.pale, 0, h + 0.15, 0, 1.15, 0.3, 1.15);
    block(g, this.m.dark, 0, h + 0.34, 0, 1.3, 0.12, 1.3);
  }
  private temple() {
    const g = new T.Group();
    for (const z of [-16.2, -22.8])
      for (const x of [-5, 5]) this.column(g, x, 0, z, 4.7);
    for (const z of [-16.2, -22.8]) {
      const intact = z < -20;
      block(
        g,
        this.m.dark,
        intact ? 0 : -2.8,
        5.2,
        z,
        intact ? 11 : 5.5,
        0.55,
        1.25,
      );
      for (let i = 0; i < (intact ? 11 : 5); i++)
        block(g, this.m.pale, (intact ? -5 : -5.2) + i, 5.4, z, 0.7, 0.23, 1.4);
    }
    for (let i = 0; i < 13; i++) {
      const a = ((i + 0.5) / 13) * Math.PI;
      const stone = block(
        g,
        this.m.pale,
        Math.cos(a) * 2.6,
        0.6 + Math.sin(a) * 3.5,
        -24,
        0.64,
        0.88,
        1.05,
      );
      stone.rotation.z = a - Math.PI / 2;
      block(
        g,
        this.m.gold,
        Math.cos(a) * 2.29,
        0.6 + Math.sin(a) * 3.1,
        -23.45,
        0.14,
        0.16,
        0.08,
      );
    }
    const portal = part(
      g,
      new T.CircleGeometry(2.1, 64),
      this.runeMat,
      0,
      2.3,
      -23.9,
    );
    portal.scale.y = 1.15;
    torus(g, this.m.cyan, 2.18, 0, 2.3, -23.86, 0.045).rotation.x = 0;
    for (const side of [-1, 1])
      for (let i = 0; i < 7; i++) {
        const chunk = part(
          g,
          shape.rock,
          this.m.dark,
          side * (5.8 + Math.sin(i) * 0.4),
          0.3 + (i % 3) * 0.12,
          -15 - i * 1.5,
          0.56,
          0.35,
          0.5,
        );
        chunk.rotation.y = i;
      }
    const arena = part(
      g,
      new T.CircleGeometry(5.1, 64),
      new T.MeshBasicMaterial({
        map: runeTexture(),
        color: 0x83b5d0,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
      0,
      0.11,
      -20,
    );
    arena.rotation.x = -Math.PI / 2;
    batch(g);
    return g;
  }
  private lantern(x: number, z: number) {
    const g = new T.Group();
    g.position.set(x, 0, z);
    this.scene.add(g);
    block(g, this.m.dark, 0, 0.22, 0, 0.52, 0.44, 0.52);
    part(
      g,
      new T.CylinderGeometry(0.21, 0.3, 0.17, 8),
      this.m.gold,
      0,
      0.52,
      0,
    );
    part(g, new T.OctahedronGeometry(0.18), this.m.glow, 0, 0.88, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i * 2 * Math.PI) / 3;
      const claw = part(
        g,
        shape.box,
        this.m.gold,
        Math.cos(a) * 0.22,
        0.71,
        Math.sin(a) * 0.22,
        0.035,
        0.4,
        0.035,
      );
      claw.rotation.z = Math.cos(a) * -0.3;
    }
    batch(g);
    const halo = new T.Sprite(
      new T.SpriteMaterial({
        map: radialTexture("rgba(255,171,76,.7)"),
        transparent: true,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.position.y = 0.85;
    halo.scale.set(1.6, 1.6, 1);
    g.add(halo);
  }
}
