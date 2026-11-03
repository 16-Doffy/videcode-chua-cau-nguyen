// Flat geometry on the ground plane, points as [x, z]. Shared by the simulation and the 3D world.

export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Closest point on segment ab to p, and how far. */
export function nearestOnSegment(p, a, b) {
  const dx = b[0] - a[0]; const dz = b[1] - a[1]; const len2 = dx * dx + dz * dz || 1e-9;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2));
  const q = [a[0] + dx * t, a[1] + dz * t];
  return { point: q, t, d: dist(p, q) };
}

export function segmentsCross(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b) && o(a, b, c) !== 0 && o(c, d, a) !== 0;
}

export function pointInPoly(p, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i]; const [xj, zj] = pts[j];
    if ((zi > p[1]) !== (zj > p[1]) && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function polyArea(pts) {
  let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i]; const b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return Math.abs(s) / 2;
}
export function polyPerimeter(pts) { let s = 0; for (let i = 0; i < pts.length; i++) s += dist(pts[i], pts[(i + 1) % pts.length]); return s; }
export function polyCentre(pts) { return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]; }
export const edges = (pts) => pts.map((p, i) => [p, pts[(i + 1) % pts.length]]);

/** How far p is from the outline of a polygon. */
export function distToPoly(p, pts) { let m = Infinity; for (const [a, b] of edges(pts)) m = Math.min(m, nearestOnSegment(p, a, b).d); return m; }

/** Shortest gap between segment ab and a polygon's outline, and the outline point there. */
export function segmentToPoly(a, b, pts) {
  let best = { d: Infinity, point: null };
  for (const [c, d] of edges(pts)) {
    if (segmentsCross(a, b, c, d)) return { d: 0, point: a };
    for (const [p, s0, s1, onPoly] of [[a, c, d, true], [b, c, d, true], [c, a, b, false], [d, a, b, false]]) {
      const n = nearestOnSegment(p, s0, s1);
      if (n.d < best.d) best = { d: n.d, point: onPoly ? n.point : p };
    }
  }
  return best;
}

export function polySelfCrosses(pts) {
  const e = edges(pts);
  for (let i = 0; i < e.length; i++) for (let j = i + 1; j < e.length; j++) {
    if (j === i + 1 || (i === 0 && j === e.length - 1)) continue;
    if (segmentsCross(e[i][0], e[i][1], e[j][0], e[j][1])) return true;
  }
  return false;
}

/** A random point inside a polygon, at least `margin` from its outline. */
export function randomInPoly(pts, margin = 1, rnd = Math.random) {
  const xs = pts.map((p) => p[0]); const zs = pts.map((p) => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  for (let k = 0; k < 40; k++) {
    const p = [x0 + rnd() * (x1 - x0), z0 + rnd() * (z1 - z0)];
    if (pointInPoly(p, pts) && distToPoly(p, pts) >= margin) return p;
  }
  return polyCentre(pts);
}
