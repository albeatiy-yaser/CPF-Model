// Builders for each piece of CPF equipment. Each one draws into a group in local
// coordinates (the layout moves the group into place) and returns its label height.
import * as THREE from 'three';
import {
  add, box, cyl, rod, pipeRun, valve, flange, ladder, platformRing, pad,
  hVessel, separatorInternals,
} from './helpers.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PI = Math.PI;

function nozzleUp(g, x, y, z, r, m) {
  rod(g, V(x, y - 0.3, z), V(x, y + 0.25, z), r, m.steel);
  add(g, cyl(r * 1.7, 0.12, 18), m.darkSteel, x, y + 0.25, z);
}
function nozzleX(g, x, y, z, r, m, dir = 1) {
  rod(g, V(x - dir * 0.4, y, z), V(x + dir * 0.25, y, z), r, m.steel);
  flange(g, x + dir * 0.25, y, z, r, m, 'x');
}
function psv(g, x, y, m) {
  add(g, cyl(0.12, 0.5), m.steel, x, y + 0.25, 0);
  add(g, cyl(0.2, 0.55, 14, 0.14), m.red, x, y + 0.75, 0);
}
function levelBridle(g, x, cy, r, z, m) {
  add(g, cyl(0.07, r * 1.6), m.steel, x, cy, z);
  rod(g, V(x, cy + r * 0.7, z), V(x, cy + r * 0.7, z * 0.6), 0.05, m.steel);
  rod(g, V(x, cy - r * 0.7, z), V(x, cy - r * 0.7, z * 0.6), 0.05, m.steel);
  add(g, box(0.18, 0.3, 0.18), m.blue, x, cy + r * 0.85, z);
}
function transformer(g, x, top, m) {
  add(g, box(1.6, 0.15, 1.4), m.darkSteel, x, top + 0.05, 0);
  add(g, box(1.3, 1.2, 1.1), m.green, x, top + 0.75, 0);
  for (let i = -2; i <= 2; i++) add(g, box(0.05, 0.9, 0.35), m.green, x + i * 0.22, top + 0.7, 0.72);
  add(g, cyl(0.12, 0.6, 12), m.paint, x, top + 1.65, 0);
  for (let k = 0; k < 3; k++) add(g, cyl(0.2, 0.05, 12), m.paint, x, top + 1.5 + k * 0.16, 0);
}

export const BUILDERS = {
  manifold(g, m) {
    pad(g, 0, 0, 9, 20, m);
    // Production header (x=1, y=1.2) and test header (x=3, y=2.4), both along Z
    rod(g, V(1, 1.2, -9), V(1, 1.2, 8.6), 0.35, m.steel);
    add(g, new THREE.SphereGeometry(0.35, 16, 10), m.steel, 1, 1.2, 8.6);
    rod(g, V(3, 2.4, -8.6), V(3, 2.4, 8), 0.25, m.steel);
    add(g, new THREE.SphereGeometry(0.25, 16, 10), m.steel, 3, 2.4, -8.6);
    for (const z of [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]) {
      rod(g, V(-4.5, 1.2, z), V(1, 1.2, z), 0.18, m.steel);
      flange(g, -3.8, 1.2, z, 0.18, m, 'x');
      valve(g, -2.7, 1.2, z, 0.28, m, 'x');
      add(g, box(0.5, 0.42, 0.42), m.darkSteel, -1.4, 1.2, z); // check valve
      add(g, cyl(0.035, 0.55), m.darkSteel, -3.3, 1.55, z);
      add(g, cyl(0.15, 0.06, 16), m.paint, -3.3, 1.9, z, { rx: PI / 2 });
      pipeRun(g, [[0, 1.2, z], [0, 2.4, z], [3, 2.4, z]], 0.13, m.steel);
      valve(g, 1.9, 2.4, z, 0.2, m, 'x');
    }
    // Sleepers
    add(g, box(0.5, 0.75, 17), m.concrete, -3.3, 0.55, 0);
    for (const z of [-8.4, -3, 3, 8.2]) add(g, box(1.1, 0.75, 0.5), m.concrete, 1, 0.55, z);
    for (const z of [-6, 0, 6]) add(g, box(0.4, 2.2, 0.4), m.darkSteel, 3, 1.2, z);
    return 5;
  },

  testSep(g, m) {
    const len = 6, r = 0.8, cy = 1.9;
    pad(g, 0, 0, 9, 3.4, m);
    const v = hVessel(g, { len, r, cy, mats: m });
    separatorInternals(g, { len, r, cy, mats: m });
    nozzleX(g, v.xIn, cy + 0.3, 0, 0.14, m, -1);
    nozzleX(g, v.xOut, cy - 0.4, 0, 0.14, m, 1);
    nozzleUp(g, 2, v.top, 0, 0.13, m);
    add(g, cyl(0.25, 0.7, 16), m.blue, 2, 4.2, 0); // gas meter
    add(g, box(0.7, 0.6, 0.6), m.blue, 4.6, cy - 0.4, 0); // liquid meter
    psv(g, -1.6, v.top, m);
    levelBridle(g, 0.8, cy, r, 1.0, m);
    return 4.6;
  },

  hpSep(g, m) {
    const len = 12, r = 1.5, cy = 2.7;
    pad(g, 0, 0, 15, 4.4, m);
    const v = hVessel(g, { len, r, cy, mats: m });
    separatorInternals(g, { len, r, cy, mats: m });
    nozzleX(g, v.xIn, cy + 0.6, 0, 0.3, m, -1);
    nozzleX(g, v.xOut, cy - 0.8, 0, 0.25, m, 1);
    nozzleUp(g, 4.5, v.top, 0, 0.22, m);
    add(g, cyl(0.2, 0.4), m.steel, -2.5, v.bottom - 0.1, 0);
    psv(g, 2, v.top, m);
    levelBridle(g, -3.6, cy, r, 1.8, m);
    levelBridle(g, 2.8, cy - 0.4, r * 0.8, 1.8, m);
    ladder(g, -0.2, 0.3, v.top + 0.1, 1.75, m);
    return 6;
  },

  lpSep(g, m) {
    const len = 10, r = 1.3, cy = 2.5;
    pad(g, 0, 0, 13, 3.8, m);
    const v = hVessel(g, { len, r, cy, mats: m });
    const o = { internal: true };
    add(g, box(len * 0.92, r * 0.75, r * 1.5), m.oilLayer, 0, cy - r * 0.4, 0, o);
    add(g, box(0.08, r * 1.1, r * 1.3), m.internal, -len / 2 + 0.9, cy + r * 0.1, 0, o);
    for (const x of [-1, 0.6, 2.2]) add(g, box(0.06, r * 0.7, r * 1.3), m.internal, x, cy + r * 0.25, 0, o);
    add(g, box(r * 0.8, r * 0.3, r * 1.2), m.mesh, len / 2 - 1.3, cy + r * 0.6, 0, o);
    nozzleUp(g, -4, v.top, 0, 0.25, m);
    nozzleX(g, v.xOut, cy - 0.7, 0, 0.25, m, 1);
    nozzleUp(g, 3.7, v.top, 0, 0.22, m);
    psv(g, 1.5, v.top, m);
    levelBridle(g, 1.2, cy, r, 1.55, m);
    return 5.6;
  },

  heaterTreater(g, m) {
    const len = 10, r = 1.5, cy = 2.7;
    pad(g, 0, 0, 14, 4.4, m);
    const v = hVessel(g, { len, r, cy, mats: m });
    nozzleUp(g, -3.5, v.top, 0, 0.25, m);
    nozzleUp(g, -1, v.top, 0, 0.18, m);
    nozzleUp(g, 1.5, v.top, 0, 0.25, m);
    add(g, cyl(0.2, 0.4), m.steel, -2.5, v.bottom - 0.1, 0);
    // Burner box at the east head and the exhaust stack
    add(g, box(1.3, 1.3, 1.3), m.darkSteel, v.xOut + 0.55, cy - 0.5, 0);
    add(g, cyl(0.3, 0.5, 16), m.red, v.xOut + 1.35, cy - 0.5, 0, { rz: PI / 2 });
    add(g, cyl(0.35, 6.6, 20), m.darkSteel, 3.8, v.top + 3.0, 0.9);
    add(g, cyl(0.6, 0.3, 20, 0.2), m.darkSteel, 3.8, v.top + 6.6, 0.9);
    psv(g, 0.2, v.top, m);
    levelBridle(g, -4.2, cy - 0.3, r, 1.8, m);
    // Internals: U-shaped fire tube, coalescing pack, liquid layers
    const o = { internal: true };
    rod(g, V(4.8, cy - 0.2, 0), V(-1.5, cy - 0.2, 0), 0.28, m.fire, o);
    rod(g, V(4.8, cy - 1.0, 0), V(-1.5, cy - 1.0, 0), 0.28, m.fire, o);
    add(g, new THREE.TorusGeometry(0.4, 0.28, 10, 16, PI), m.fire, -1.5, cy - 0.6, 0, { ...o, rz: PI / 2 });
    add(g, box(2.2, r * 0.8, r * 1.4), m.mesh, -3.4, cy + 0.2, 0, o);
    add(g, box(len * 0.92, r * 0.45, r * 1.0), m.waterLayer, 0, cy - r * 0.6, 0, o);
    add(g, box(len * 0.92, r * 0.7, r * 1.6), m.oilLayer, 0, cy + 0.05, 0, o);
    return 7.2;
  },

  dehydrator(g, m) {
    const len = 12, r = 1.6, cy = 2.9;
    pad(g, 0, 0, 15, 4.6, m);
    const v = hVessel(g, { len, r, cy, mats: m });
    nozzleUp(g, -4.8, v.top, 0, 0.25, m);
    nozzleUp(g, 4.5, v.top, 0, 0.25, m);
    add(g, cyl(0.2, 0.4), m.steel, -2.5, v.bottom - 0.1, 0);
    transformer(g, -2.8, v.top, m);
    transformer(g, 2.0, v.top, m);
    psv(g, 0.2, v.top, m);
    levelBridle(g, -4.2, cy - 0.4, r, 1.9, m);
    ladder(g, 3.4, 0.3, v.top + 0.1, 1.85, m);
    const o = { internal: true };
    add(g, box(len * 0.75, 0.05, r * 1.5), m.mesh, 0, cy + 0.25, 0, o);
    add(g, box(len * 0.75, 0.05, r * 1.5), m.mesh, 0, cy + 0.7, 0, o);
    add(g, box(len * 0.92, r * 0.45, r * 1.0), m.waterLayer, 0, cy - r * 0.62, 0, o);
    add(g, box(len * 0.92, r * 0.9, r * 1.6), m.oilLayer, 0, cy + 0.15, 0, o);
    return 7.2;
  },

  desalter(g, m) {
    const len = 11, r = 1.6, cy = 2.9;
    pad(g, 0, 0, 14, 4.6, m);
    const v = hVessel(g, { len, r, cy, mats: m });
    nozzleX(g, v.xIn, cy, 0, 0.25, m, -1);
    nozzleUp(g, 4.0, v.top, 0, 0.25, m);
    add(g, cyl(0.2, 0.4), m.steel, -2.5, v.bottom - 0.1, 0);
    transformer(g, -2.6, v.top, m);
    transformer(g, 1.6, v.top, m);
    psv(g, -0.4, v.top, m);
    levelBridle(g, -3.9, cy - 0.4, r, 1.9, m);
    // Mixing valve on the inlet riser (world x 17.2) and wash water quill (world x 15)
    add(g, box(0.8, 0.9, 0.8), m.blue, -8.8, 4.2, 0);
    add(g, cyl(0.28, 0.7, 16), m.darkSteel, -8.8, 4.2, 0.75, { rx: PI / 2 });
    add(g, box(0.35, 0.35, 0.5), m.yellow, -11, 5.6, 0);
    const o = { internal: true };
    add(g, box(len * 0.75, 0.05, r * 1.5), m.mesh, 0, cy + 0.25, 0, o);
    add(g, box(len * 0.75, 0.05, r * 1.5), m.mesh, 0, cy + 0.7, 0, o);
    add(g, box(len * 0.92, r * 0.5, r * 1.0), m.waterLayer, 0, cy - r * 0.6, 0, o);
    add(g, box(len * 0.92, r * 0.85, r * 1.6), m.oilLayer, 0, cy + 0.15, 0, o);
    return 7.2;
  },

  stabilizer(g, m) {
    const r = 1.2;
    add(g, cyl(2.2, 0.4, 32), m.concrete, 0, 0.2, 0, { cast: false });
    add(g, cyl(r + 0.05, 1.7, 32), m.darkSteel, 0, 1.25, 0);
    add(g, cyl(r, 24, 36), m.steel, 0, 14, 0, { shell: true });
    const head = add(g, new THREE.SphereGeometry(r, 32, 16), m.steel, 0, 26, 0, { shell: true });
    head.scale.set(1, 0.5, 1);
    nozzleUp(g, 0, 26.6, 0, 0.22, m);
    rod(g, V(-1.7, 20, 0), V(-1.0, 20, 0), 0.25, m.steel);
    rod(g, V(1.0, 2.6, 0), V(1.6, 2.6, 0), 0.25, m.steel);
    for (const y of [8, 15, 22]) platformRing(g, 0, 0, r, y, m);
    ladder(g, 0, 0.4, 22.9, -1.75, m);
    psv(g, 0.6, 26.2, m);
    // Reboiler (horizontal exchanger) on the north side
    add(g, cyl(0.55, 4, 24), m.steel, 2, 1.6, 3.6, { rz: PI / 2 });
    for (const s of [-1, 1]) {
      add(g, new THREE.SphereGeometry(0.55, 20, 12), m.steel, 2 + s * 2, 1.6, 3.6).scale.set(0.4, 1, 1);
      add(g, box(0.3, 1.1, 0.9), m.darkSteel, 2 + s * 1.3, 0.55, 3.6);
    }
    pipeRun(g, [[0.3, 5, 1.0], [0.3, 5, 3.6], [0.3, 2.15, 3.6]], 0.2, m.steel);
    pipeRun(g, [[-0.4, 2.3, 1.1], [-0.4, 2.3, 2.5], [1.2, 2.3, 2.5], [1.2, 1.9, 3.3]], 0.14, m.steel);
    const o = { internal: true };
    for (let y = 3.2; y < 25.5; y += 1.1) add(g, cyl(r * 0.92, 0.06, 28), m.internal, 0, y, 0, o);
    add(g, cyl(r * 0.92, 1.0, 28), m.oilLayer, 0, 2.6, 0, o);
    return 30;
  },

  tanks(g, m) {
    const R = 10, H = 13, base = 0.4;
    const shellMat = m.paint;
    shellMat.side = THREE.DoubleSide;
    for (const z of [-15, 15]) {
      add(g, cyl(R + 0.6, base, 64), m.concrete, 0, base / 2, z, { cast: false });
      add(g, new THREE.CylinderGeometry(R, R, H, 72, 1, true), shellMat, 0, base + H / 2, z, { shell: true });
      add(g, new THREE.TorusGeometry(R, 0.12, 6, 72), m.darkSteel, 0, base + H, z, { rx: PI / 2 });
      add(g, new THREE.TorusGeometry(R + 0.1, 0.15, 6, 72), m.darkSteel, 0, base + H - 1.2, z, { rx: PI / 2 });
      add(g, new THREE.TorusGeometry(R + 0.25, 0.07, 6, 72), m.red, 0, base + H + 0.3, z, { rx: PI / 2, cast: false });
      // Floating roof with pontoon ring and rolling ladder
      add(g, cyl(R - 0.15, 0.45, 64), m.darkSteel, 0, base + 10.4, z);
      add(g, new THREE.TorusGeometry(R - 0.7, 0.32, 8, 64), m.steel, 0, base + 10.7, z, { rx: PI / 2 });
      rod(g, V(R - 0.6, base + H + 0.1, z), V(R - 6, base + 10.7, z), 0.12, m.yellow);
      // Spiral stairway around the shell
      const steps = 44, a0 = PI * 0.6, rail = [];
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1), a = a0 + t * 1.9, y = base + 0.3 + t * (H - 0.2);
        add(g, box(1.0, 0.08, 0.55), m.darkSteel, Math.cos(a) * (R + 0.6), y, z + Math.sin(a) * (R + 0.6), { ry: -a, cast: false });
        if (i % 4 === 0 || i === steps - 1) rail.push(V(Math.cos(a) * (R + 1.1), y + 1, z + Math.sin(a) * (R + 1.1)));
      }
      pipeRun(g, rail, 0.05, m.yellow, { cast: false });
      // Foam chambers, radar gauge, mixer, nozzles
      for (const a of [0.3, 1.9, 3.5, 5.1]) add(g, box(0.6, 0.8, 0.6), m.red, Math.cos(a) * (R + 0.3), base + H - 0.4, z + Math.sin(a) * (R + 0.3));
      add(g, box(0.5, 0.5, 0.5), m.blue, 0, base + H + 0.35, z - R + 0.4);
      add(g, cyl(0.45, 1.2, 16), m.blue, Math.cos(4.2) * (R + 0.6), base + 1.2, z + Math.sin(4.2) * (R + 0.6), { rz: PI / 2, ry: -4.2 });
      nozzleX(g, -R, 1.5, z, 0.3, m, -1);
      nozzleX(g, R, 1.2, z, 0.3, m, 1);
      const o = { internal: true };
      add(g, cyl(R - 0.2, 9.4, 48), m.oilLayer, 0, base + 0.6 + 4.7, z, o);
      add(g, cyl(R - 0.2, 0.6, 48), m.waterLayer, 0, base + 0.3, z, o);
    }
    // Bund wall around both tanks
    const wall = (w, d, x, z) => add(g, box(w, 0.8, d), m.concrete, x, 0.4, z, { cast: false });
    wall(28.4, 0.4, 0, -29); wall(28.4, 0.4, 0, 29); wall(0.4, 58, -14, 0); wall(0.4, 58, 14, 0);
    return 17;
  },

  pumps(g, m) {
    pad(g, 0, 1, 9.5, 16, m);
    for (const z of [-5, 0, 5]) {
      add(g, box(4.4, 0.3, 1.5), m.darkSteel, 0, 0.45, z);
      add(g, cyl(0.55, 1.8, 24), m.green, -1.4, 1.3, z, { rz: PI / 2 });
      add(g, cyl(0.3, 0.4, 16), m.darkSteel, -2.5, 1.3, z, { rz: PI / 2 });
      add(g, box(0.7, 0.55, 0.55), m.yellow, -0.15, 1.3, z);
      add(g, cyl(0.6, 2.0, 24), m.blue, 1.3, 1.3, z, { rz: PI / 2 });
      add(g, cyl(0.5, 0.3, 20), m.darkSteel, 2.45, 1.3, z, { rz: PI / 2 });
      add(g, box(0.45, 0.4, 0.45), m.blue, 1.3, 2.05, z);
      for (const x of [-1.9, -0.9]) add(g, box(0.25, 0.7, 0.9), m.darkSteel, x, 0.85, z);
      rod(g, V(-3.5, 1.2, z), V(-2.7, 1.2, z), 0.25, m.steel);
      valve(g, -3.05, 1.2, z, 0.3, m, 'x');
      rod(g, V(-1.4, 1.8, z), V(-1.4, 2.8, z), 0.22, m.steel);
      add(g, box(0.45, 0.4, 0.45), m.darkSteel, -1.4, 2.25, z);
    }
    rod(g, V(-3.5, 1.2, -6), V(-3.5, 1.2, 6), 0.35, m.steel);
    pipeRun(g, [[-1.4, 2.8, -5], [-1.4, 2.8, 7.5], [6, 2.8, 7.5]], 0.3, m.steel);
    for (const [x, z] of [[-1.4, 7.5], [3, 7.5], [-3.5, -6], [-3.5, 6]]) {
      const top = x === -3.5 ? 1.0 : 2.5;
      add(g, box(0.3, top, 0.3), m.darkSteel, x, top / 2, z);
    }
    return 5;
  },

  metering(g, m) {
    pad(g, 0, 2.5, 13, 21, m);
    rod(g, V(-4, 1.4, -3.3), V(-4, 1.4, 3), 0.3, m.steel);
    rod(g, V(4, 1.4, -3.3), V(4, 1.4, 3), 0.3, m.steel);
    for (const z of [-2.5, 0, 2.5]) {
      rod(g, V(-4, 1.4, z), V(4, 1.4, z), 0.2, m.steel);
      valve(g, -2.9, 1.4, z, 0.25, m, 'x');
      valve(g, 2.9, 1.4, z, 0.25, m, 'x');
      add(g, cyl(0.38, 1.1, 20), m.blue, 0, 1.4, z, { rz: PI / 2 });
      flange(g, -0.6, 1.4, z, 0.22, m, 'x');
      flange(g, 0.6, 1.4, z, 0.22, m, 'x');
      add(g, cyl(0.04, 0.5), m.darkSteel, 0, 2.0, z);
      add(g, box(0.25, 0.25, 0.25), m.paint, 0, 2.3, z);
      add(g, box(0.4, 0.5, 0.4), m.darkSteel, -1.6, 2.0, z); // P & T transmitters
    }
    add(g, cyl(0.38, 0.9, 18), m.darkSteel, -5.2, 1.25, 0); // strainer
    add(g, cyl(0.12, 0.6, 12), m.blue, 5, 1.95, 0); // BS&W probe
    add(g, box(0.7, 1.2, 0.6), m.paint, 5.6, 0.9, 1.2); // sampler cabinet
    valve(g, 6.8, 1.4, 0, 0.28, m, 'x'); // divert valve
    // Meter prover loop
    pipeRun(g, [[4, 1.4, 3], [4, 1.4, 11], [-4, 1.4, 11], [-4, 1.4, 3]], 0.35, m.steel);
    add(g, cyl(0.6, 1.8, 20), m.steel, -4, 1.4, 7, { rx: PI / 2 });
    add(g, box(0.9, 0.9, 0.9), m.red, 4, 1.4, 7);
    for (const [x, z] of [[4, 5], [4, 9.5], [-4, 9.5], [0, 11]]) add(g, box(0.5, 1.0, 0.5), m.concrete, x, 0.6, z);
    // Analyzer house and flow computer cabinet
    add(g, box(3.4, 2.8, 2.6), m.paint, 0, 1.7, -6);
    add(g, box(3.7, 0.15, 2.9), m.darkSteel, 0, 3.15, -6);
    add(g, box(0.9, 1.9, 0.05), m.darkSteel, 0.6, 1.25, -4.68);
    add(g, box(0.8, 0.6, 0.5), m.paint, -1.9, 2.0, -6);
    add(g, box(0.8, 1.8, 0.5), m.darkSteel, -3.4, 1.2, -4.5);
    return 5;
  },

  chemicals(g, m) {
    pad(g, 0, 0, 10, 6.6, m);
    for (const [w, d, x, z] of [[10, 0.2, 0, -3.2], [10, 0.2, 0, 3.2], [0.2, 6.6, -4.9, 0], [0.2, 6.6, 4.9, 0]]) {
      add(g, box(w, 0.35, d), m.yellow, x, 0.45, z, { cast: false });
    }
    const bands = [0xf59e0b, 0x22c55e, 0x3b82f6, 0xe5e7eb, 0xa855f7];
    [-3.2, -1.6, 0, 1.6, 3.2].forEach((x, i) => {
      const band = new THREE.MeshStandardMaterial({ color: bands[i], roughness: 0.5 });
      add(g, cyl(0.62, 1.8, 24), m.paint, x, 1.4, -1.2);
      add(g, cyl(0.64, 0.3, 24), band, x, 1.7, -1.2);
      add(g, cyl(0.15, 0.2, 12), m.darkSteel, x, 2.4, -1.2);
      add(g, box(0.6, 0.45, 0.8), m.blue, x, 0.6, 1.2);
      add(g, cyl(0.07, 0.8, 10), m.paint, x + 0.45, 1.0, 0.6);
      rod(g, V(x, 0.6, -0.6), V(x, 0.6, 0.8), 0.05, m.steel);
      rod(g, V(x, 0.83, 1.4), V(x, 1.0, 2.2), 0.05, m.steel);
    });
    rod(g, V(-3.6, 1.0, 2.2), V(4.5, 1.0, 2.2), 0.08, m.steel);
    for (const [x, z] of [[-4.4, -2.8], [4.4, -2.8], [-4.4, 2.8], [4.4, 2.8]]) add(g, box(0.15, 3.6, 0.15), m.yellow, x, 2.1, z);
    add(g, box(9, 0.12, 0.15), m.yellow, 0, 3.9, -2.8);
    add(g, box(9, 0.12, 0.15), m.yellow, 0, 3.9, 2.8);
    return 5;
  },
};
