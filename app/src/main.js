// Neon Coast Cover Studio — wires the editor: photos, layouts, grades, lettering,
// per-panel crop and position, undo/redo, and PNG export in three post sizes.
// State is plain JSON (photos live beside it as loaded images); every edit pushes
// a history snapshot so undo/redo walk the whole session.
import { drawCover, SIZES, SAMPLE_PHOTOS } from './cover.js';
import { GRADES } from './grades.js';
import { LAYOUTS, getLayout, layoutPanels } from './layouts.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');

let photoSeq = 0;
const photoById = new Map();
const state = {
  layout: 'hero',
  grade: 'sunset',
  size: 'square',
  title: 'Neon Shore',
  subtitle: 'one last ride down the coast',
  badge: 'NEON COAST',
  heat: 4,
  photos: [],
  panelPhotos: [],
  panelAdjust: [],
};
let selectedPanel = 0;
let history = [];
let historyIndex = -1;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function serialisable() {
  const { layout, grade, size, title, subtitle, badge, heat, photos, panelPhotos, panelAdjust } = state;
  return { layout, grade, size, title, subtitle, badge, heat, photos: photos.map((p) => ({ id: p.id, name: p.name, url: p.url ?? null })), panelPhotos: [...panelPhotos], panelAdjust: panelAdjust.map((a) => ({ ...a })) };
}

function pushHistory() {
  history = history.slice(0, historyIndex + 1);
  history.push(JSON.stringify(serialisable()));
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  refreshUndoButtons();
}

function restoreHistory(snapshot) {
  const s = JSON.parse(snapshot);
  Object.assign(state, s);
  state.photos = s.photos.map((p) => ({ ...p }));
  syncControls();
  redraw();
}

function refreshUndoButtons() {
  $('undoBtn').disabled = historyIndex <= 0;
  $('redoBtn').disabled = historyIndex >= history.length - 1;
}

function ensurePanelSlots() {
  const n = getLayout(state.layout).panels(100, 100).length;
  while (state.panelPhotos.length < n) state.panelPhotos.push(null);
  while (state.panelAdjust.length < n) state.panelAdjust.push({ zoom: 1, dx: 0, dy: 0 });
  state.panelPhotos.length = n;
  state.panelAdjust.length = n;
  if (selectedPanel >= n) selectedPanel = 0;
}

let redrawQueued = false;
function redraw() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(() => {
    redrawQueued = false;
    ensurePanelSlots();
    drawCover(canvas, state, photoById);
    $('previewSize').textContent = SIZES[state.size].name;
  });
}

function commit() {
  pushHistory();
  redraw();
}

function buildLayoutPicker() {
  const grid = $('layoutGrid');
  for (const layout of LAYOUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-btn';
    btn.dataset.layout = layout.id;
    btn.title = layout.blurb;
    const icon = document.createElement('span');
    icon.className = 'layout-icon';
    icon.setAttribute('aria-hidden', 'true');
    for (const p of layout.panels(100, 100)) {
      const cell = document.createElement('i');
      cell.style.left = `${p.x * 100}%`;
      cell.style.top = `${p.y * 100}%`;
      cell.style.width = `${p.w * 100}%`;
      cell.style.height = `${p.h * 100}%`;
      if (p.rotate) cell.style.transform = `rotate(${p.rotate}deg)`;
      icon.appendChild(cell);
    }
    btn.appendChild(icon);
    btn.appendChild(document.createTextNode(layout.name));
    btn.addEventListener('click', () => {
      state.layout = layout.id;
      ensurePanelSlots();
      syncControls();
      commit();
    });
    grid.appendChild(btn);
  }
}

function buildGradePicker() {
  const row = $('gradeRow');
  for (const grade of GRADES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'grade-btn';
    btn.dataset.grade = grade.id;
    const dot = document.createElement('span');
    dot.className = 'grade-dot';
    dot.style.background = grade.dot;
    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(grade.name));
    btn.addEventListener('click', () => {
      state.grade = grade.id;
      syncControls();
      commit();
    });
    row.appendChild(btn);
  }
}

function buildSizePicker() {
  const row = $('sizeRow');
  for (const size of Object.values(SIZES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'size-btn';
    btn.dataset.size = size.id;
    btn.textContent = size.name;
    btn.addEventListener('click', () => {
      state.size = size.id;
      syncControls();
      commit();
    });
    row.appendChild(btn);
  }
}

function buildSampleRow() {
  const row = $('sampleRow');
  for (const sample of SAMPLE_PHOTOS) {
    const thumb = document.createElement('img');
    thumb.className = 'sample-thumb';
    thumb.src = sample.url;
    thumb.alt = sample.name;
    thumb.title = `Use sample: ${sample.name}`;
    thumb.addEventListener('click', async () => {
      await addPhoto(sample.id, sample.name, sample.url);
      setStatus(`Sample photo “${sample.name}” loaded.`);
    });
    row.appendChild(thumb);
  }
}

async function addPhoto(id, name, url) {
  const img = await loadImage(url);
  if (!state.photos.some((p) => p.id === id)) {
    state.photos.push({ id, name, url });
    photoById.set(id, img);
  }
  if (!state.panelPhotos.includes(id)) {
    const empty = state.panelPhotos.findIndex((p) => p === null);
    if (empty !== -1) state.panelPhotos[empty] = id;
    else state.panelPhotos[0] = id;
  }
  syncPanelPhotoSelect();
  commit();
}

function syncPanelPhotoSelect() {
  const select = $('panelPhoto');
  select.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = '(first photo)';
  select.appendChild(none);
  for (const photo of state.photos) {
    const opt = document.createElement('option');
    opt.value = photo.id;
    opt.textContent = photo.name;
    select.appendChild(opt);
  }
  select.value = state.panelPhotos[selectedPanel] ?? '';
}

function syncControls() {
  document.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('badgeInput').value = state.badge;
  $('heatInput').value = String(state.heat);
  $('heatStars').textContent = '★'.repeat(state.heat) + '☆'.repeat(5 - state.heat);
  const adjust = state.panelAdjust[selectedPanel] ?? { zoom: 1, dx: 0, dy: 0 };
  $('panelZoom').value = String(adjust.zoom);
  $('panelPanX').value = String(adjust.dx);
  $('panelPanY').value = String(adjust.dy);
  const n = getLayout(state.layout).panels(100, 100).length;
  $('panelHint').textContent = `Panel ${selectedPanel + 1} of ${n} selected — click another panel in the preview to switch.`;
  syncPanelPhotoSelect();
}

function setStatus(text) {
  $('status').textContent = text;
}

function exportPng(sizeId) {
  const size = SIZES[sizeId];
  const off = document.createElement('canvas');
  const savedSize = state.size;
  state.size = sizeId;
  drawCover(off, state, photoById);
  state.size = savedSize;
  redraw();
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved neon-coast-${size.w}x${size.h}.png`);
  }, 'image/png');
}

function panelAtPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  const panels = layoutPanels(getLayout(state.layout), canvas.width, canvas.height);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

function wireControls() {
  $('photoInput').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      const id = `user-${++photoSeq}`;
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        state.photos.push({ id, name: file.name, url: null });
        photoById.set(id, img);
        if (!state.panelPhotos.includes(id)) {
          const empty = state.panelPhotos.findIndex((p) => p === null);
          if (empty !== -1) state.panelPhotos[empty] = id;
          else state.panelPhotos[0] = id;
        }
      } catch {
        setStatus(`Could not read ${file.name}.`);
      }
    }
    syncPanelPhotoSelect();
    commit();
    setStatus(`${state.photos.length} photo(s) loaded.`);
    e.target.value = '';
  });

  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('titleInput').addEventListener('change', commit);
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('subtitleInput').addEventListener('change', commit);
  $('badgeInput').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
  $('badgeInput').addEventListener('change', commit);
  $('heatInput').addEventListener('input', (e) => {
    state.heat = Number(e.target.value);
    $('heatStars').textContent = '★'.repeat(state.heat) + '☆'.repeat(5 - state.heat);
    redraw();
  });
  $('heatInput').addEventListener('change', commit);

  $('panelPhoto').addEventListener('change', (e) => {
    state.panelPhotos[selectedPanel] = e.target.value || null;
    commit();
  });
  const bindAdjust = (id, key) => {
    $(id).addEventListener('input', (e) => {
      ensurePanelSlots();
      state.panelAdjust[selectedPanel][key] = Number(e.target.value);
      redraw();
    });
    $(id).addEventListener('change', commit);
  };
  bindAdjust('panelZoom', 'zoom');
  bindAdjust('panelPanX', 'dx');
  bindAdjust('panelPanY', 'dy');

  $('fillAllBtn').addEventListener('click', () => {
    const id = state.panelPhotos[selectedPanel] ?? state.photos[0]?.id ?? null;
    if (!id) return;
    state.panelPhotos = state.panelPhotos.map(() => id);
    commit();
    setStatus('All panels now use the same photo.');
  });
  $('swapBtn').addEventListener('click', () => {
    if (state.photos.length < 2) return;
    const ids = state.photos.map((p) => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    state.panelPhotos = state.panelPhotos.map((_, i) => ids[i % ids.length]);
    commit();
  });

  $('undoBtn').addEventListener('click', () => {
    if (historyIndex <= 0) return;
    historyIndex -= 1;
    restoreHistory(history[historyIndex]);
    refreshUndoButtons();
  });
  $('redoBtn').addEventListener('click', () => {
    if (historyIndex >= history.length - 1) return;
    historyIndex += 1;
    restoreHistory(history[historyIndex]);
    refreshUndoButtons();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      $('undoBtn').click();
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      $('redoBtn').click();
    }
  });

  $('exportBtn').addEventListener('click', () => exportPng(state.size));
  $('exportAllBtn').addEventListener('click', () => {
    for (const sizeId of Object.keys(SIZES)) exportPng(sizeId);
    setStatus('Exported all 3 sizes.');
  });

  let dragPanel = -1;
  let dragStart = null;
  canvas.addEventListener('pointerdown', (e) => {
    const i = panelAtPoint(e.clientX, e.clientY);
    if (i === -1) return;
    selectedPanel = i;
    syncControls();
    redraw();
    dragPanel = i;
    dragStart = { x: e.clientX, y: e.clientY, dx: state.panelAdjust[i].dx, dy: state.panelAdjust[i].dy };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragPanel === -1 || !dragStart) return;
    const rect = canvas.getBoundingClientRect();
    const panels = layoutPanels(getLayout(state.layout), canvas.width, canvas.height);
    const p = panels[dragPanel];
    state.panelAdjust[dragPanel].dx = Math.min(0.5, Math.max(-0.5,
      dragStart.dx + ((e.clientX - dragStart.x) / rect.width) * (canvas.width / p.w)));
    state.panelAdjust[dragPanel].dy = Math.min(0.5, Math.max(-0.5,
      dragStart.dy + ((e.clientY - dragStart.y) / rect.height) * (canvas.height / p.h)));
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    if (dragPanel !== -1) { dragPanel = -1; dragStart = null; commit(); }
  });
}

async function boot() {
  buildLayoutPicker();
  buildGradePicker();
  buildSizePicker();
  buildSampleRow();
  wireControls();
  ensurePanelSlots();
  syncControls();

  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), async (scene) => {
      state.layout = scene.layout;
      state.grade = scene.grade;
      state.size = scene.size;
      state.title = scene.caption;
      state.subtitle = scene.subtitle;
      state.badge = scene.badge;
      state.heat = scene.heat;
      ensurePanelSlots();
      const sample = SAMPLE_PHOTOS.find((s) => s.id === scene.photo) ?? SAMPLE_PHOTOS[0];
      const img = await loadImage(sample.url);
      if (!state.photos.some((p) => p.id === sample.id)) {
        state.photos.push({ id: sample.id, name: sample.name, url: sample.url });
      }
      photoById.set(sample.id, img);
      const other = SAMPLE_PHOTOS.find((s) => s.id !== sample.id);
      const img2 = await loadImage(other.url);
      if (!state.photos.some((p) => p.id === other.id)) {
        state.photos.push({ id: other.id, name: other.name, url: other.url });
      }
      photoById.set(other.id, img2);
      // Spread the two samples across the panels so every layout reads multi-photo.
      state.panelPhotos = state.panelPhotos.map((_, i) => (i % 2 === 0 ? sample.id : other.id));
      syncControls();
      redraw();
    });
    return;
  }

  // Normal editor: preload both samples so the first cover is already alive.
  for (const sample of SAMPLE_PHOTOS) {
    try {
      const img = await loadImage(sample.url);
      state.photos.push({ id: sample.id, name: sample.name, url: sample.url });
      photoById.set(sample.id, img);
    } catch { /* sample missing: editor still works with uploads */ }
  }
  state.panelPhotos = state.panelPhotos.map((_, i) => (i % 2 === 0 ? 'boulevard' : 'pier'));
  syncPanelPhotoSelect();
  pushHistory();
  await document.fonts.ready;
  redraw();
}

boot();
