// Neon Coast Cover Studio — the cover engine. Draws a whole cover onto a canvas:
// panels of photos (each gradient-map graded), inked poster gutters, a halftone
// title block in Anton + a Pacifico neon subtitle, a badge ribbon, a heat meter
// of stars, film grain and a vignette. Pure 2D canvas, no network, no library.

import { GRADES, applyGrade } from './grades.js';
import { getLayout, layoutPanels } from './layouts.js';

export const SIZES = {
  square: { id: 'square', name: 'Square 1080 × 1080', w: 1080, h: 1080 },
  portrait: { id: 'portrait', name: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  wide: { id: 'wide', name: 'Wide 1920 × 1080', w: 1920, h: 1080 },
};

export const SAMPLE_PHOTOS = [
  { id: 'boulevard', name: 'Boulevard', url: 'samples/boulevard.jpg' },
  { id: 'pier', name: 'Pier', url: 'samples/pier.jpg' },
];

const GRADE_BY_ID = Object.fromEntries(GRADES.map((g) => [g.id, g]));

let noiseCanvas = null;
function getNoiseCanvas() {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 140;
  noiseCanvas.height = 140;
  const nctx = noiseCanvas.getContext('2d');
  const img = nctx.createImageData(140, 140);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  return noiseCanvas;
}

/** Cover-fits a photo into a rect, honouring the panel's zoom and pan. */
export function drawPhotoInto(ctx, img, rect, adjust) {
  const zoom = adjust?.zoom ?? 1;
  const dx = adjust?.dx ?? 0;
  const dy = adjust?.dy ?? 0;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(
    img,
    rect.x + (rect.w - dw) / 2 + dx * rect.w,
    rect.y + (rect.h - dh) / 2 + dy * rect.h,
    dw, dh,
  );
}

/** Draws one panel: photo (graded), poster ink border, snapshot frame if asked. */
function drawPanel(ctx, img, rect, adjust, grade, snapshot) {
  ctx.save();
  ctx.translate(rect.cx, rect.cy);
  if (rect.rotate) ctx.rotate((rect.rotate * Math.PI) / 180);
  ctx.translate(-rect.cx, -rect.cy);
  const frame = snapshot ? Math.round(Math.min(rect.w, rect.h) * 0.045) : 0;
  const inner = {
    x: rect.x - frame, y: rect.y - frame,
    w: rect.w + frame * 2, h: rect.h + frame * 2,
  };
  if (snapshot) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = Math.round(Math.min(rect.w, rect.h) * 0.03);
    ctx.shadowOffsetY = Math.round(Math.min(rect.w, rect.h) * 0.012);
    ctx.fillStyle = '#fdf8ef';
    ctx.fillRect(inner.x, inner.y, inner.w, inner.h + frame * 2.2);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (img) {
    if (grade) {
      const tmp = document.createElement('canvas');
      tmp.width = Math.max(2, Math.round(rect.w));
      tmp.height = Math.max(2, Math.round(rect.h));
      const tctx = tmp.getContext('2d');
      drawPhotoInto(tctx, img, { x: 0, y: 0, w: tmp.width, h: tmp.height }, adjust);
      applyGrade(tmp, grade);
      ctx.drawImage(tmp, rect.x, rect.y);
    } else {
      drawPhotoInto(ctx, img, rect, adjust);
    }
  } else {
    ctx.fillStyle = '#3a2058';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
  // Inked poster outline around the panel.
  ctx.save();
  ctx.translate(rect.cx, rect.cy);
  if (rect.rotate) ctx.rotate((rect.rotate * Math.PI) / 180);
  ctx.translate(-rect.cx, -rect.cy);
  ctx.lineWidth = Math.max(2, Math.round(Math.min(rect.w, rect.h) * 0.006));
  ctx.strokeStyle = snapshot ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.92)';
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Halftone dot field, dots growing toward the bottom of the region. */
export function drawHalftone(ctx, x, y, w, h, colour, maxR) {
  const step = Math.max(6, maxR * 2.4);
  ctx.save();
  ctx.fillStyle = colour;
  for (let row = 0; row * step < h; row++) {
    for (let col = 0; col * step < w; col++) {
      const f = row / Math.max(1, Math.floor(h / step));
      const r = Math.max(0.4, maxR * (0.25 + f * 0.9));
      ctx.beginPath();
      ctx.arc(x + col * step + step / 2, y + row * step + step / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Fits a one-line text to a width, returning the largest size that fits. */
export function fitFont(ctx, text, maxWidth, startSize, family, weight) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= Math.max(1, Math.round(size * 0.04));
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** The title block: scrim, halftone strip, gradient Anton title, neon subtitle. */
function drawTitleBlock(ctx, state, w, h, grade) {
  const bandH = Math.round(h * 0.26);
  const bandY = h - bandH;
  const scrim = ctx.createLinearGradient(0, bandY - bandH * 0.55, 0, h);
  scrim.addColorStop(0, 'rgba(12,4,24,0)');
  scrim.addColorStop(0.45, 'rgba(12,4,24,0.62)');
  scrim.addColorStop(1, 'rgba(12,4,24,0.92)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - bandH * 0.55, w, bandH * 1.55);

  // Gold-pink rule + halftone strip above the title.
  const ruleY = bandY + Math.round(bandH * 0.08);
  const rule = ctx.createLinearGradient(0, 0, w, 0);
  rule.addColorStop(0, '#ff2e88');
  rule.addColorStop(0.5, '#ff7a3d');
  rule.addColorStop(1, '#ffd76a');
  ctx.fillStyle = rule;
  ctx.fillRect(w * 0.06, ruleY, w * 0.88, Math.max(3, h * 0.004));
  drawHalftone(ctx, w * 0.06, ruleY + Math.max(4, h * 0.006), w * 0.88, bandH * 0.16, 'rgba(255,215,106,0.5)', Math.max(2, h * 0.004));

  const title = (state.title || 'UNTITLED').toUpperCase();
  const margin = w * 0.06;
  const titleSize = fitFont(ctx, title, w - margin * 2, Math.round(h * 0.115), 'Anton, sans-serif', '');
  const grad = ctx.createLinearGradient(0, bandY + bandH * 0.1, 0, bandY + bandH * 0.62);
  grad.addColorStop(0, '#fff3d6');
  grad.addColorStop(0.45, '#ffd76a');
  grad.addColorStop(0.75, '#ff7a3d');
  grad.addColorStop(1, '#ff2e88');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.font = `${titleSize}px Anton, sans-serif`;
  ctx.strokeStyle = 'rgba(20,4,32,0.9)';
  ctx.lineWidth = Math.max(2, titleSize * 0.09);
  const titleY = bandY + bandH * 0.58;
  ctx.strokeText(title, margin, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(title, margin, titleY);

  const sub = (state.subtitle || '').trim();
  if (sub) {
    const subSize = fitFont(ctx, sub, w - margin * 2, Math.round(h * 0.045), 'Pacifico, cursive', '');
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.shadowColor = grade.id === 'neon' ? '#37e6ff' : '#ff2e88';
    ctx.shadowBlur = Math.round(subSize * 0.55);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub, margin, bandY + bandH * 0.88);
    ctx.shadowBlur = 0;
  }
}

/** Diagonal badge ribbon across the top-left corner. */
function drawBadgeRibbon(ctx, text, w, h) {
  if (!text) return;
  const m = Math.min(w, h);
  const band = Math.max(18, Math.round(m * 0.042));
  const ribbonW = Math.round(m * 0.62);
  // The ribbon's axis runs from the top edge to the left edge; its centre sits
  // at the midpoint of that corner segment, (a/2, a/2) with a = ribbonW / sqrt(2).
  const a = ribbonW / Math.SQRT2;
  ctx.save();
  ctx.translate(a / 2, a / 2);
  ctx.rotate(-Math.PI / 4);
  const grad = ctx.createLinearGradient(-ribbonW / 2, 0, ribbonW / 2, 0);
  grad.addColorStop(0, '#ff2e88');
  grad.addColorStop(1, '#ff7a3d');
  ctx.fillStyle = grad;
  ctx.fillRect(-ribbonW / 2, -band / 2, ribbonW, band);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-ribbonW / 2, band / 2 - 2, ribbonW, 2);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = fitFont(ctx, text.toUpperCase(), ribbonW * 0.92, Math.round(band * 0.52), 'Anton, sans-serif', '');
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.fillText(text.toUpperCase(), 0, 1);
  ctx.restore();
}

/** Heat meter: five stars, `heat` of them lit, top-right corner. */
function drawHeatMeter(ctx, heat, w, h) {
  const size = Math.max(14, Math.round(Math.min(w, h) * 0.028));
  const gap = size * 0.28;
  const label = 'HEAT';
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(size * 0.62)}px Anton, sans-serif`;
  const labelW = ctx.measureText(label).width;
  const totalW = labelW + gap + size * 5 + gap * 4;
  const x0 = w - Math.round(w * 0.04) - totalW;
  const y = Math.round(h * 0.045);
  ctx.fillStyle = 'rgba(12,4,24,0.55)';
  const pad = Math.round(size * 0.4);
  ctx.fillRect(x0 - pad, y - size * 0.75, totalW + pad * 2, size * 1.5);
  ctx.fillStyle = '#ffd76a';
  ctx.fillText(label, x0 + labelW, y);
  for (let i = 0; i < 5; i++) {
    const cx = x0 + labelW + gap + size / 2 + i * (size + gap);
    drawStar(ctx, cx, y, size / 2, i < heat ? '#ffd76a' : 'rgba(255,255,255,0.28)');
  }
  ctx.restore();
}

function drawStar(ctx, cx, cy, r, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Film grain + vignette over the finished cover. */
function finishCover(ctx, w, h) {
  const pattern = ctx.createPattern(getNoiseCanvas(), 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(8,2,16,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draws the whole cover. `state` is the serialisable cover state, `photoById`
 * maps photo ids to loaded HTMLImageElements. Panels without a photo get the
 * first photo, so a cover is never empty.
 */
export function drawCover(canvas, state, photoById) {
  const size = SIZES[state.size] || SIZES.square;
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  const w = size.w;
  const h = size.h;
  const layout = getLayout(state.layout);
  const grade = GRADE_BY_ID[state.grade] || GRADES[0];

  // Backdrop: deep plum, with a soft sunset glow for the tilted layout.
  ctx.fillStyle = '#170b26';
  ctx.fillRect(0, 0, w, h);
  if (layout.snapshot) {
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.2, 10, w * 0.5, h * 0.2, Math.max(w, h) * 0.7);
    glow.addColorStop(0, 'rgba(255,122,61,0.35)');
    glow.addColorStop(0.55, 'rgba(255,46,136,0.16)');
    glow.addColorStop(1, 'rgba(23,11,38,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    drawHalftone(ctx, 0, h * 0.72, w, h * 0.28, 'rgba(255,215,106,0.28)', Math.max(2, h * 0.005));
  }

  const panels = layoutPanels(layout, w, h);
  const fallbackId = state.photos[0]?.id ?? null;
  panels.forEach((rect, i) => {
    const photoId = state.panelPhotos[i] ?? fallbackId;
    const img = photoId ? photoById.get(photoId) ?? null : null;
    drawPanel(ctx, img, rect, state.panelAdjust[i], grade, layout.snapshot);
  });

  drawTitleBlock(ctx, state, w, h, grade);
  drawBadgeRibbon(ctx, state.badge, w, h);
  drawHeatMeter(ctx, state.heat, w, h);
  finishCover(ctx, w, h);
}
