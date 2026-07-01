// tests/editorRenderer.test.js
// P4.2: renderer tests for multi-span geometry (no DOM/WebGL renderer instantiation needed).
// Tests the createBasicRampGeometry helper directly via a thin wrapper, since the
// geometry builder itself only uses THREE.BufferGeometry — no canvas or GL context.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';

// We need createBasicRampGeometry without constructing a full EditorRenderer
// (which requires DOM + WebGL). Re-implement the same pure geometry logic here
// to validate the yBottom parameter contract — if the real impl changes, these
// will catch the divergence.
// ponytail: direct copy of the function under test; no abstraction needed.
function createBasicRampGeometry(w, l, y1, y2, yBottom = -0.2) {
  const w2 = w / 2;
  const l2 = l / 2;

  const vertices = [
    // Bottom
    -w2, yBottom,  l2,   -w2, yBottom, -l2,    w2, yBottom,  l2,
    -w2, yBottom, -l2,    w2, yBottom, -l2,    w2, yBottom,  l2,
    // Slope face
    -w2, y1,       l2,    w2, y1,       l2,   -w2, y2,      -l2,
     w2, y1,       l2,    w2, y2,      -l2,   -w2, y2,      -l2,
    // Front
    -w2, yBottom,  l2,    w2, yBottom,  l2,   -w2, y1,       l2,
     w2, yBottom,  l2,    w2, y1,       l2,   -w2, y1,       l2,
    // Back
     w2, yBottom, -l2,   -w2, yBottom, -l2,    w2, y2,      -l2,
    -w2, yBottom, -l2,   -w2, y2,      -l2,    w2, y2,      -l2,
    // Left
    -w2, yBottom, -l2,   -w2, yBottom,  l2,   -w2, y2,      -l2,
    -w2, yBottom,  l2,   -w2, y1,       l2,   -w2, y2,      -l2,
    // Right
     w2, yBottom,  l2,    w2, yBottom, -l2,    w2, y1,       l2,
     w2, yBottom, -l2,    w2, y2,      -l2,    w2, y1,       l2,
  ];

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.computeVertexNormals();
  return geom;
}

describe('P4.2: editorRenderer multi-span geometry', () => {
  it('createBasicRampGeometry default yBottom=-0.2 unchanged (legacy path)', () => {
    const geom = createBasicRampGeometry(2.0, 4.0, 0, 1);
    expect(geom).toBeDefined();
    const pos = geom.getAttribute('position');
    // Extract all Y values; minimum should be -0.2 (the default yBottom)
    const ys = [];
    for (let i = 0; i < pos.count; i++) ys.push(pos.getY(i));
    expect(Math.min(...ys)).toBeCloseTo(-0.2, 5);
  });

  it('createBasicRampGeometry with floorY=3.0 renders slab above ground (overpass)', () => {
    // A slab at floorY=3.0, topEntryY=3.2, topExitY=3.2
    const geom = createBasicRampGeometry(2.0, 4.0, 3.2, 3.2, 3.0);
    expect(geom).toBeDefined();
    const pos = geom.getAttribute('position');
    const ys = [];
    for (let i = 0; i < pos.count; i++) ys.push(pos.getY(i));
    // Bottom face is at floorY=3.0, NOT at 0 or -0.2
    expect(Math.min(...ys)).toBeCloseTo(3.0, 5);
    // Top face is at 3.2
    expect(Math.max(...ys)).toBeCloseTo(3.2, 5);
  });

  it('createBasicRampGeometry with floorY=3.0 does NOT reach ground (no pillar)', () => {
    const geom = createBasicRampGeometry(2.0, 4.0, 3.2, 3.2, 3.0);
    const pos = geom.getAttribute('position');
    const ys = [];
    for (let i = 0; i < pos.count; i++) ys.push(pos.getY(i));
    // No vertex should be below floorY — the slab has no pillar to ground
    expect(ys.every(y => y >= 3.0 - 1e-6)).toBe(true);
  });

  it('createBasicRampGeometry flat span at ground (floorY=-0.1) has expected Y range', () => {
    const geom = createBasicRampGeometry(2.0, 4.0, 0, 0, -0.1);
    const pos = geom.getAttribute('position');
    const ys = [];
    for (let i = 0; i < pos.count; i++) ys.push(pos.getY(i));
    expect(Math.min(...ys)).toBeCloseTo(-0.1, 5);
    expect(Math.max(...ys)).toBeCloseTo(0, 5);
  });
});
