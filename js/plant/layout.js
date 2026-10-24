// Places the equipment on the plot, draws the colour-coded process pipes and the
// moving flow markers. All coordinates here are world coordinates in metres.
import * as THREE from 'three';
import { STREAMS, makeMats, add, box, cyl, pipeRun } from './helpers.js';
import { BUILDERS } from './equipment.js';

// Equipment id -> builder name and world position
const PLACEMENT = {
  manifold: ['manifold', -70, 0],
  'test-sep': ['testSep', -50, 18],
  'hp-sep': ['hpSep', -48, -6],
  'lp-sep': ['lpSep', -28, -6],
  'heater-treater': ['heaterTreater', -10, -6],
  dehydrator: ['dehydrator', 8, -6],
  desalter: ['desalter', 26, -6],
  stabilizer: ['stabilizer', 42, -6],
  tanks: ['tanks', 72, -3],
  pumps: ['pumps', 98, -3],
  metering: ['metering', 116, 4.5],
  chemicals: ['chemicals', -84, -20],
};

// Process lines: [stream, name, radius, points]
const RACK_Z = -17; // pipe rack runs behind the main process line
const WELL_Z = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
const LINES = [
  ...WELL_Z.map((z, i) => ['well', `Flowline from well ${i + 1}`, 0.18,
    [[-114, -1, z], [-114, 1.2, z], [-74.5, 1.2, z]]]),
  ['well', 'Production header → HP separator', 0.35,
    [[-69, 1.2, -9], [-62, 1.2, -9], [-62, 1.2, -6], [-62, 3.3, -6], [-55.1, 3.3, -6]]],
  ['well', 'Test header → test separator', 0.25,
    [[-67, 2.4, 8], [-67, 2.4, 18], [-55, 2.4, 18], [-55, 2.2, 18], [-53.8, 2.2, 18]]],
  ['oil', 'Test separator liquids → LP separator', 0.16,
    [[-46.4, 1.5, 18], [-37.5, 1.5, 18], [-37.5, 1.5, -6], [-37.5, 1.9, -6]]],
  ['oil', 'Oil: HP separator → LP separator', 0.25,
    [[-41, 1.9, -6], [-37.5, 1.9, -6], [-37.5, 5.0, -6], [-32, 5.0, -6], [-32, 4.05, -6]]],
  ['oil', 'Oil: LP separator → heater treater', 0.25,
    [[-22, 1.8, -6], [-19, 1.8, -6], [-19, 5.4, -6], [-13.5, 5.4, -6], [-13.5, 4.45, -6]]],
  ['oil', 'Oil: heater treater → electrostatic dehydrator', 0.25,
    [[-8.5, 4.45, -6], [-8.5, 5.8, -6], [3.2, 5.8, -6], [3.2, 4.75, -6]]],
  ['oil', 'Oil: dehydrator → desalter (through mixing valve)', 0.25,
    [[12.5, 4.75, -6], [12.5, 5.6, -6], [17.2, 5.6, -6], [17.2, 2.9, -6], [19.4, 2.9, -6]]],
  ['oil', 'Oil: desalter → stabilizer column', 0.25,
    [[30, 4.75, -6], [30, 5.6, -6], [35.5, 5.6, -6], [35.5, 20, -6], [40.3, 20, -6]]],
  ['oil', 'Stabilized oil → storage tank A', 0.3,
    [[43.6, 2.6, -6], [50, 2.6, -6], [50, 1.5, -6], [56, 1.5, -6], [56, 1.5, -18], [61.6, 1.5, -18]]],
  ['oil', 'Stabilized oil → storage tank B', 0.3,
    [[56, 1.5, -6], [56, 1.5, 12], [61.6, 1.5, 12]]],
  ['oil', 'Tank A → export pumps', 0.3,
    [[82.4, 1.2, -18], [91, 1.2, -18], [91, 1.2, -3], [94.5, 1.2, -3]]],
  ['oil', 'Tank B → export pumps', 0.3,
    [[82.4, 1.2, 12], [91, 1.2, 12], [91, 1.2, -3]]],
  ['oil', 'Export pumps → fiscal metering', 0.3,
    [[96.6, 2.8, -3], [96.6, 2.8, 4.5], [110, 2.8, 4.5], [110, 1.4, 4.5], [112, 1.4, 4.5]]],
  ['oil', 'Export line → pipeline', 0.3,
    [[112, 1.4, 4.5], [123.5, 1.4, 4.5], [140, 1.4, 4.5], [140, -1, 4.5]]],
  // Gas lines up to the pipe rack header
  ['gas', 'Gas: test separator → gas header', 0.13, [[-48, 2.95, 18], [-48, 7.5, 18], [-39, 7.5, 18], [-39, 7.5, RACK_Z]]],
  ['gas', 'Gas: HP separator → gas header', 0.22, [[-43.5, 4.5, -6], [-43.5, 7.5, -6], [-43.5, 7.5, RACK_Z]]],
  ['gas', 'Gas: LP separator → gas header', 0.22, [[-24.3, 4.1, -6], [-24.3, 7.5, -6], [-24.3, 7.5, RACK_Z]]],
  ['gas', 'Gas: heater treater → gas header', 0.18, [[-11, 4.5, -6], [-11, 7.5, -6], [-11, 7.5, RACK_Z]]],
  ['gas', 'Gas: stabilizer overhead → gas header', 0.22,
    [[42, 26.9, -6], [42, 28.5, -6], [44.8, 28.5, -6], [44.8, 7.5, -6], [44.8, 7.5, RACK_Z]]],
  ['gas', 'Gas header → gas compression & flare', 0.35, [[-50, 7.5, RACK_Z], [52, 7.5, RACK_Z], [52, 7.5, -36]]],
  // Water lines to the produced water header (low, in front of the vessels)
  ['water', 'Water: HP separator → water header', 0.2, [[-50.5, 1.1, -6], [-50.5, 0.5, -6], [-50.5, 0.5, 4]]],
  ['water', 'Water: heater treater → water header', 0.2, [[-12.5, 1.1, -6], [-12.5, 0.5, -6], [-12.5, 0.5, 4]]],
  ['water', 'Water: dehydrator → water header', 0.2, [[5.5, 1.2, -6], [5.5, 0.5, -6], [5.5, 0.5, 4]]],
  ['water', 'Water: desalter → water header', 0.2, [[23.5, 1.2, -6], [23.5, 0.5, -6], [23.5, 0.5, 4]]],
  ['water', 'Produced water header → water treatment', 0.3, [[-50.5, 0.5, 4], [38, 0.5, 4], [38, 0.5, 36]]],
  ['water', 'Wash water supply → desalter', 0.16, [[15, 1.2, -34], [15, 1.2, -9], [15, 5.6, -9], [15, 5.6, -6.2]]],
  ['chem', 'Chemical injection → production header', 0.08,
    [[-79.5, 1.0, -17.8], [-65, 1.0, -17.8], [-65, 1.0, -9.3], [-65, 1.2, -9.3]]],
];

// Labels for where the lines leave the plot
export const STUBS = [
  ['From wells', 'well', [-114, 3.5, 0]],
  ['To gas compression & flare', 'gas', [52, 9.5, -36]],
  ['To produced water treatment', 'water', [38, 2.5, 36]],
  ['Wash water supply', 'water', [15, 3, -34]],
  ['To export pipeline', 'oil', [140, 3.5, 4.5]],
];

function pipeMaterial(stream) {
  const c = new THREE.Color(STREAMS[stream].color).multiplyScalar(0.72);
  return new THREE.MeshStandardMaterial({ color: c, metalness: 0.35, roughness: 0.45 });
}

function buildGround(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 500),
    new THREE.MeshStandardMaterial({ color: 0x141a26, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const plot = new THREE.Mesh(
    new THREE.PlaneGeometry(270, 84),
    new THREE.MeshStandardMaterial({ color: 0x1d2433, roughness: 0.95 }),
  );
  plot.rotation.x = -Math.PI / 2;
  plot.position.set(12, 0.01, -1);
  plot.receiveShadow = true;
  scene.add(plot);
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x0d1018, roughness: 0.9 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x3a4258 });
  for (const z of [-46, 44]) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(300, 7), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(12, 0.02, z);
    scene.add(road);
    for (let x = -135; x < 160; x += 8) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.2), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.03, z);
      scene.add(dash);
    }
  }
  const grid = new THREE.GridHelper(700, 140, 0x232b3d, 0x1a2130);
  grid.position.y = 0.005;
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  scene.add(grid);
}

function buildPipeRack(scene) {
  const mats = makeMats();
  const g = new THREE.Group();
  const zs = [RACK_Z - 1.4, RACK_Z + 1.4];
  for (let x = -58; x <= 50; x += 9) {
    for (const z of zs) {
      add(g, box(0.4, 7, 0.4), mats.darkSteel, x, 3.5, z);
      add(g, cyl(0.45, 0.3, 12), mats.concrete, x, 0.15, z, { cast: false });
    }
    add(g, box(0.3, 0.3, 3.4), mats.darkSteel, x, 7, RACK_Z);
    add(g, box(0.25, 0.25, 3.4), mats.darkSteel, x, 4.2, RACK_Z);
  }
  for (const z of zs) add(g, box(108, 0.3, 0.3), mats.darkSteel, -4, 7, z);
  scene.add(g);
}

// Moving markers that show the flow direction along each line.
class FlowMarkers {
  constructor(scene) {
    this.paths = [];
    this.meshes = [];
    this.scene = scene;
    this.enabled = true;
    this.dummy = new THREE.Object3D();
  }

  addPath(stream, pts, r) {
    const segs = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const len = pts[i].distanceTo(pts[i + 1]);
      segs.push({ a: pts[i], b: pts[i + 1], start: total, len });
      total += len;
    }
    this.paths.push({ stream, segs, total, r });
  }

  build() {
    const byStream = {};
    for (const p of this.paths) (byStream[p.stream] ||= []).push(p);
    for (const [stream, paths] of Object.entries(byStream)) {
      const items = [];
      for (const p of paths) {
        const spacing = 3.2;
        const n = Math.max(1, Math.floor(p.total / spacing));
        for (let i = 0; i < n; i++) items.push({ p, offset: (i / n) * p.total, s: p.r * 1.35 });
      }
      const mat = new THREE.MeshBasicMaterial({ color: STREAMS[stream].color, toneMapped: false });
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), mat, items.length);
      mesh.userData.items = items;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.meshes.push(mesh);
    }
  }

  update(time) {
    const speed = 3.5;
    for (const mesh of this.meshes) {
      mesh.visible = this.enabled;
      if (!this.enabled) continue;
      const items = mesh.userData.items;
      for (let i = 0; i < items.length; i++) {
        const { p, offset, s } = items[i];
        const d = (offset + time * speed) % p.total;
        let seg = p.segs[0];
        for (const sg of p.segs) if (d >= sg.start) seg = sg;
        const t = seg.len ? (d - seg.start) / seg.len : 0;
        this.dummy.position.lerpVectors(seg.a, seg.b, t);
        this.dummy.scale.setScalar(s);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

// Builds the whole plant. Returns equipment groups, pickable pipes and flow markers.
export function buildPlant(scene) {
  buildGround(scene);
  buildPipeRack(scene);

  const equipment = {};
  for (const [id, [builder, x, z]] of Object.entries(PLACEMENT)) {
    const group = new THREE.Group();
    const mats = makeMats();
    const labelY = BUILDERS[builder](group, mats);
    group.position.set(x, 0, z);
    group.userData.eqId = id;
    group.traverse((o) => { o.userData.eqId = id; });
    scene.add(group);
    equipment[id] = { group, mats, labelPos: new THREE.Vector3(x, labelY, z) };
  }

  const flow = new FlowMarkers(scene);
  const pipes = [];
  const pipeGroup = new THREE.Group();
  const matCache = {};
  for (const [stream, name, r, points] of LINES) {
    const mat = (matCache[stream] ||= pipeMaterial(stream));
    const line = new THREE.Group();
    const pts = pipeRun(line, points, r, mat);
    line.traverse((o) => { o.userData.pipe = { stream, name }; });
    pipeGroup.add(line);
    pipes.push(line);
    flow.addPath(stream, pts, r);
  }
  scene.add(pipeGroup);
  flow.build();

  return { equipment, pipes, flow };
}
