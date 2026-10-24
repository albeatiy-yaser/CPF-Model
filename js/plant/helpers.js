// Small geometry helpers used to build the CPF equipment from basic shapes.
import * as THREE from 'three';

export const STREAMS = {
  well: { label: 'Well fluid (oil + gas + water)', color: '#ff6b6b' },
  oil: { label: 'Crude oil', color: '#f59e0b' },
  gas: { label: 'Gas', color: '#a3e635' },
  water: { label: 'Water', color: '#38bdf8' },
  chem: { label: 'Chemicals', color: '#c084fc' },
};

const std = (color, metalness = 0.5, roughness = 0.45, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

// Every equipment item gets its own set of materials, so it can be highlighted on its own.
export function makeMats() {
  return {
    steel: std(0xd3d8e0, 0.55, 0.36),
    darkSteel: std(0x5a616e, 0.6, 0.5),
    paint: std(0xeef1f5, 0.15, 0.55),
    yellow: std(0xe3b21f, 0.3, 0.5),
    blue: std(0x2f6fb5, 0.4, 0.45),
    green: std(0x3f8a5a, 0.35, 0.5),
    red: std(0xc8372d, 0.3, 0.5),
    concrete: std(0x6c7282, 0.05, 0.9),
    // Internals (only visible in X-ray mode)
    oilLayer: std(0xf59e0b, 0.1, 0.6, { transparent: true, opacity: 0.75 }),
    waterLayer: std(0x38bdf8, 0.1, 0.4, { transparent: true, opacity: 0.6 }),
    internal: std(0x9aa3b2, 0.5, 0.5),
    mesh: std(0x7d8696, 0.3, 0.8, { wireframe: true }),
    fire: std(0xff5a1f, 0.2, 0.5, { emissive: 0xff3d00, emissiveIntensity: 0.6 }),
  };
}

export function add(parent, geo, mat, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  m.castShadow = opts.cast !== false;
  m.receiveShadow = true;
  if (opts.shell) m.userData.shell = true;
  if (opts.internal) {
    m.userData.internal = true;
    m.visible = false;
    m.castShadow = false;
  }
  parent.add(m);
  return m;
}

export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cyl = (r, h, seg = 28, r2 = r) => new THREE.CylinderGeometry(r, r2, h, seg);

const UP = new THREE.Vector3(0, 1, 0);

// A straight cylinder between two points (used for pipes, legs, braces).
export function rod(parent, a, b, r, mat, opts = {}) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 1e-4) return null;
  const m = add(parent, cyl(r, len, opts.seg || 14), mat, 0, 0, 0, opts);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  return m;
}

// A pipe made of straight runs with round elbows at each corner.
export function pipeRun(parent, points, r, mat, opts = {}) {
  const pts = points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p)));
  for (let i = 0; i < pts.length - 1; i++) rod(parent, pts[i], pts[i + 1], r, mat, opts);
  for (let i = 1; i < pts.length - 1; i++) {
    add(parent, new THREE.SphereGeometry(r, 14, 10), mat, pts[i].x, pts[i].y, pts[i].z, opts);
  }
  return pts;
}

// Gate valve with a red handwheel. axis = 'x' or 'z' (pipe direction).
export function valve(parent, x, y, z, size, mats, axis = 'x') {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (axis === 'z') g.rotation.y = Math.PI / 2;
  add(g, box(size * 1.6, size * 1.4, size * 1.3), mats.darkSteel);
  add(g, cyl(size * 0.12, size * 1.4), mats.darkSteel, 0, size * 1.2, 0);
  add(g, new THREE.TorusGeometry(size * 0.6, size * 0.09, 8, 20), mats.red, 0, size * 1.9, 0, { rx: Math.PI / 2 });
  parent.add(g);
  return g;
}

// Pipe flange ring.
export function flange(parent, x, y, z, r, mats, axis = 'x') {
  const rot = axis === 'x' ? { rz: Math.PI / 2 } : axis === 'z' ? { rx: Math.PI / 2 } : {};
  return add(parent, cyl(r * 1.7, r * 0.5, 18), mats.darkSteel, x, y, z, rot);
}

// Vertical caged ladder.
export function ladder(parent, x, y0, y1, z, mats, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  const h = y1 - y0;
  add(g, box(0.06, h, 0.06), mats.yellow, -0.25, y0 + h / 2, 0);
  add(g, box(0.06, h, 0.06), mats.yellow, 0.25, y0 + h / 2, 0);
  for (let y = y0 + 0.3; y < y1; y += 0.4) add(g, box(0.5, 0.04, 0.04), mats.yellow, 0, y, 0, { cast: false });
  parent.add(g);
  return g;
}

// Round platform with a handrail around a vertical column.
export function platformRing(parent, cx, cz, rIn, y, mats, width = 1.1) {
  const rOut = rIn + width;
  const deck = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, 36), mats.darkSteel);
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(cx, y, cz);
  deck.material.side = THREE.DoubleSide;
  deck.receiveShadow = true;
  parent.add(deck);
  add(parent, new THREE.TorusGeometry(rOut, 0.04, 6, 40), mats.yellow, cx, y + 1.05, cz, { rx: Math.PI / 2, cast: false });
  add(parent, new THREE.TorusGeometry(rOut, 0.03, 6, 40), mats.yellow, cx, y + 0.55, cz, { rx: Math.PI / 2, cast: false });
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
    add(parent, box(0.05, 1.05, 0.05), mats.yellow, cx + Math.cos(a) * rOut, y + 0.52, cz + Math.sin(a) * rOut, { cast: false });
  }
}

// Concrete foundation pad.
export function pad(parent, x, z, w, d, mats, h = 0.3) {
  return add(parent, box(w, h, d), mats.concrete, x, h / 2, z, { cast: false });
}

// Horizontal pressure vessel along X with elliptical heads and two saddles.
// Returns key positions used for connecting pipes.
export function hVessel(parent, { len, r, cy, mats, saddleColor }) {
  const shellMat = mats.steel;
  add(parent, cyl(r, len, 40), shellMat, 0, cy, 0, { rz: Math.PI / 2, shell: true });
  for (const s of [-1, 1]) {
    const head = add(parent, new THREE.SphereGeometry(r, 40, 20), shellMat, s * len / 2, cy, 0, { shell: true });
    head.scale.set(0.45, 1, 1);
    // Saddle supports
    const sx = s * len * 0.32;
    add(parent, box(0.5, cy - r * 0.55, r * 1.7), saddleColor || mats.darkSteel, sx, (cy - r * 0.55) / 2, 0);
  }
  // Manway on the top
  add(parent, cyl(0.35, 0.5, 20), shellMat, -len * 0.1, cy + r + 0.15, 0);
  return {
    top: cy + r,
    bottom: cy - r,
    xIn: -len / 2 - r * 0.45,
    xOut: len / 2 + r * 0.45,
  };
}

// Liquid layers, diverter, weir and mist pad shown in X-ray mode.
export function separatorInternals(parent, { len, r, cy, mats, weir = true }) {
  const o = { internal: true };
  add(parent, box(len * 0.92, r * 0.5, r * 1.05), mats.waterLayer, 0, cy - r * 0.55, 0, o);
  add(parent, box(len * (weir ? 0.62 : 0.92), r * 0.4, r * 1.55), mats.oilLayer, weir ? -len * 0.13 : 0, cy - r * 0.1, 0, o);
  add(parent, box(0.08, r * 1.1, r * 1.3), mats.internal, -len / 2 + 0.9, cy + r * 0.1, 0, o);
  if (weir) add(parent, box(0.08, r * 0.95, r * 1.5), mats.internal, len * 0.2, cy - r * 0.45, 0, o);
  add(parent, box(r * 0.8, r * 0.3, r * 1.2), mats.mesh, len / 2 - 1.4, cy + r * 0.6, 0, o);
}
