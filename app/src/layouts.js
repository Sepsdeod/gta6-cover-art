// The six cover layouts of Neon Coast Cover Studio. Each layout is a function of
// the cover's pixel size returning its panels in relative (0..1) coordinates, so
// one layout works in every export size. A panel may carry a rotation for the
// tilted snapshot look. `gutter` is the gap between panels, also relative.

export const LAYOUTS = [
  {
    id: 'full',
    name: 'Full Bleed',
    blurb: 'One photo, edge to edge',
    gutter: 0,
    snapshot: false,
    panels(w, h) {
      return [{ x: 0, y: 0, w: 1, h: 1 }];
    },
  },
  {
    id: 'hero',
    name: 'Hero + Three',
    blurb: 'Big hero, three stacked',
    gutter: 0.012,
    snapshot: false,
    panels(w, h) {
      if (w >= h) {
        return [
          { x: 0, y: 0, w: 0.62, h: 1 },
          { x: 0.632, y: 0, w: 0.368, h: 0.325 },
          { x: 0.632, y: 0.3375, w: 0.368, h: 0.325 },
          { x: 0.632, y: 0.675, w: 0.368, h: 0.325 },
        ];
      }
      return [
        { x: 0, y: 0, w: 1, h: 0.62 },
        { x: 0, y: 0.632, w: 0.325, h: 0.368 },
        { x: 0.3375, y: 0.632, w: 0.325, h: 0.368 },
        { x: 0.675, y: 0.632, w: 0.325, h: 0.368 },
      ];
    },
  },
  {
    id: 'grid4',
    name: 'Four Panel',
    blurb: 'Classic 2 × 2 poster grid',
    gutter: 0.014,
    snapshot: false,
    panels(w, h) {
      return [
        { x: 0, y: 0, w: 0.493, h: 0.493 },
        { x: 0.507, y: 0, w: 0.493, h: 0.493 },
        { x: 0, y: 0.507, w: 0.493, h: 0.493 },
        { x: 0.507, y: 0.507, w: 0.493, h: 0.493 },
      ];
    },
  },
  {
    id: 'grid9',
    name: 'Nine Panel',
    blurb: 'The full 3 × 3 poster wall',
    gutter: 0.01,
    snapshot: false,
    panels(w, h) {
      const cells = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          cells.push({ x: c * 0.3367, y: r * 0.3367, w: 0.3267, h: 0.3267 });
        }
      }
      return cells;
    },
  },
  {
    id: 'tilted',
    name: 'Tilted Snapshot',
    blurb: 'Two photos, taped on askew',
    gutter: 0,
    snapshot: true,
    panels(w, h) {
      if (w >= h) {
        return [
          { x: 0.07, y: 0.05, w: 0.56, h: 0.72, rotate: -4 },
          { x: 0.56, y: 0.5, w: 0.36, h: 0.42, rotate: 5 },
        ];
      }
      return [
        { x: 0.08, y: 0.04, w: 0.78, h: 0.58, rotate: -4 },
        { x: 0.14, y: 0.58, w: 0.68, h: 0.34, rotate: 4 },
      ];
    },
  },
  {
    id: 'story',
    name: 'Story Strips',
    blurb: 'Three tall strips, side by side',
    gutter: 0.012,
    snapshot: false,
    panels(w, h) {
      return [
        { x: 0, y: 0, w: 0.325, h: 1 },
        { x: 0.3375, y: 0, w: 0.325, h: 1 },
        { x: 0.675, y: 0, w: 0.325, h: 1 },
      ];
    },
  },
];

export function getLayout(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

/** Panel rectangles in pixels for a cover of size w x h. */
export function layoutPanels(layout, w, h) {
  const g = layout.gutter * Math.min(w, h);
  return layout.panels(w, h).map((p) => ({
    x: p.x * w + g / 2,
    y: p.y * h + g / 2,
    w: p.w * w - g,
    h: p.h * h - g,
    rotate: p.rotate || 0,
    cx: (p.x + p.w / 2) * w,
    cy: (p.y + p.h / 2) * h,
  }));
}
