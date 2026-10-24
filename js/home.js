// Home page: equipment cards, process steps and the rotating 3D preview.
import * as THREE from 'three';
import { EQUIPMENT, SECTIONS } from './data.js';

const $ = (s) => document.querySelector(s);

const STEP_TEXT = {
  inlet: 'Collect the flow from every well and test each well in turn.',
  separation: 'Split the well stream into gas, oil and free water in stages.',
  treating: 'Remove emulsified water, salt and light gases from the oil.',
  export: 'Store the oil, pump it and measure every barrel that leaves.',
  support: 'Inject chemicals that help every other step work well.',
};

$('#stat-eq').textContent = EQUIPMENT.length;
$('#steps').innerHTML = SECTIONS.map((s, i) => {
  const n = EQUIPMENT.filter((e) => e.section === s.id).length;
  return `<li><span class="step-n">0${i + 1}</span><h3>${s.name}</h3><p>${STEP_TEXT[s.id]}</p><small>${n} equipment</small></li>`;
}).join('');

// Equipment cards with section filters
const grid = $('#eq-grid');
const filters = $('#filters');
grid.innerHTML = EQUIPMENT.map((e, i) => `
  <a class="eq-card" href="explorer.html#${e.id}" data-section="${e.section}">
    <div class="eq-card-top"><span class="num">${String(i + 1).padStart(2, '0')}</span><span class="tag">${e.tag}</span></div>
    <h3>${e.name}</h3>
    <p>${e.short}</p>
    <span class="open">Open in 3D <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
  </a>`).join('');
filters.innerHTML = [{ id: 'all', name: 'All' }, ...SECTIONS]
  .map((s) => `<button role="tab" data-filter="${s.id}" aria-selected="${s.id === 'all'}">${s.name}</button>`).join('');
filters.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  filters.querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  grid.querySelectorAll('.eq-card').forEach((c) => {
    c.hidden = b.dataset.filter !== 'all' && c.dataset.section !== b.dataset.filter;
  });
});

// Rotating 3D preview in the hero (rotate only, no zoom, so the page still scrolls)
const heroBox = $('#hero-viewer');
import('./scene.js').then(({ createViewer }) => {
  const viewer = createViewer(heroBox, {
    interactive: false,
    autoRotate: true,
    maxPixelRatio: 1.5,
    target: new THREE.Vector3(12, 0, 0),
    cameraPosition: new THREE.Vector3(112, 100, 138),
  });
  viewer.controls.maxDistance = 600;
  // OrbitControls blocks touch scrolling; let phones still scroll the page past the preview
  viewer.renderer.domElement.style.touchAction = 'pan-y';
  heroBox.classList.add('ready');
  new IntersectionObserver(([entry]) => viewer.setRunning(entry.isIntersecting)).observe(heroBox);
}).catch(() => heroBox.classList.add('failed'));
