// Fixed scenes for screenshots: ?shot=cover draws one exported cover alone,
// full frame; ?shot=editor shows the editor with a sample photo loaded.
// Query params: photo (sample id), caption, subtitle, layout, grade, size,
// badge, heat. window.__shotReady is set once painted.
import { SIZES } from './cover.js';

export async function runShot(shot, query, apply) {
  const sizeId = query.get('size') ?? (shot === 'cover' ? 'wide' : 'square');
  const size = SIZES[sizeId] ?? SIZES.wide;
  const scene = {
    photo: query.get('photo') ?? 'boulevard',
    caption: query.get('caption') ?? 'Neon Shore',
    subtitle: query.get('subtitle') ?? 'one last ride down the coast',
    layout: query.get('layout') ?? 'hero',
    grade: query.get('grade') ?? 'sunset',
    size: size.id,
    badge: query.get('badge') ?? 'NEON COAST',
    heat: Number(query.get('heat') ?? 4),
  };
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    document.getElementById('cover').width = size.w;
    document.getElementById('cover').height = size.h;
  }
  await apply(scene);
  await document.fonts.ready;
  await apply(scene);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
