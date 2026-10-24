// 3D Plant Explorer: picking, info cards, equipment list, guided tour and view toggles.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { createViewer, OVERVIEW } from './scene.js';
import { EQUIPMENT, SECTIONS, byId } from './data.js';
import { STREAMS } from './plant/helpers.js';
import { STUBS } from './plant/layout.js';

const $ = (s) => document.querySelector(s);
const SHORT = {
  'hp-sep': 'HP Separator',
  'heater-treater': 'Heater Treater',
  dehydrator: 'Dehydrator',
  stabilizer: 'Stabilizer',
  tanks: 'Storage Tanks',
  pumps: 'Export Pumps',
  metering: 'Fiscal Metering',
  chemicals: 'Chemical Injection',
};
const shortName = (eq) => SHORT[eq.id] || eq.name;
const isWide = () => window.innerWidth > 900;

let viewer;
try {
  viewer = createViewer($('#viewer'), { labels: true });
} catch (err) {
  $('#loader').innerHTML = '<p class="error">Sorry, your browser could not start 3D graphics (WebGL).<br>Please try an up-to-date Chrome, Edge, Firefox or Safari.</p>';
  throw err;
}
const { camera, controls, plant, renderer, scene } = viewer;
const state = { selected: null, hovered: null, xray: false, tab: 'function', tourStep: -1 };

// ---------- Prepare equipment: materials for highlight, shells for X-ray ----------
const pickables = [];
for (const eq of Object.values(plant.equipment)) {
  const materials = new Set();
  const shellMats = new Set();
  eq.internals = [];
  eq.group.traverse((o) => {
    if (!o.isMesh) return;
    pickables.push(o);
    if (o.userData.internal) eq.internals.push(o);
    else materials.add(o.material);
    if (o.userData.shell) shellMats.add(o.material);
  });
  eq.materials = [...materials];
  eq.shellMats = [...shellMats];
  eq.box = new THREE.Box3().setFromObject(eq.group);
}
for (const line of plant.pipes) line.traverse((o) => o.isMesh && pickables.push(o));

const ACCENT = new THREE.Color(0x7c6cff);
function paint() {
  for (const [id, eq] of Object.entries(plant.equipment)) {
    const level = id === state.selected ? 0.32 : id === state.hovered ? 0.2 : 0;
    for (const m of eq.materials) {
      m.emissive.copy(ACCENT);
      m.emissiveIntensity = level;
    }
  }
}

function setXray(on) {
  state.xray = on;
  for (const eq of Object.values(plant.equipment)) {
    for (const m of eq.shellMats) {
      m.transparent = on;
      m.opacity = on ? 0.16 : 1;
      m.depthWrite = !on;
      m.needsUpdate = true;
    }
    for (const o of eq.internals) o.visible = on;
  }
  $('#btn-xray').setAttribute('aria-pressed', String(on));
  const b = $('#panel-xray');
  if (b) b.textContent = on ? 'Hide inside view' : 'See inside (X-ray)';
}

// ---------- Labels in the 3D scene ----------
const labelObjects = [];
for (const eq of EQUIPMENT) {
  const p = plant.equipment[eq.id];
  const el = document.createElement('button');
  el.className = 'eq-label';
  el.dataset.id = eq.id;
  el.innerHTML = `<span class="tag">${eq.tag}</span><span class="nm">${shortName(eq)}</span>`;
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('click', (e) => { e.stopPropagation(); select(eq.id); });
  el.addEventListener('pointerenter', () => { state.hovered = eq.id; paint(); });
  el.addEventListener('pointerleave', () => { state.hovered = null; paint(); });
  const obj = new CSS2DObject(el);
  obj.position.copy(p.labelPos);
  scene.add(obj);
  p.labelEl = el;
  labelObjects.push(obj);
}
for (const [text, stream, pos] of STUBS) {
  const el = document.createElement('div');
  el.className = 'stub-label';
  el.innerHTML = `<i style="background:${STREAMS[stream].color}"></i>${text}`;
  const obj = new CSS2DObject(el);
  obj.position.set(...pos);
  scene.add(obj);
  labelObjects.push(obj);
}

// ---------- Camera flights ----------
let tween = null;
function flyTo(position, target, dur = 1.3) {
  tween = {
    p0: camera.position.clone(), t0: controls.target.clone(),
    p1: position.clone(), t1: target.clone(),
    start: performance.now(), dur: dur * 1000,
  };
}
viewer.onFrame(() => {
  if (!tween) return;
  const k = Math.min(1, (performance.now() - tween.start) / tween.dur);
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  camera.position.lerpVectors(tween.p0, tween.p1, e);
  controls.target.lerpVectors(tween.t0, tween.t1, e);
  if (k >= 1) tween = null;
});

function viewFor(id) {
  const box = plant.equipment[id].box;
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  // Fit the equipment into the part of the screen not covered by the panels
  const w = renderer.domElement.clientWidth;
  const h = renderer.domElement.clientHeight;
  let visW = w;
  let visH = h;
  if (isWide()) {
    if (!panel.hidden) visW -= panel.offsetWidth + 12;
    if (document.body.classList.contains('sidebar-open')) visW -= sidebar.offsetWidth + 12;
  } else if (!panel.hidden) {
    visH -= panel.offsetHeight;
  }
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const half = Math.min(Math.atan((t * Math.max(visH, h * 0.3)) / h), Math.atan((t * Math.max(visW, w * 0.3)) / h));
  const dist = Math.max(16, radius / Math.sin(half));
  const off = camera.position.clone().sub(controls.target);
  const az = Math.atan2(off.x, off.z);
  const el = 0.5;
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  return { position: center.clone().addScaledVector(dir, dist), target: center };
}
const flyOverview = () => flyTo(OVERVIEW.position, OVERVIEW.target, 1.5);

// Shift the rendered view so the model stays centred in the area not covered by panels.
const offset = { x: 0, y: 0 };
viewer.onFrame(() => {
  const w = renderer.domElement.clientWidth;
  const h = renderer.domElement.clientHeight;
  let tx = 0;
  let ty = 0;
  const panelOpen = document.body.classList.contains('panel-open');
  if (isWide()) {
    if (panelOpen) tx += (panel.offsetWidth + 12) / 2;
    if (document.body.classList.contains('sidebar-open')) tx -= (sidebar.offsetWidth + 12) / 2;
  } else if (panelOpen) {
    ty = panel.offsetHeight / 2;
  }
  offset.x += (tx - offset.x) * 0.12;
  offset.y += (ty - offset.y) * 0.12;
  camera.setViewOffset(w, h, offset.x, offset.y, w, h);
});

// ---------- Info panel ----------
const panel = $('#panel');
function renderPanel(eq) {
  const idx = EQUIPMENT.indexOf(eq);
  const sec = SECTIONS.find((s) => s.id === eq.section).name;
  const tabs = [['function', 'Function'], ['how', 'How it works'], ['conditions', 'Conditions'], ['parts', 'Internals']];
  panel.innerHTML = `
    <div class="panel-head">
      <div class="chips"><span class="chip">${sec}</span><span class="chip mono">${eq.tag}</span></div>
      <button class="icon-btn" id="panel-close" aria-label="Close">&times;</button>
    </div>
    <h2>${eq.name}</h2>
    <p class="lead">${eq.short}</p>
    <div class="tabs" role="tablist">
      ${tabs.map(([k, t]) => `<button role="tab" data-tab="${k}" aria-selected="${k === state.tab}">${t}</button>`).join('')}
    </div>
    <div class="panel-body">
      <div class="tab-body" data-body="function">
        ${eq.function.map((p) => `<p>${p}</p>`).join('')}
        <div class="flow-note"><b>In the process:</b> ${eq.flowNote}</div>
      </div>
      <div class="tab-body" data-body="how">${eq.how.map((p) => `<p>${p}</p>`).join('')}</div>
      <div class="tab-body" data-body="conditions">
        <table class="cond">${eq.conditions.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>
        <p class="note">Typical values for learning only. Real plants vary.</p>
      </div>
      <div class="tab-body" data-body="parts">
        <ul class="parts">${eq.parts.map(([n, d]) => `<li><b>${n}</b><span>${d}</span></li>`).join('')}</ul>
        <button class="btn ghost small" id="panel-xray">${state.xray ? 'Hide inside view' : 'See inside (X-ray)'}</button>
      </div>
    </div>
    <div class="panel-foot">
      <button class="btn ghost small" data-step="-1" ${idx === 0 ? 'disabled' : ''}>&larr; Previous</button>
      <span>${idx + 1} / ${EQUIPMENT.length}</span>
      <button class="btn ghost small" data-step="1" ${idx === EQUIPMENT.length - 1 ? 'disabled' : ''}>Next &rarr;</button>
    </div>`;
  showTab(state.tab);
}
function showTab(tab) {
  state.tab = tab;
  panel.querySelectorAll('[role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  panel.querySelectorAll('.tab-body').forEach((b) => { b.hidden = b.dataset.body !== tab; });
}
panel.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.id === 'panel-close') deselect();
  else if (t.id === 'panel-xray') setXray(!state.xray);
  else if (t.dataset.tab) showTab(t.dataset.tab);
  else if (t.dataset.step) {
    const i = EQUIPMENT.findIndex((x) => x.id === state.selected) + Number(t.dataset.step);
    if (EQUIPMENT[i]) select(EQUIPMENT[i].id);
  }
});

// ---------- Selection ----------
function select(id, { fly = true } = {}) {
  const eq = byId(id);
  if (!eq) return;
  state.selected = id;
  paint();
  renderPanel(eq);
  panel.hidden = false;
  document.body.classList.add('panel-open');
  document.querySelectorAll('.eq-label, .eq-item').forEach((el) => el.classList.toggle('active', el.dataset.id === id));
  history.replaceState(null, '', `#${id}`);
  if (fly) { const v = viewFor(id); flyTo(v.position, v.target); }
  if (state.tourStep >= 0) {
    const i = TOUR.findIndex((s) => s.id === id);
    if (i >= 0 && i !== state.tourStep) { state.tourStep = i; renderTour(); }
  }
  if (!isWide()) closeSidebar();
}
function deselect() {
  state.selected = null;
  paint();
  panel.hidden = true;
  document.body.classList.remove('panel-open');
  document.querySelectorAll('.eq-label.active, .eq-item.active').forEach((el) => el.classList.remove('active'));
  history.replaceState(null, '', location.pathname + location.search);
}

// ---------- Picking with mouse / touch ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pick(x, y) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(pickables, false).find((h) => h.object.visible);
  return hit ? hit.object : null;
}
const canvas = renderer.domElement;
const tooltip = $('#tooltip');
let down = null;
canvas.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY };
  tween = null;
  hideHint();
});
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
  const obj = pick(e.clientX, e.clientY);
  if (obj?.userData.eqId) select(obj.userData.eqId);
  else if (!obj) deselect();
});
let hoverQueued = false;
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons || hoverQueued) return;
  hoverQueued = true;
  requestAnimationFrame(() => {
    hoverQueued = false;
    const obj = pick(e.clientX, e.clientY);
    const id = obj?.userData.eqId || null;
    if (id !== state.hovered) { state.hovered = id; paint(); }
    canvas.style.cursor = id ? 'pointer' : '';
    let html = '';
    if (id) html = `<b>${byId(id).name}</b><span>Click for details</span>`;
    else if (obj?.userData.pipe) {
      const { stream, name } = obj.userData.pipe;
      html = `<b><i style="background:${STREAMS[stream].color}"></i>${STREAMS[stream].label}</b><span>${name}</span>`;
    }
    tooltip.hidden = !html;
    if (html) {
      tooltip.innerHTML = html;
      tooltip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
    }
  });
});
canvas.addEventListener('pointerleave', () => {
  tooltip.hidden = true;
  if (state.hovered) { state.hovered = null; paint(); }
});

// ---------- Equipment list ----------
const list = $('#eq-list');
function renderList(filter = '') {
  const q = filter.trim().toLowerCase();
  const html = SECTIONS.map((sec) => {
    const items = EQUIPMENT.filter((e) => e.section === sec.id &&
      (!q || [e.name, e.tag, e.short, sec.name].join(' ').toLowerCase().includes(q)));
    if (!items.length) return '';
    return `<div class="sec"><h3>${sec.name}</h3>${items.map((e) => `
      <button class="eq-item${e.id === state.selected ? ' active' : ''}" data-id="${e.id}">
        <span class="num">${String(EQUIPMENT.indexOf(e) + 1).padStart(2, '0')}</span>
        <span class="txt"><b>${e.name}</b><small>${e.tag}</small></span>
      </button>`).join('')}</div>`;
  }).join('');
  list.innerHTML = html || '<p class="empty">No equipment found.</p>';
}
renderList();
$('#search').addEventListener('input', (e) => renderList(e.target.value));
list.addEventListener('click', (e) => {
  const b = e.target.closest('.eq-item');
  if (b) select(b.dataset.id);
});
list.addEventListener('pointerover', (e) => {
  const id = e.target.closest('.eq-item')?.dataset.id || null;
  if (id !== state.hovered) { state.hovered = id; paint(); }
});
list.addEventListener('pointerleave', () => { state.hovered = null; paint(); });

const sidebar = $('#sidebar');
function closeSidebar() { document.body.classList.remove('sidebar-open'); $('#btn-list').setAttribute('aria-pressed', 'false'); }
function toggleSidebar() {
  const open = document.body.classList.toggle('sidebar-open');
  $('#btn-list').setAttribute('aria-pressed', String(open));
}
if (isWide()) toggleSidebar();
$('#btn-list').addEventListener('click', toggleSidebar);
sidebar.addEventListener('pointerdown', (e) => e.stopPropagation());

// ---------- Guided tour ----------
const TOUR = [
  {
    id: null,
    title: 'How oil moves through a CPF',
    text: 'Well fluid (oil, gas and water) arrives from the wells on the left. It is separated, treated, stabilized and stored, then measured and exported on the right. Press Next to follow it step by step.',
  },
  ...EQUIPMENT.map((e) => ({ id: e.id, title: e.name, text: e.flowNote })),
];
const tourbar = $('#tourbar');
function renderTour() {
  const s = TOUR[state.tourStep];
  const last = state.tourStep === TOUR.length - 1;
  tourbar.innerHTML = `
    <div class="tour-progress"><span style="width:${((state.tourStep + 1) / TOUR.length) * 100}%"></span></div>
    <div class="tour-row">
      <div class="tour-text">
        <small>Step ${state.tourStep + 1} of ${TOUR.length}</small>
        <b>${s.title}</b>
        <p>${s.text}</p>
      </div>
      <div class="tour-btns">
        <button class="btn ghost small" data-tour="-1" ${state.tourStep === 0 ? 'disabled' : ''}>&larr;</button>
        <button class="btn primary small" data-tour="1">${last ? 'Finish' : 'Next &rarr;'}</button>
        <button class="icon-btn" data-tour="exit" aria-label="Exit tour">&times;</button>
      </div>
    </div>`;
}
function goTour(step) {
  state.tourStep = step;
  renderTour();
  const s = TOUR[step];
  if (s.id) select(s.id);
  else { deselect(); flyOverview(); }
}
function exitTour() {
  state.tourStep = -1;
  tourbar.hidden = true;
  document.body.classList.remove('touring');
  $('#btn-tour').setAttribute('aria-pressed', 'false');
}
$('#btn-tour').addEventListener('click', () => {
  if (state.tourStep >= 0) { exitTour(); return; }
  tourbar.hidden = false;
  document.body.classList.add('touring');
  $('#btn-tour').setAttribute('aria-pressed', 'true');
  goTour(0);
});
tourbar.addEventListener('click', (e) => {
  const v = e.target.closest('[data-tour]')?.dataset.tour;
  if (!v) return;
  if (v === 'exit') return exitTour();
  const next = state.tourStep + Number(v);
  if (next >= TOUR.length) { exitTour(); deselect(); flyOverview(); return; }
  if (next >= 0) goTour(next);
});

// ---------- Toolbar, legend, hint ----------
function toggleButton(btn, fn) {
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    fn(on);
  });
}
toggleButton($('#btn-labels'), (on) => labelObjects.forEach((o) => { o.visible = on; }));
toggleButton($('#btn-flow'), (on) => { plant.flow.enabled = on; });
$('#btn-xray').addEventListener('click', () => setXray(!state.xray));
$('#btn-reset').addEventListener('click', () => { deselect(); flyOverview(); });

$('#legend-items').innerHTML = Object.values(STREAMS)
  .map((s) => `<li><i style="background:${s.color}"></i>${s.label}</li>`).join('');
$('#legend-toggle').addEventListener('click', () => $('#legend').classList.toggle('collapsed'));
if (!isWide()) $('#legend').classList.add('collapsed');

const hint = $('#hint');
if (!isWide()) hint.textContent = 'Drag to rotate · Pinch to zoom · Two fingers to pan · Tap any equipment';
function hideHint() { hint.classList.add('gone'); }
setTimeout(hideHint, 9000);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.tourStep >= 0) exitTour();
    else if (state.selected) deselect();
    else closeSidebar();
  }
});

// ---------- Start ----------
const hideLoader = () => $('#loader').classList.add('done');
requestAnimationFrame(() => requestAnimationFrame(hideLoader));
setTimeout(hideLoader, 1500);
const startId = location.hash.slice(1) || new URLSearchParams(location.search).get('eq');
if (startId && byId(startId)) setTimeout(() => select(startId), 500);
