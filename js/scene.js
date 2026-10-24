// Shared 3D viewer: renderer, camera, lights, controls and the plant itself.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildPlant } from './plant/layout.js';

export const OVERVIEW = {
  target: new THREE.Vector3(10, 0, 2),
  position: new THREE.Vector3(50, 132, 192),
};

const BG = 0x070b16;

export function createViewer(container, opts = {}) {
  const isSmall = window.matchMedia('(max-width: 768px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.maxPixelRatio || 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = opts.shadows !== false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  let labelRenderer = null;
  if (opts.labels) {
    labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.className = 'label-layer';
    container.appendChild(labelRenderer.domElement);
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 260, 620);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 1500);
  camera.position.copy(opts.cameraPosition || OVERVIEW.position);

  scene.add(new THREE.HemisphereLight(0xcfdcff, 0x1a1f2c, 0.7));
  const sun = new THREE.DirectionalLight(0xfff4e6, 2.0);
  sun.position.set(80, 140, 90);
  sun.target.position.copy(OVERVIEW.target);
  sun.castShadow = renderer.shadowMap.enabled;
  sun.shadow.mapSize.set(isSmall ? 1024 : 2048, isSmall ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 90, bottom: -90, near: 20, far: 420 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0x8b7dff, 0.7);
  rim.position.set(-120, 60, -90);
  scene.add(rim);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(opts.target || OVERVIEW.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = false;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.minDistance = 6;
  controls.maxDistance = 420;
  controls.zoomSpeed = 1.2;
  if (opts.autoRotate) {
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
  }
  if (opts.interactive === false) {
    controls.enableZoom = false;
    controls.enablePan = false;
  }

  const plant = buildPlant(scene);

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h);
    if (labelRenderer) labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  const frameHandlers = [];
  const clock = new THREE.Clock();
  const loop = () => {
    const time = clock.getElapsedTime();
    plant.flow.update(time);
    for (const fn of frameHandlers) fn(time);
    controls.update();
    renderer.render(scene, camera);
    if (labelRenderer) labelRenderer.render(scene, camera);
  };
  renderer.setAnimationLoop(loop);

  return {
    renderer, scene, camera, controls, plant, labelRenderer,
    onFrame: (fn) => frameHandlers.push(fn),
    setRunning: (on) => renderer.setAnimationLoop(on ? loop : null),
  };
}
