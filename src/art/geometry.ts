import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
export const shape = {
  box: new RoundedBoxGeometry(1, 1, 1, 2, 0.09),
  sphere: new T.SphereGeometry(1, 18, 12),
  rock: new T.IcosahedronGeometry(1, 1),
  cylinder: new T.CylinderGeometry(1, 1, 1, 12),
};
export function part(
  parent: T.Object3D,
  geo: T.BufferGeometry,
  material: T.Material,
  x = 0,
  y = 0,
  z = 0,
  sx = 1,
  sy = 1,
  sz = 1,
) {
  const m = new T.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function block(
  parent: T.Object3D,
  material: T.Material,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
) {
  return part(parent, shape.box, material, x, y, z, w, h, d);
}
export function torus(
  parent: T.Object3D,
  material: T.Material,
  r: number,
  x: number,
  y: number,
  z: number,
  tube = 0.025,
) {
  const m = part(
    parent,
    new T.TorusGeometry(r, tube, 6, 48),
    material,
    x,
    y,
    z,
  );
  m.rotation.x = Math.PI / 2;
  return m;
}
/** Bake static groups per material, preserving normals/UVs and group space. */
export function batch(group: T.Group) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert();
  const bins = new Map<T.Material, T.BufferGeometry[]>();
  group.traverse((obj) => {
    if (!(obj instanceof T.Mesh) || Array.isArray(obj.material)) return;
    let geo = obj.geometry.index
      ? obj.geometry.toNonIndexed()
      : obj.geometry.clone();
    geo.applyMatrix4(inverse.clone().multiply(obj.matrixWorld));
    const list = bins.get(obj.material) ?? [];
    list.push(geo);
    bins.set(obj.material, list);
  });
  group.clear();
  for (const [mat, list] of bins) {
    const geo = BufferGeometryUtils.mergeGeometries(list);
    for (const item of list) item.dispose();
    if (geo) {
      const m = new T.Mesh(geo, mat);
      m.castShadow = m.receiveShadow = true;
      group.add(m);
    }
  }
}
