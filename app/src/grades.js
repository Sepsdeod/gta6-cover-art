// Colour grades for Neon Coast Cover Studio: each grade is a gradient map that
// turns a photo's luminance into a sunset / neon palette, GTA-poster style.
// A grade is a list of [luminance 0..1, colour] stops; buildGradeLut() turns it
// into a 256-entry per-channel lookup table for fast per-pixel mapping.

export const GRADES = [
  {
    id: 'sunset',
    name: 'Vice Sunset',
    dot: 'linear-gradient(135deg,#ffd76a,#ff7a3d 45%,#7b2d8b)',
    mix: 0.82,
    stops: [
      [0.00, '#160a26'], [0.18, '#3d1450'], [0.38, '#7b2d8b'],
      [0.58, '#d6336c'], [0.76, '#ff7a3d'], [0.90, '#ffd76a'], [1.00, '#fff3d6'],
    ],
  },
  {
    id: 'neon',
    name: 'Neon Night',
    dot: 'linear-gradient(135deg,#37e6ff,#ff2e88 55%,#2b1a5e)',
    mix: 0.85,
    stops: [
      [0.00, '#04041a'], [0.20, '#1c1445'], [0.42, '#5b1e8a'],
      [0.62, '#ff2e88'], [0.80, '#37e6ff'], [0.92, '#c9f6ff'], [1.00, '#ffffff'],
    ],
  },
  {
    id: 'teal',
    name: 'Teal Heat',
    dot: 'linear-gradient(135deg,#ffd166,#19b8a6 55%,#0b5e6b)',
    mix: 0.8,
    stops: [
      [0.00, '#02141a'], [0.22, '#0b4a55'], [0.45, '#0f8a7a'],
      [0.66, '#19b8a6'], [0.84, '#ffd166'], [1.00, '#fff6d8'],
    ],
  },
  {
    id: 'gold',
    name: 'Palm Gold',
    dot: 'linear-gradient(135deg,#ffe9a8,#d99a2b 55%,#6b4a1f)',
    mix: 0.78,
    stops: [
      [0.00, '#140f04'], [0.24, '#4a3413'], [0.48, '#8a5f1e'],
      [0.70, '#d99a2b'], [0.88, '#ffe9a8'], [1.00, '#fffbe8'],
    ],
  },
  {
    id: 'noir',
    name: 'Mono Noir',
    dot: 'linear-gradient(135deg,#f2f2f2,#666 55%,#111)',
    mix: 0.9,
    stops: [
      [0.00, '#050505'], [0.30, '#2a2233'], [0.55, '#6e6478'],
      [0.78, '#b9b0c2'], [1.00, '#f4eef7'],
    ],
  },
];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Builds a 256 x 3 lookup table mapping luminance to the grade's colour. */
export function buildGradeLut(grade) {
  const lut = new Uint8Array(256 * 3);
  const stops = grade.stops.map(([t, hex]) => [t, hexToRgb(hex)]);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const span = b[0] - a[0] || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let c = 0; c < 3; c++) {
      lut[i * 3 + c] = Math.round(a[1][c] + (b[1][c] - a[1][c]) * f);
    }
  }
  return lut;
}

/**
 * Applies a gradient-map grade to a canvas in place: luminance drives the
 * palette, then the graded image is blended back over the original by
 * grade.mix so skin and detail stay readable.
 */
export function applyGrade(canvas, grade) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const lut = buildGradeLut(grade);
  const mix = grade.mix;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    const j = lum * 3;
    d[i] = d[i] + (lut[j] - d[i]) * mix;
    d[i + 1] = d[i + 1] + (lut[j + 1] - d[i + 1]) * mix;
    d[i + 2] = d[i + 2] + (lut[j + 2] - d[i + 2]) * mix;
  }
  ctx.putImageData(image, 0, 0);
}
