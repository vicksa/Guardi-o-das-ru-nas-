import * as T from "three";
export function makeMaterials() {
  const size = 256,
    canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const n =
        Math.sin(x * 0.51 + Math.sin(y * 0.33) * 2) * 0.12 +
        Math.cos(y * 0.29 + x * 0.12) * 0.1 +
        Math.sin(x * 1.93 + y * 2.71) * 0.045 +
        Math.sin(x * 0.046) * Math.cos(y * 0.037) * 0.21;
      const h = 0.5 + n;
      heights[y * size + x] = h;
      const i = (y * size + x) * 4;
      image.data[i] = 117 + h * 45;
      image.data[i + 1] = 130 + h * 43;
      image.data[i + 2] = 153 + h * 42;
      image.data[i + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
  ctx.strokeStyle = "rgba(24,34,52,.38)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(68, 36);
  ctx.lineTo(50, 53);
  ctx.lineTo(83, 89);
  ctx.lineTo(79, 110);
  ctx.moveTo(256, 185);
  ctx.lineTo(219, 174);
  ctx.lineTo(203, 190);
  ctx.lineTo(171, 173);
  ctx.stroke();
  const color = new T.CanvasTexture(canvas);
  color.colorSpace = T.SRGBColorSpace;
  color.wrapS = color.wrapT = T.RepeatWrapping;
  color.anisotropy = 4;
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = normalCanvas.height = size;
  const nctx = normalCanvas.getContext("2d")!;
  const normals = nctx.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx =
          heights[y * size + ((x + 1) % size)] -
          heights[y * size + ((x + size - 1) % size)],
        dy =
          heights[((y + 1) % size) * size + x] -
          heights[((y + size - 1) % size) * size + x];
      normals.data[i] = 128 - dx * 150;
      normals.data[i + 1] = 128 - dy * 150;
      normals.data[i + 2] = 248;
      normals.data[i + 3] = 255;
    }
  nctx.putImageData(normals, 0, 0);
  const normal = new T.CanvasTexture(normalCanvas);
  normal.wrapS = normal.wrapT = T.RepeatWrapping;
  const stone = new T.MeshStandardMaterial({
    color: 0x6a7892,
    map: color,
    normalMap: normal,
    normalScale: new T.Vector2(0.48, 0.48),
    roughness: 0.88,
    metalness: 0.04,
  });
  const dark = stone.clone();
  dark.color.set(0x303e58);
  dark.roughness = 0.96;
  const pale = stone.clone();
  pale.color.set(0x9caac0);
  pale.roughness = 0.7;
  const gold = new T.MeshStandardMaterial({
    color: 0xd6a85e,
    roughness: 0.3,
    metalness: 0.78,
  });
  const glow = new T.MeshStandardMaterial({
    color: 0xffd89c,
    emissive: 0xffa744,
    emissiveIntensity: 2.5,
    roughness: 0.24,
    metalness: 0.3,
  });
  const cyan = new T.MeshStandardMaterial({
    color: 0xc0fff0,
    emissive: 0x47e5dc,
    emissiveIntensity: 1.8,
    roughness: 0.23,
    metalness: 0.2,
  });
  const moss = new T.MeshStandardMaterial({
    color: 0x366b65,
    roughness: 1,
    map: color,
  });
  const leaf = new T.MeshStandardMaterial({
    color: 0x306f5b,
    roughness: 0.84,
    side: T.DoubleSide,
  });
  const bark = new T.MeshStandardMaterial({
    color: 0x31414e,
    roughness: 0.97,
    normalMap: normal,
    normalScale: new T.Vector2(0.7, 0.5),
  });
  return { stone, dark, pale, gold, glow, cyan, moss, leaf, bark };
}
export type Materials = ReturnType<typeof makeMaterials>;
export function radialTexture(color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, color);
  g.addColorStop(0.25, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
export function runeTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.translate(128, 128);
  ctx.strokeStyle = "#b7fff1";
  ctx.lineWidth = 2;
  for (const r of [75, 87, 111]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 6);
    ctx.beginPath();
    ctx.moveTo(-5, -99);
    ctx.lineTo(0, -107);
    ctx.lineTo(5, -99);
    ctx.lineTo(0, -92);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    if (!i) ctx.moveTo(Math.cos(a) * 65, Math.sin(a) * 65);
    else ctx.lineTo(Math.cos(a) * 65, Math.sin(a) * 65);
  }
  ctx.closePath();
  ctx.stroke();
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
