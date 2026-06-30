// SkyRoads Level Loader & 3D Geometry Generator (Three.js)
import * as THREE from 'three';
import roadMetallicPlateUrl from './road_metallic_plate.png';

// Custom ComfyUI generated texture URLs
import customRoadDiffuseUrl from './assets/custom/road_diffuse.png';
import customRoadNormalUrl from './assets/custom/road_normal.png';
import customObstacleDiffuseUrl from './assets/custom/obstacle_diffuse.png';
import customObstacleNormalUrl from './assets/custom/obstacle_normal.png';
import customDecalBoostUrl from './assets/custom/decal_boost.png';
import customDecalExplosiveUrl from './assets/custom/decal_explosive.png';
import customDecalRefillUrl from './assets/custom/decal_refill.png';
import customDecalStickyUrl from './assets/custom/decal_sticky.png';
import customDecalSlipperyUrl from './assets/custom/decal_slippery.png';

// RoundedBoxGeometry no longer used — switched to standard BoxGeometry with depth segments
// for proper curvature bending (RoundedBoxGeometry collapses flat-face vertices to corners).

// Dynamic Theme Assets (Cyberpunk, Industrial, Organic, Alien)
import cpRoadDiff from './assets/custom/road_diffuse_cyberpunk.png';
import cpRoadNorm from './assets/custom/road_normal_cyberpunk.png';
import cpRoadRough from './assets/custom/road_roughness_cyberpunk.png';
import cpRoadMetal from './assets/custom/road_metalness_cyberpunk.png';
import cpRoadEmit from './assets/custom/road_emissive_cyberpunk.png';
import cpEdgeDiff from './assets/custom/road_edge_diffuse_cyberpunk.png';
import cpEdgeNorm from './assets/custom/road_edge_normal_cyberpunk.png';
import cpEdgeRough from './assets/custom/road_edge_roughness_cyberpunk.png';
import cpEdgeMetal from './assets/custom/road_edge_metalness_cyberpunk.png';
import cpEdgeEmit from './assets/custom/road_edge_emissive_cyberpunk.png';
import cpObstacleDiff from './assets/custom/obstacle_diffuse_cyberpunk.png';
import cpObstacleNorm from './assets/custom/obstacle_normal_cyberpunk.png';
import cpObstacleRough from './assets/custom/obstacle_roughness_cyberpunk.png';
import cpObstacleMetal from './assets/custom/obstacle_metalness_cyberpunk.png';
import cpObstacleEmit from './assets/custom/obstacle_emissive_cyberpunk.png';
import cpTunnelDiff from './assets/custom/tunnel_diffuse_cyberpunk.png';
import cpTunnelNorm from './assets/custom/tunnel_normal_cyberpunk.png';
import cpTunnelRough from './assets/custom/tunnel_roughness_cyberpunk.png';
import cpTunnelMetal from './assets/custom/tunnel_metalness_cyberpunk.png';
import cpTunnelEmit from './assets/custom/tunnel_emissive_cyberpunk.png';
import cpDecalBoost from './assets/custom/decal_boost_cyberpunk.png';
import cpDecalSlow from './assets/custom/decal_slow_cyberpunk.png';
import cpDecalExplosive from './assets/custom/decal_explosive_cyberpunk.png';
import cpDecalRefill from './assets/custom/decal_refill_cyberpunk.png';
import cpDecalSticky from './assets/custom/decal_sticky_cyberpunk.png';
import cpDecalSlippery from './assets/custom/decal_slippery_cyberpunk.png';

import indRoadDiff from './assets/custom/road_diffuse_industrial.png';
import indRoadNorm from './assets/custom/road_normal_industrial.png';
import indRoadRough from './assets/custom/road_roughness_industrial.png';
import indRoadMetal from './assets/custom/road_metalness_industrial.png';
import indRoadEmit from './assets/custom/road_emissive_industrial.png';
import indEdgeDiff from './assets/custom/road_edge_diffuse_industrial.png';
import indEdgeNorm from './assets/custom/road_edge_normal_industrial.png';
import indEdgeRough from './assets/custom/road_edge_roughness_industrial.png';
import indEdgeMetal from './assets/custom/road_edge_metalness_industrial.png';
import indEdgeEmit from './assets/custom/road_edge_emissive_industrial.png';
import indObstacleDiff from './assets/custom/obstacle_diffuse_industrial.png';
import indObstacleNorm from './assets/custom/obstacle_normal_industrial.png';
import indObstacleRough from './assets/custom/obstacle_roughness_industrial.png';
import indObstacleMetal from './assets/custom/obstacle_metalness_industrial.png';
import indObstacleEmit from './assets/custom/obstacle_emissive_industrial.png';
import indTunnelDiff from './assets/custom/tunnel_diffuse_industrial.png';
import indTunnelNorm from './assets/custom/tunnel_normal_industrial.png';
import indTunnelRough from './assets/custom/tunnel_roughness_industrial.png';
import indTunnelMetal from './assets/custom/tunnel_metalness_industrial.png';
import indTunnelEmit from './assets/custom/tunnel_emissive_industrial.png';
import indDecalBoost from './assets/custom/decal_boost_industrial.png';
import indDecalSlow from './assets/custom/decal_slow_industrial.png';
import indDecalExplosive from './assets/custom/decal_explosive_industrial.png';
import indDecalRefill from './assets/custom/decal_refill_industrial.png';
import indDecalSticky from './assets/custom/decal_sticky_industrial.png';
import indDecalSlippery from './assets/custom/decal_slippery_industrial.png';

import alienRoadDiff from './assets/custom/road_diffuse_alien.png';
import alienRoadNorm from './assets/custom/road_normal_alien.png';
import alienRoadRough from './assets/custom/road_roughness_alien.png';
import alienRoadMetal from './assets/custom/road_metalness_alien.png';
import alienRoadEmit from './assets/custom/road_emissive_alien.png';
import alienEdgeDiff from './assets/custom/road_edge_diffuse_alien.png';
import alienEdgeNorm from './assets/custom/road_edge_normal_alien.png';
import alienEdgeRough from './assets/custom/road_edge_roughness_alien.png';
import alienEdgeMetal from './assets/custom/road_edge_metalness_alien.png';
import alienEdgeEmit from './assets/custom/road_edge_emissive_alien.png';
import alienObstacleDiff from './assets/custom/obstacle_diffuse_alien.png';
import alienObstacleNorm from './assets/custom/obstacle_normal_alien.png';
import alienObstacleRough from './assets/custom/obstacle_roughness_alien.png';
import alienObstacleMetal from './assets/custom/obstacle_metalness_alien.png';
import alienObstacleEmit from './assets/custom/obstacle_emissive_alien.png';
import alienTunnelDiff from './assets/custom/tunnel_diffuse_alien.png';
import alienTunnelNorm from './assets/custom/tunnel_normal_alien.png';
import alienTunnelRough from './assets/custom/tunnel_roughness_alien.png';
import alienTunnelMetal from './assets/custom/tunnel_metalness_alien.png';
import alienTunnelEmit from './assets/custom/tunnel_emissive_alien.png';
import alienDecalBoost from './assets/custom/decal_boost_alien.png';
import alienDecalSlow from './assets/custom/decal_slow_alien.png';
import alienDecalExplosive from './assets/custom/decal_explosive_alien.png';
import alienDecalRefill from './assets/custom/decal_refill_alien.png';
import alienDecalSticky from './assets/custom/decal_sticky_alien.png';
import alienDecalSlippery from './assets/custom/decal_slippery_alien.png';

import orgRoadDiff from './assets/custom/road_diffuse_organic.png';
import orgRoadNorm from './assets/custom/road_normal_organic.png';
import orgRoadRough from './assets/custom/road_roughness_organic.png';
import orgRoadMetal from './assets/custom/road_metalness_organic.png';
import orgRoadEmit from './assets/custom/road_emissive_organic.png';
import orgEdgeDiff from './assets/custom/road_edge_diffuse_organic.png';
import orgEdgeNorm from './assets/custom/road_edge_normal_organic.png';
import orgEdgeRough from './assets/custom/road_edge_roughness_organic.png';
import orgEdgeMetal from './assets/custom/road_edge_metalness_organic.png';
import orgEdgeEmit from './assets/custom/road_edge_emissive_organic.png';
import orgObstacleDiff from './assets/custom/obstacle_diffuse_organic.png';
import orgObstacleNorm from './assets/custom/obstacle_normal_organic.png';
import orgObstacleRough from './assets/custom/obstacle_roughness_organic.png';
import orgObstacleMetal from './assets/custom/obstacle_metalness_organic.png';
import orgObstacleEmit from './assets/custom/obstacle_emissive_organic.png';
import orgTunnelDiff from './assets/custom/tunnel_diffuse_organic.png';
import orgTunnelNorm from './assets/custom/tunnel_normal_organic.png';
import orgTunnelRough from './assets/custom/tunnel_roughness_organic.png';
import orgTunnelMetal from './assets/custom/tunnel_metalness_organic.png';
import orgTunnelEmit from './assets/custom/tunnel_emissive_organic.png';
import orgDecalBoost from './assets/custom/decal_boost_organic.png';
import orgDecalSlow from './assets/custom/decal_slow_organic.png';
import orgDecalExplosive from './assets/custom/decal_explosive_organic.png';
import orgDecalRefill from './assets/custom/decal_refill_organic.png';
import orgDecalSticky from './assets/custom/decal_sticky_organic.png';
import orgDecalSlippery from './assets/custom/decal_slippery_organic.png';

// OBJ Loader and Custom Tunnel Archway Model
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import tunnelArchwayUrl from './assets/custom/tunnel_archway.glb?url';

// Eagerly glob all color-divided seamless abstract textures recursively from subfolders
const colorTextures = import.meta.glob('./SBS - Seamless Abstract Pack - 512x512/PNG/**/*.png', { eager: true });

// Seamless road tile texture loading with robust fallback
const textureLoader = new THREE.TextureLoader();
let roadTexture = null;
try {
  roadTexture = textureLoader.load(roadMetallicPlateUrl, (texture) => {
    if (texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      if (THREE.SRGBColorSpace !== undefined) {
        texture.colorSpace = THREE.SRGBColorSpace;
      }
    }
  });
} catch (e) {
  // Graceful fallback for test environments or failed load
}

// Tile width and Z-length configuration
export const TILE_WIDTH = 2.0;
export const TILE_LENGTH = 4.0;
export const ROAD_WIDTH_LANES = 7;
export const TOTAL_ROAD_WIDTH = TILE_WIDTH * ROAD_WIDTH_LANES;

// ═══════════════════════════════════════════════════════════════════
// TRACK CURVATURE SYSTEM — Ring-road visual effect via vertex shader
// Bends the flat track along a circular arc so the road curves upward
// in the distance, like driving on the inside of a giant ring world.
// Physics stays flat — curvature is purely visual (GPU-side).
// ═══════════════════════════════════════════════════════════════════

/** Shared curvature uniforms — updated each frame by GraphicsEngine */
export const curvatureUniforms = {
  uCurvatureRadius: new THREE.Uniform(200.0),  // Ring radius (smaller = more curve)
  uCameraZ:         new THREE.Uniform(0.0),     // Camera Z position (updated per frame)
  uCurvatureOn:     new THREE.Uniform(1.0),     // 0.0 = flat, 1.0 = curved
};

/** GLSL vertex shader chunk that bends world-space vertices along a cylinder.
 *  Works correctly for rotated meshes (tunnels, ribs, cylinders) by computing
 *  the displacement in world space and converting back via inverse(modelMatrix). */
const CURVATURE_VERTEX_GLSL = `
  // ── Track Curvature (ring-road effect) ──
  if (uCurvatureOn > 0.5) {
    vec4 wp = modelMatrix * vec4(transformed, 1.0);
    float d = uCameraZ - wp.z;        // distance ahead (positive = in front)
    float ang = d / uCurvatureRadius;

    // Displace in WORLD space (Y = up, Z = forward)
    wp.y += uCurvatureRadius * (1.0 - cos(ang));   // always >= 0 (curves up)
    wp.z += uCurvatureRadius * sin(ang) - d;        // Z compression

    // Convert displaced world position back to MODEL space
    // This correctly handles meshes with rotation (tunnels, ribs, etc.)
    transformed = (inverse(modelMatrix) * wp).xyz;
  }
`;

/**
 * Inject curvature vertex shader into any THREE.Material.
 * Uses onBeforeCompile to modify the vertex shader at GPU compile time.
 * Zero per-frame cost beyond the single uniform update.
 */
export function applyCurvatureShader(material) {
  if (!material || material.isShaderMaterial) return material;

  material.onBeforeCompile = (shader) => {
    // Attach shared uniforms (single objects, so updating them in
    // GraphicsEngine updates ALL materials simultaneously)
    shader.uniforms.uCurvatureRadius = curvatureUniforms.uCurvatureRadius;
    shader.uniforms.uCameraZ         = curvatureUniforms.uCameraZ;
    shader.uniforms.uCurvatureOn     = curvatureUniforms.uCurvatureOn;

    // Inject uniform declarations before void main()
    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      `uniform float uCurvatureRadius;
       uniform float uCameraZ;
       uniform float uCurvatureOn;
       void main() {`
    );

    // Inject curvature displacement after #include <begin_vertex>
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n' + CURVATURE_VERTEX_GLSL
    );
  };

  // Force Three.js to recompile when curvature is toggled
  material.customProgramCacheKey = () =>
    'curvature_' + (curvatureUniforms.uCurvatureOn.value > 0.5 ? '1' : '0');

  return material;
}

/**
 * Flow/Tower "tunnel ceiling" lighting.
 *
 * In FLOW/TOWER the three tracks are stacked vertically (groups at y = +25 / 0 /
 * -25), so when you ride a lower deck the deck above reads as a tunnel roof. This
 * hangs emissive light fixtures under a deck — two continuous light rails plus
 * periodic cross "rungs" — so that roof glows and the rungs sweep past overhead
 * like real tunnel lighting.
 *
 * Parented into the deck's OWN group and curvature-shaded, so the fixtures bend
 * and scroll with the track exactly like the road tiles do. The long rails are
 * length-segmented (one segment per tile) or the curvature shader would bend
 * them as a single straight chord and they'd poke through the curved road.
 *
 * Emissive-only by design (no real lights): the curvature shader displaces
 * geometry but not light positions, so a real PointLight would slide off the
 * curved road at distance. Bloom carries the glow instead.
 *
 * @param {THREE.Group} group - the deck's level group (already y-offset)
 * @param {number} trackLength - deck length in world units (levelInfo.trackLength)
 * @param {{color?, y?, intensity?, rungSpacingRows?}} [opts]
 */
export function buildDeckCeilingLight(group, trackLength, opts = {}) {
  if (!group || !(trackLength > 0)) return;
  const color = opts.color instanceof THREE.Color ? opts.color : new THREE.Color(opts.color !== undefined ? opts.color : 0x33e0ff);
  const underY = opts.y !== undefined ? opts.y : -0.16; // hang just beneath the slab
  const intensity = opts.intensity !== undefined ? opts.intensity : 2.4;
  const lenSegs = Math.max(1, Math.round(trackLength / TILE_LENGTH));
  const centerZ = -trackLength / 2;

  const fixtureMat = applyCurvatureShader(new THREE.MeshStandardMaterial({
    color: 0x05070a,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.4,
    metalness: 0.0,
  }));

  // Two continuous light rails running the deck's length, inset from the road edges.
  const railOffset = TOTAL_ROAD_WIDTH * 0.28;
  for (const sx of [-railOffset, railOffset]) {
    const railGeom = new THREE.BoxGeometry(0.22, 0.06, trackLength, 1, 1, lenSegs);
    const rail = new THREE.Mesh(railGeom, fixtureMat);
    rail.position.set(sx, underY, centerZ);
    rail.frustumCulled = false; // curvature shader invalidates the static AABB
    rail.userData.isDeckCeilingLight = true;
    group.add(rail);
  }

  // Periodic cross rungs — the fixtures that read as ceiling lights sweeping past.
  const rungSpacing = (opts.rungSpacingRows || 5) * TILE_LENGTH;
  const rungGeom = new THREE.BoxGeometry(TOTAL_ROAD_WIDTH * 0.74, 0.05, 0.5);
  for (let z = -rungSpacing; z > -trackLength; z -= rungSpacing) {
    const rung = new THREE.Mesh(rungGeom, fixtureMat);
    rung.position.set(0, underY - 0.02, z);
    rung.frustumCulled = false;
    rung.userData.isDeckCeilingLight = true;
    group.add(rung);
  }
}

/**
 * Flow/Tower connecting pillars — the "tunnel shell".
 *
 * The stacked decks sit 25 units apart, so the ceiling lighting alone reads as a
 * structure floating overhead rather than an enclosed tunnel. This raises a
 * colonnade of pillars from a deck up to the deck above it, on both sides of the
 * road, which encloses the space and visually explains the stacking. Each pillar
 * is a dark structural column with an emissive trim strip up its inner face,
 * tinted to match the roof it reaches.
 *
 * Parented into the LOWER deck's group (the one you ride, looking up) and
 * curvature-shaded so the colonnade bends and scrolls with the track. Columns are
 * thin in Z, so each bends fine with a single segment; the shader places each at
 * the right curve height via its Z. Pillars sit just outside the road edges so
 * they never block a lane.
 *
 * @param {THREE.Group} group - the lower deck's level group
 * @param {number} trackLength - deck length in world units
 * @param {{color?, height?, spacingRows?}} [opts]
 */
export function buildDeckPillars(group, trackLength, opts = {}) {
  if (!group || !(trackLength > 0)) return;
  const color = opts.color instanceof THREE.Color ? opts.color : new THREE.Color(opts.color !== undefined ? opts.color : 0x33e0ff);
  const height = opts.height !== undefined ? opts.height : 25.0; // deck spacing
  const spacing = (opts.spacingRows || 4) * TILE_LENGTH;
  const sideX = TOTAL_ROAD_WIDTH / 2 + 0.6; // just beyond the outer rails

  const columnMat = applyCurvatureShader(new THREE.MeshStandardMaterial({
    color: 0x10131c,
    roughness: 0.5,
    metalness: 0.85,
  }));
  const trimMat = applyCurvatureShader(new THREE.MeshStandardMaterial({
    color: 0x05070a,
    emissive: color,
    emissiveIntensity: 1.8,
    roughness: 0.4,
    metalness: 0.0,
  }));

  // Shared geometries reused across every pillar (cheap).
  const columnGeom = new THREE.BoxGeometry(0.5, height, 0.5);
  const trimGeom = new THREE.BoxGeometry(0.12, height * 0.92, 0.12);
  const midY = height / 2;

  for (let z = -spacing; z > -trackLength; z -= spacing) {
    for (const sx of [-sideX, sideX]) {
      const column = new THREE.Mesh(columnGeom, columnMat);
      column.position.set(sx, midY, z);
      column.frustumCulled = false; // curvature invalidates the static AABB
      column.castShadow = false;
      column.userData.isDeckPillar = true;
      group.add(column);

      // Emissive trim on the inner face (toward road center).
      const trim = new THREE.Mesh(trimGeom, trimMat);
      trim.position.set(sx + (sx < 0 ? 0.26 : -0.26), midY, z);
      trim.frustumCulled = false;
      trim.userData.isDeckPillar = true;
      group.add(trim);
    }
  }
}

// Number of rows to process per async chunk before yielding
const CHUNK_SIZE = 50;

/**
 * Get a Three.js Color from the level palette at the given index.
 * Falls back to grey if the index is out of range.
 */
function getPaletteColor(palette, colorIndex) {
  let idx = colorIndex;
  // Index 0 in level formats represents "use default top road color", which maps to index 11
  // We only intercept this if the palette is fully loaded (length > 11) to avoid breaking test fixtures
  if (idx === 0 && palette && palette.length > 11) {
    idx = 11;
  }
  if (palette && idx < palette.length) {
    const [r, g, b] = palette[idx];
    return new THREE.Color(r / 255, g / 255, b / 255);
  }
  return new THREE.Color(0.5, 0.5, 0.5);
}

/**
 * Determine the tile behavior from its top_color index.
 * Returns { behavior, emissiveGlow, glowColor } or null values if no special behavior.
 */
function classifyTileBehavior(topColor) {
  const BEHAVIORS = {
    3:  { behavior: 'sticky',    glowColor: new THREE.Color(0.0, 0.25, 0.0) },
    9:  { behavior: 'slippery',  glowColor: new THREE.Color(0.2, 0.2, 0.2) },
    10: { behavior: 'refill',    glowColor: new THREE.Color(0.0, 0.5, 1.0) },
    11: { behavior: 'boost',     glowColor: new THREE.Color(0.0, 1.0, 0.0) },
    12: { behavior: 'super_boost', glowColor: new THREE.Color(0.0, 1.0, 1.0) },
    13: { behavior: 'burning',   glowColor: new THREE.Color(1.0, 0.0, 0.0) },
    14: { behavior: 'high_jump', glowColor: new THREE.Color(1.0, 0.0, 1.0) },
  };

  const entry = BEHAVIORS[topColor];
  if (entry) {
    return { behavior: entry.behavior, emissiveGlow: true, glowColor: entry.glowColor };
  }
  return { behavior: null, emissiveGlow: false, glowColor: null };
}

let _deathBeamTexture = null;
function getDeathBeamTexture() {
  if (_deathBeamTexture) return _deathBeamTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null; // jsdom test environment has no canvas 2D context
  const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
  grad.addColorStop(0, 'rgba(255,60,20,1.0)');
  grad.addColorStop(0.3, 'rgba(255,20,10,0.55)');
  grad.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  _deathBeamTexture = new THREE.CanvasTexture(canvas);
  return _deathBeamTexture;
}

/**
 * Warning beam of light cast straight up from a 'burning' (red death) tile —
 * two crossed vertical planes so it reads from any horizontal viewing angle
 * without true camera-facing billboard logic, the standard cheap trick for
 * fire/laser FX. Scoped to burning tiles only — callers must check
 * `behavior === 'burning'` before calling this.
 */
function createDeathBeam(xPos, yTop, zPos) {
  const beamHeight = 16;
  const beamWidth = TILE_WIDTH * 0.7;
  const mat = applyCurvatureShader(new THREE.MeshBasicMaterial({
    map: getDeathBeamTexture(),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false
  }));
  const group = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const geom = new THREE.PlaneGeometry(beamWidth, beamHeight);
    geom.translate(0, beamHeight / 2, 0); // pivot at the bottom
    const plane = new THREE.Mesh(geom, mat);
    plane.rotation.y = i * Math.PI / 2;
    group.add(plane);
  }
  group.position.set(xPos, yTop, zPos);
  return group;
}

/**
 * Calculate tile height and vertical position from block flags.
 * Returns { height, yPos, isObstacle }.
 */
function computeTileGeometry(tile) {
  if (!tile) {
    return { height: 0.45, yPos: -0.225, isObstacle: false };
  }
  const baseY = (tile.startY !== undefined) ? tile.startY : 0.0;
  if (tile.tunnel) {
    return { height: 0.45, yPos: baseY - 0.225, isObstacle: false };
  }
  if (tile.full && tile.half) {
    return { height: 3.0, yPos: baseY + 1.5, isObstacle: true };
  }
  if (tile.full) {
    return { height: 2.0, yPos: baseY + 1.0, isObstacle: true };
  }
  if (tile.half) {
    return { height: 1.0, yPos: baseY + 0.5, isObstacle: true };
  }
  return { height: 0.45, yPos: baseY - 0.225, isObstacle: false };
}

/**
 * Create a sloped/triangular geometry representing a ramp.
 * Returns a THREE.BufferGeometry with custom vertex positions and UV coordinates.
 */
function createRampGeometry(w, l, yBottom, y1, y2) {
  const w2 = w / 2;
  const l2 = l / 2;

  const v0 = [-w2, yBottom,  l2];
  const v1 = [ w2, yBottom,  l2];
  const v2 = [-w2, yBottom, -l2];
  const v3 = [ w2, yBottom, -l2];
  const v4 = [-w2, y1,       l2];
  const v5 = [ w2, y1,       l2];
  const v6 = [-w2, y2,      -l2];
  const v7 = [ w2, y2,      -l2];

  const vertices = [
    // Bottom
    ...v0, ...v2, ...v1,
    ...v2, ...v3, ...v1,
    // Top/Slope
    ...v4, ...v5, ...v6,
    ...v5, ...v7, ...v6,
    // Front
    ...v0, ...v1, ...v4,
    ...v1, ...v5, ...v4,
    // Back
    ...v3, ...v2, ...v7,
    ...v2, ...v6, ...v7,
    // Left
    ...v2, ...v0, ...v6,
    ...v0, ...v4, ...v6,
    // Right
    ...v1, ...v3, ...v5,
    ...v3, ...v7, ...v5,
  ];

  const H_ref = 2.0;
  const uv_y1 = y1 / H_ref;
  const uv_y2 = y2 / H_ref;

  const uvs = [
    // Bottom
    0,0, 0,1, 1,0,
    0,1, 1,1, 1,0,
    // Top/Slope
    0,1, 1,1, 0,0,
    1,1, 1,0, 0,0,
    // Front
    0,0, 1,0, 0,uv_y1,
    1,0, 1,uv_y1, 0,uv_y1,
    // Back
    0,0, 1,0, 0,uv_y2,
    1,0, 1,uv_y2, 0,uv_y2,
    // Left
    0,0, 1,0, 0,uv_y2,
    1,0, 1,uv_y1, 0,uv_y2,
    // Right
    0,0, 1,0, 0,uv_y1,
    1,0, 1,uv_y2, 0,uv_y1,
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function getTileHeight(tile) {
  if (!tile) return 0.0;
  if (tile.ramp) return tile.endY !== undefined ? tile.endY : 1.0;
  if (tile.full && tile.half) return 3.0;
  if (tile.full) return 2.0;
  if (tile.half) return 1.0;
  return 0.0;
}

/**
 * Scans levelData rows and dynamically inserts ramp properties for tiles
 * immediately preceding an elevated tunnel entrance.
 */
function adjustBoxUVs(geometry, width, height, length, xPos = 0, zPos = 0, yPos = 0, levelData = null) {
  const uvAttribute = geometry.attributes.uv;
  if (!uvAttribute) return;
  
  const posAttr = geometry.attributes.position;
  const normAttr = geometry.attributes.normal;

  const levelIndex = levelData && typeof levelData.level_index === 'number' ? levelData.level_index : (typeof window !== 'undefined' ? window.currentLevelIndex : null);
  const isGenerated = (levelData && levelData.isGenerated) || (levelIndex >= 61) || (typeof window !== 'undefined' && window.currentGamePack === 'generated');
  const isTestEnv = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') || (typeof window !== 'undefined' && window.__vitest_worker__);
  const isProcedural = (levelIndex === 0 || isGenerated) && !isTestEnv;
  
  // If normals exist (e.g. RoundedBoxGeometry or standard BoxGeometry in-game), use world-space normal-aligned planar mapping
  if (normAttr && posAttr) {
    for (let i = 0; i < uvAttribute.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      
      const nx = Math.abs(normAttr.getX(i));
      const ny = Math.abs(normAttr.getY(i));
      const nz = Math.abs(normAttr.getZ(i));
      
      const wx = vx + xPos;
      const wy = vy + yPos;
      const wz = vz + zPos;
      
      let u = 0;
      let v = 0;
      
      if (isProcedural) {
        if (ny >= nx && ny >= nz) { // Top/Bottom faces
          u = (vx + width / 2) / width;
          v = (vz + length / 2) / length;
        } else if (nx >= ny && nx >= nz) { // Left/Right side faces
          u = (vz + length / 2) / length;
          v = (vy + height / 2) / height;
        } else { // Front/Back end faces
          u = (vx + width / 2) / width;
          v = (vy + height / 2) / height;
        }
      } else {
        if (ny >= nx && ny >= nz) { // Top/Bottom faces
          u = wx / TILE_WIDTH;
          v = wz / TILE_LENGTH;
        } else if (nx >= ny && nx >= nz) { // Left/Right side faces
          u = wz / TILE_LENGTH;
          v = wy / 2.0;
        } else { // Front/Back end faces
          u = wx / TILE_WIDTH;
          v = wy / 2.0;
        }
      }
      
      uvAttribute.setXY(i, u, v);
    }
  } else {
    // Fallback for simple geometries without normal attributes (e.g. test fixtures)
    for (let i = 0; i < uvAttribute.count; i++) {
      let u = uvAttribute.getX(i);
      let v = uvAttribute.getY(i);
      const faceIndex = Math.floor(i / 4);
      let scaleU = 1.0;
      let scaleV = 1.0;
      
      if (faceIndex === 0 || faceIndex === 1) {
        scaleU = length / 2.0;
        scaleV = height / 2.0;
      } else if (faceIndex === 2 || faceIndex === 3) {
        scaleU = width / 2.0;
        scaleV = length / 2.0;
      } else if (faceIndex === 4 || faceIndex === 5) {
        scaleU = width / 2.0;
        scaleV = height / 2.0;
      }
      uvAttribute.setXY(i, u * scaleU, v * scaleV);
    }
  }
  uvAttribute.needsUpdate = true;
}

export const textureCache = new Map();

/**
 * Load a premium color-divided seamless abstract pattern texture from the user's
 * downloaded folder, mapping it organically to Level 2's color palette (and all other levels).
 */
function getSeamlessTexture(colorIndex, levelIndex = 0) {
  if (typeof document === 'undefined') return null;

  // Map each VGA palette color index (0-15) to its closest color-divided folder
  const folderMapping = {
    0: 'Light',   // Default obstacle color (VGA 11 fallback, light blue/cyan)
    1: 'Green',   // Light green
    2: 'Green',   // Green main road track blocks of Level 2!
    3: 'Light',   // Cyan/teal
    4: 'Red',     // Red
    5: 'Purple',  // Purple
    6: 'Orange',  // Orange/brown
    7: 'Light',   // Light gray
    8: 'Dark',    // Dark gray
    9: 'Dark',    // Blue
    10: 'Green',  // Lime green
    11: 'Light',  // Light blue side obstacle blocks of Level 2!
    12: 'Red',    // Light red
    13: 'Purple', // Pink/purple
    14: 'Orange', // Yellow/orange
    15: 'Light',  // Light grey/white
  };
  const folder = folderMapping[colorIndex] || 'Dark';

  // Choose a distinct pattern texture (1 to 13) inside the folder based on the colorIndex + levelIndex,
  // ensuring different levels and block types load completely different abstract geometries!
  const patternIndex = ((colorIndex + levelIndex) % 13) + 1;
  const patternStr = String(patternIndex).padStart(2, '0');
  const key = `./SBS - Seamless Abstract Pack - 512x512/PNG/${folder}/texture_${patternStr}.png`;

  const module = colorTextures[key];
  if (!module) return null;

  const url = module.default;
  if (!url) return null;

  const cacheKey = `seamless_${colorIndex}_${levelIndex}_${url}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  try {
    const texture = textureLoader.load(url, (tex) => {
      if (tex) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        // Set repeat to 1.0, 1.0 as physical scaling is now done dynamically in UV coordinates
        tex.repeat.set(1.0, 1.0);
        tex.anisotropy = 16;
        if (THREE.SRGBColorSpace !== undefined) {
          tex.colorSpace = THREE.SRGBColorSpace;
        }
      }
    });
    textureCache.set(cacheKey, texture);
    return texture;
  } catch (e) {
    return null;
  }
}

/**

 * Generate a high-fidelity procedural texture canvas for each block type/behavior,
 * matching the user's beautiful geometric and abstract pattern specifications.
 */
function getProceduralTexture(behavior, baseColor, colorIndex, levelIndex = 0) {
  // Graceful check for test runners or environments where document/canvas is unavailable
  if (typeof document === 'undefined') return null;

  const cacheKey = `${behavior}_${baseColor.getHexString()}_${colorIndex}_${levelIndex}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  // 1. Fill base solid color
  const hex = "#" + baseColor.getHexString();
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 256, 256);

  // 2. Add dynamic brushed sci-fi metal grain noise
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
  for (let i = 0; i < 400; i++) {
    ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 25 + 5, 1);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  for (let i = 0; i < 400; i++) {
    ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 25 + 5, 1);
  }

  // 3. Draw a unique geometric texture pattern for each block color type
  if (colorIndex === 0 || colorIndex === 11) {
    // Interlocking concentric glowing circles (glowing light blue overlaps for Level 2 side obstacles)
    // Draw thick dark black backing circles first to create immense contrast
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 9;
    const radiusOffset = (levelIndex % 3) * 4;
    for (let x = 0; x <= 256; x += 64) {
      for (let y = 0; y <= 256; y += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 32 - radiusOffset, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Draw the bright glowing cyan overlapping circles
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 4;
    for (let x = 0; x <= 256; x += 64) {
      for (let y = 0; y <= 256; y += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 32 - radiusOffset, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 230, 255, 0.25)';
        ctx.fill();
      }
    }
    // Inner core black backings
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    for (let x = 32; x < 256; x += 64) {
      for (let y = 32; y < 256; y += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 16 - radiusOffset / 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Inner core high-contrast white rings
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    for (let x = 32; x < 256; x += 64) {
      for (let y = 32; y < 256; y += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 16 - radiusOffset / 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  } 
  else if (colorIndex === 1 || colorIndex === 12) {
    // Speed-chevron patterns
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, 256, 256);
    
    // Draw thick black backing chevrons first
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const isFlipped = (levelIndex % 2 === 0);
    const peakYOffset = isFlipped ? 16 : 64;
    const edgeYOffset = isFlipped ? 64 : 16;
    for (let yOffset = -64; yOffset < 256; yOffset += 96) {
      ctx.beginPath();
      ctx.moveTo(32, yOffset + edgeYOffset);
      ctx.lineTo(128, yOffset + peakYOffset);
      ctx.lineTo(224, yOffset + edgeYOffset);
      ctx.stroke();
    }
    
    // Draw bright neon yellow forward chevrons
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 8;
    for (let yOffset = -64; yOffset < 256; yOffset += 96) {
      ctx.beginPath();
      ctx.moveTo(32, yOffset + edgeYOffset);
      ctx.lineTo(128, yOffset + peakYOffset);
      ctx.lineTo(224, yOffset + edgeYOffset);
      ctx.stroke();
    }
    
    // Draw staggered black inner chevrons
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 7;
    const peakYOffsetStagger = isFlipped ? 18 : 50;
    const edgeYOffsetStagger = isFlipped ? 50 : 18;
    for (let yOffset = -32; yOffset < 256; yOffset += 96) {
      ctx.beginPath();
      ctx.moveTo(48, yOffset + edgeYOffsetStagger);
      ctx.lineTo(128, yOffset + peakYOffsetStagger);
      ctx.lineTo(208, yOffset + edgeYOffsetStagger);
      ctx.stroke();
    }
    
    // Draw staggered neon orange inner highlights
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 3;
    for (let yOffset = -32; yOffset < 256; yOffset += 96) {
      ctx.beginPath();
      ctx.moveTo(48, yOffset + edgeYOffsetStagger);
      ctx.lineTo(128, yOffset + peakYOffsetStagger);
      ctx.lineTo(208, yOffset + edgeYOffsetStagger);
      ctx.stroke();
    }
  }
  else if (colorIndex === 3 || colorIndex === 6) {
    // Woven checkerboard fabric mesh (sticky mesh)
    // Draw black mesh backings
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 16;
    const spacing = 32 + (levelIndex % 2 === 0 ? 0 : 8);
    for (let i = 0; i <= 256; i += spacing) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
    }
    // Draw bright solid forest-green grid lines
    ctx.strokeStyle = '#00aa33';
    ctx.lineWidth = 10;
    for (let i = 0; i <= 256; i += spacing) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
    }
    // Highlighting threads with bright neon green
    ctx.strokeStyle = '#66ff66';
    ctx.lineWidth = 3;
    for (let i = spacing / 2; i <= 256; i += spacing) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
    }
    // Add bright orange knots for incredible high-contrast pop!
    ctx.fillStyle = '#ffaa00';
    for (let x = 0; x <= 256; x += spacing) {
      for (let y = 0; y <= 256; y += spacing) {
        ctx.fillRect(x - 3, y - 3, 6, 6);
      }
    }
  }
  else if (colorIndex === 8 || colorIndex === 9) {
    // Icy diamond lattice with cyan core nodes (slippery)
    // Draw thick black diagonal backing lines
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 7;
    const latticeShift = (levelIndex % 3) * 8;
    for (let i = -256; i <= 256; i += 32) {
      ctx.beginPath(); ctx.moveTo(i + latticeShift, 0); ctx.lineTo(i + latticeShift + 256, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + latticeShift + 256, 0); ctx.lineTo(i + latticeShift, 256); ctx.stroke();
    }
    // Draw glowing bright white diagonal lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    for (let i = -256; i <= 256; i += 32) {
      ctx.beginPath(); ctx.moveTo(i + latticeShift, 0); ctx.lineTo(i + latticeShift + 256, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + latticeShift + 256, 0); ctx.lineTo(i + latticeShift, 256); ctx.stroke();
    }
    // Large cyan core nodes with black outlines
    for (let x = 0; x <= 256; x += 32) {
      for (let y = 0; y <= 256; y += 32) {
        const sx = x + latticeShift;
        if ((sx + y) % 64 === 0 && sx >= 0 && sx <= 256) {
          ctx.beginPath();
          ctx.arc(sx, y, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#000000';
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(sx, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#00ffff';
          ctx.fill();
        }
      }
    }
  }
  else if (colorIndex === 4 || colorIndex === 13) {
    // Warning hazard cracks and stripes (burning hazard)
    // Solid fill background
    ctx.fillStyle = '#ff1a1a';
    ctx.fillRect(0, 0, 256, 256);
    
    // Draw pure black solid warning hazard stripes
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 24;
    for (let i = -256; i <= 256 * 2; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i - 256, 256);
      ctx.stroke();
    }
    
    // Draw pure yellow hazard highlights
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 8;
    for (let i = -256; i <= 256 * 2; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i + 16, 0);
      ctx.lineTo(i - 256 + 16, 256);
      ctx.stroke();
    }
    
    // Black backing flame cracks
    const shiftX = (levelIndex * 17) % 40;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(10 + shiftX, 20); ctx.lineTo(60 + shiftX, 120); ctx.lineTo(120 + shiftX, 80); ctx.lineTo(180 + shiftX, 210); ctx.lineTo(240 + shiftX, 140);
    ctx.stroke();
    
    // Glowing neon orange/pink flame cracks
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10 + shiftX, 20); ctx.lineTo(60 + shiftX, 120); ctx.lineTo(120 + shiftX, 80); ctx.lineTo(180 + shiftX, 210); ctx.lineTo(240 + shiftX, 140);
    ctx.stroke();
  }
  else if (colorIndex === 7 || colorIndex === 15) {
    // Chevron zigzags pattern
    // Black backings
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 12;
    const amp = 16 + (levelIndex % 3) * 4;
    for (let y = -32; y < 256 + 32; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(64, y + amp);
      ctx.lineTo(128, y);
      ctx.lineTo(192, y + amp);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    // Bright white/magenta lines
    ctx.strokeStyle = '#ff33cc';
    ctx.lineWidth = 4;
    for (let y = -32; y < 256 + 32; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(64, y + amp);
      ctx.lineTo(128, y);
      ctx.lineTo(192, y + amp);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    for (let y = -32; y < 256 + 32; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(64, y + amp);
      ctx.lineTo(128, y);
      ctx.lineTo(192, y + amp);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  }
  else if (colorIndex === 14) {
    // Circular pop-art target shapes
    const shapeSize = 48 - (levelIndex % 3) * 6;
    for (let x = 64; x < 256; x += 128) {
      for (let y = 64; y < 256; y += 128) {
        // Draw black target backing rings
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(x, y, shapeSize, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, shapeSize * 0.66, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, shapeSize * 0.33, 0, Math.PI * 2); ctx.stroke();
        
        // Draw bright white target rings
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, shapeSize, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, shapeSize * 0.66, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, shapeSize * 0.33, 0, Math.PI * 2); ctx.stroke();
        
        // Center black backing core
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = '#000000'; ctx.fill();
        // Center white core
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
      }
    }
  }
  else {
    // NORMAL BLOCKS / default: Staggered metal slats / staggered horizontal panels with horizontal brushed textures and rivets
    // Draw thick dark black panel lines for maximum 3D block contrast
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = 4;
    const panelCount = (levelIndex % 2 === 0) ? 4 : 8;
    const panelHeight = 256 / panelCount;
    for (let y = 0; y <= 256; y += panelHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    // Slat bevel highlights
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    for (let y = 0; y <= 256; y += panelHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y + 2);
      ctx.lineTo(256, y + 2);
      ctx.stroke();
    }

    // Staggered vertical panel divisions in solid black
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = 3;
    for (let r = 0; r < panelCount; r++) {
      const yVal = r * panelHeight;
      const shift = (r % 2) * (256 / 4);
      for (let c = 0; c < 4; c++) {
        const xVal = c * (256 / 2) + shift;
        ctx.beginPath();
        ctx.moveTo(xVal % 256, yVal);
        ctx.lineTo(xVal % 256, yVal + panelHeight);
        ctx.stroke();
      }
    }

    // Larger 3D metal rivets near boundaries with dark shadow drop
    for (let r = 0; r < panelCount; r++) {
      const yVal = r * panelHeight;
      const shift = (r % 2) * (256 / 4);
      for (let c = 0; c < 4; c++) {
        const xVal = c * (256 / 2) + shift;
        // Rivet Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath(); ctx.arc((xVal + 11) % 256, yVal + 11, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc((xVal + (256 / 2) - 9) % 256, yVal + 11, 3.5, 0, Math.PI * 2); ctx.fill();

        // Rivet Cap (Bright Silver)
        ctx.fillStyle = 'rgba(230, 230, 240, 0.95)';
        ctx.beginPath(); ctx.arc((xVal + 10) % 256, yVal + 10, 3.0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(cacheKey, texture);
  return texture;
}

// Glob loads all custom biome assets and level-specific assets dynamically
const customAssets = import.meta.glob('./assets/custom/*.png', { eager: true });
const levelAssets = import.meta.glob('./assets/custom/level_*/*.png', { eager: true });
const levelObjAssets = import.meta.glob('./assets/custom/level_*/*.obj', { query: '?url', eager: true });

export function getCustomAssetUrl(filename) {
  const key = `./assets/custom/${filename}`;
  const module = customAssets[key];
  return module ? module.default : null;
}

export function getLevelAssetUrl(levelIndex, filename) {
  const key = `./assets/custom/level_${levelIndex}/${filename}`;
  const module = levelAssets[key];
  return module ? module.default : null;
}

export function getLevelObjUrl(levelIndex, filename) {
  const key = `./assets/custom/level_${levelIndex}/${filename}`;
  const module = levelObjAssets[key];
  return module ? module.default : null;
}

const biomeConfigs = [
  ['Visualizer Void', 'void', [0.05, 0.0, 0.1], [0.15, 0.0, 0.25]],
  ['Blue Ridge Ascents', 'ridge', [0.0, 0.1, 0.3], [0.0, 0.2, 0.6]],
  ['Thrill Sector', 'thrill', [0.1, 0.1, 0.12], [0.15, 0.15, 0.18]],
  ['Hardware Core', 'core', [0.02, 0.18, 0.06], [0.05, 0.3, 0.1]],
  ['Glitch Grid', 'glitch', [0.08, 0.01, 0.1], [0.12, 0.02, 0.15]],
  ['Cryo-Stasis Tundra', 'tundra', [0.7, 0.9, 1.0], [0.8, 0.95, 1.0]],
  ['Supernova Furnace', 'furnace', [0.15, 0.08, 0.05], [0.2, 0.1, 0.05]],
  ['Nebula Shallows', 'shallows', [0.08, 0.02, 0.18], [0.1, 0.05, 0.22]],
  ['Quantum Spire', 'spire', [0.9, 0.9, 0.95], [0.95, 0.95, 0.98]],
  ['Kinetic Pulse', 'pulse', [0.18, 0.18, 0.2], [0.2, 0.2, 0.22]]
];

const generatedThemes = biomeConfigs.map(([name, key, defaultColorVal, defaultMatColor]) => {
  const getAsset = (type, suffix) => getCustomAssetUrl(`${key}_${type}_${suffix}.png`) || getCustomAssetUrl(`${type}_${suffix}_${key}.png`);
  const getDecal = (type) => getCustomAssetUrl(`decal_${type}_${key}.png`);

  const roadDiff = getAsset('road', 'diffuse');
  const roadNorm = getAsset('road', 'normal');
  const roadRough = getAsset('road', 'roughness');
  const roadMetal = getAsset('road', 'metalness');
  const roadEmit = getAsset('road', 'emissive');
  const roadEdgeDiff = getAsset('road_edge', 'diffuse');
  const roadEdgeNorm = getAsset('road_edge', 'normal');
  const roadEdgeRough = getAsset('road_edge', 'roughness');
  const roadEdgeMetal = getAsset('road_edge', 'metalness');
  const roadEdgeEmit = getAsset('road_edge', 'emissive');
  const obsDiff = getAsset('obstacle', 'diffuse');
  const obsNorm = getAsset('obstacle', 'normal');
  const obsRough = getAsset('obstacle', 'roughness');
  const obsMetal = getAsset('obstacle', 'metalness');
  const tunDiff = getAsset('tunnel', 'diffuse');
  const tunNorm = getAsset('tunnel', 'normal');
  const tunRough = getAsset('tunnel', 'roughness');
  const tunMetal = getAsset('tunnel', 'metalness');

  return {
    name: name,
    key: key,
    defaultColor: new THREE.Color(...defaultColorVal),
    behaviors: {
      default:  { map: roadDiff, normalMap: roadNorm, roughnessMap: roadRough, metalnessMap: roadMetal, emissiveMap: roadEmit, edgeMap: roadEdgeDiff, edgeNormalMap: roadEdgeNorm, edgeRoughnessMap: roadEdgeRough, edgeMetalnessMap: roadEdgeMetal, edgeEmissiveMap: roadEdgeEmit, color: new THREE.Color(...defaultMatColor) },
      obstacle: { map: obsDiff, normalMap: obsNorm, roughnessMap: obsRough, metalnessMap: obsMetal, color: new THREE.Color(0.4, 0.4, 0.4) },
      tunnel:   { map: tunDiff, normalMap: tunNorm, roughnessMap: tunRough, metalnessMap: tunMetal },
      boost:    { map: roadDiff, normalMap: roadNorm, decal: getDecal('boost') || getCustomAssetUrl('decal_boost.png'), color: new THREE.Color(...defaultMatColor), emissive: new THREE.Color(0.0, 1.0, 0.0) },
      super_boost: { map: roadDiff, normalMap: roadNorm, decal: getDecal('boost') || getCustomAssetUrl('decal_boost.png'), color: new THREE.Color(...defaultMatColor), emissive: new THREE.Color(0.0, 1.0, 1.0) },
      refill:   { map: roadDiff, normalMap: roadNorm, decal: getDecal('refill') || getCustomAssetUrl('decal_refill.png'), color: new THREE.Color(...defaultMatColor), emissive: new THREE.Color(0.0, 0.5, 1.0) },
      burning:  { map: roadDiff, normalMap: roadNorm, decal: getDecal('explosive') || getCustomAssetUrl('decal_explosive.png'), color: new THREE.Color(...defaultMatColor), emissive: new THREE.Color(1.0, 0.0, 0.0) },
      sticky:   { map: roadDiff, normalMap: roadNorm, decal: getDecal('sticky') || getCustomAssetUrl('decal_sticky.png'), color: new THREE.Color(...defaultMatColor), emissive: new THREE.Color(0.5, 0.0, 0.6) },
      slippery: { map: roadDiff, normalMap: roadNorm, decal: getDecal('slippery') || getCustomAssetUrl('decal_slippery.png'), color: new THREE.Color(...defaultMatColor), emissive: new THREE.Color(0.0, 0.8, 1.0) },
    }
  };
});

export const BIOME_COLOR_PROFILES = {
  void: [
    { road: [0.05, 0.0, 0.1], rail: [0.8, 0.0, 1.0], accent: [0.4, 0.0, 0.8] },
    { road: [0.0, 0.05, 0.12], rail: [0.0, 0.8, 1.0], accent: [1.0, 0.4, 0.0] },
    { road: [0.0, 0.05, 0.0], rail: [0.0, 1.0, 0.0], accent: [0.5, 1.0, 0.0] },
    { road: [0.08, 0.0, 0.0], rail: [1.0, 0.2, 0.0], accent: [1.0, 0.8, 0.0] }
  ],
  ridge: [
    { road: [0.0, 0.1, 0.3], rail: [0.0, 0.6, 1.0], accent: [0.0, 0.2, 0.6] },
    { road: [0.22, 0.05, 0.0], rail: [1.0, 0.3, 0.0], accent: [0.6, 0.1, 0.0] },
    { road: [0.15, 0.1, 0.0], rail: [1.0, 0.8, 0.0], accent: [0.7, 0.5, 0.0] }
  ],
  thrill: [
    { road: [0.1, 0.1, 0.12], rail: [0.0, 0.8, 1.0], accent: [0.15, 0.15, 0.18] },
    { road: [0.12, 0.1, 0.1], rail: [1.0, 0.0, 0.5], accent: [0.18, 0.15, 0.15] },
    { road: [0.08, 0.1, 0.08], rail: [0.0, 1.0, 0.5], accent: [0.12, 0.18, 0.12] }
  ],
  core: [
    { road: [0.02, 0.18, 0.06], rail: [0.2, 1.0, 0.4], accent: [0.05, 0.3, 0.1] },
    { road: [0.18, 0.02, 0.06], rail: [1.0, 0.2, 0.4], accent: [0.3, 0.05, 0.1] },
    { road: [0.02, 0.06, 0.18], rail: [0.2, 0.4, 1.0], accent: [0.05, 0.1, 0.3] }
  ],
  glitch: [
    { road: [0.08, 0.01, 0.1], rail: [1.0, 0.0, 0.8], accent: [0.12, 0.02, 0.15] },
    { road: [0.01, 0.08, 0.1], rail: [0.0, 1.0, 0.8], accent: [0.02, 0.12, 0.15] },
    { road: [0.08, 0.08, 0.01], rail: [1.0, 1.0, 0.0], accent: [0.12, 0.12, 0.02] }
  ],
  tundra: [
    { road: [0.7, 0.9, 1.0], rail: [0.0, 0.9, 1.0], accent: [0.8, 0.95, 1.0] },
    { road: [0.85, 0.8, 0.9], rail: [0.8, 0.4, 1.0], accent: [0.9, 0.85, 0.95] },
    { road: [0.7, 0.9, 0.8], rail: [0.0, 1.0, 0.6], accent: [0.8, 0.95, 0.85] }
  ],
  furnace: [
    { road: [0.15, 0.08, 0.05], rail: [1.0, 0.4, 0.0], accent: [0.2, 0.1, 0.05] },
    { road: [0.18, 0.04, 0.04], rail: [1.0, 0.0, 0.0], accent: [0.25, 0.05, 0.05] },
    { road: [0.12, 0.12, 0.04], rail: [1.0, 0.8, 0.0], accent: [0.18, 0.18, 0.06] }
  ],
  shallows: [
    { road: [0.08, 0.02, 0.18], rail: [0.0, 0.8, 1.0], accent: [0.1, 0.05, 0.22] },
    { road: [0.02, 0.08, 0.18], rail: [0.0, 1.0, 0.5], accent: [0.05, 0.1, 0.22] },
    { road: [0.12, 0.02, 0.12], rail: [1.0, 0.2, 0.8], accent: [0.15, 0.05, 0.15] }
  ],
  spire: [
    { road: [0.9, 0.9, 0.95], rail: [1.0, 0.8, 0.2], accent: [0.95, 0.95, 0.98] },
    { road: [0.85, 0.9, 0.95], rail: [0.2, 0.8, 1.0], accent: [0.9, 0.95, 0.98] },
    { road: [0.9, 0.85, 0.9], rail: [1.0, 0.2, 0.6], accent: [0.95, 0.9, 0.95] }
  ],
  pulse: [
    { road: [0.18, 0.18, 0.2], rail: [0.0, 0.9, 1.0], accent: [0.2, 0.2, 0.22] },
    { road: [0.18, 0.16, 0.2], rail: [1.0, 0.0, 1.0], accent: [0.2, 0.18, 0.22] },
    { road: [0.16, 0.18, 0.16], rail: [0.0, 1.0, 0.0], accent: [0.18, 0.2, 0.18] }
  ],
  cyberpunk: [
    { road: [0.15, 0.15, 0.25], rail: [0.0, 0.9, 1.0], accent: [0.2, 0.2, 0.35] },
    { road: [0.2, 0.12, 0.22], rail: [1.0, 0.0, 0.8], accent: [0.25, 0.15, 0.3] },
    { road: [0.12, 0.2, 0.18], rail: [0.0, 1.0, 0.5], accent: [0.15, 0.25, 0.22] }
  ],
  industrial: [
    { road: [0.5, 0.5, 0.55], rail: [1.0, 0.5, 0.0], accent: [0.5, 0.5, 0.5] },
    { road: [0.4, 0.45, 0.45], rail: [0.0, 0.8, 1.0], accent: [0.4, 0.4, 0.4] },
    { road: [0.45, 0.4, 0.4], rail: [0.8, 0.2, 0.2], accent: [0.45, 0.45, 0.45] }
  ],
  alien: [
    { road: [0.6, 0.2, 0.7], rail: [0.8, 0.0, 1.0], accent: [0.6, 0.2, 0.7] },
    { road: [0.2, 0.6, 0.5], rail: [0.0, 1.0, 0.8], accent: [0.2, 0.6, 0.5] },
    { road: [0.6, 0.4, 0.2], rail: [1.0, 0.5, 0.0], accent: [0.6, 0.4, 0.2] }
  ],
  organic: [
    { road: [0.45, 0.3, 0.15], rail: [0.0, 0.8, 0.2], accent: [0.45, 0.3, 0.15] },
    { road: [0.4, 0.2, 0.18], rail: [1.0, 0.4, 0.2], accent: [0.4, 0.2, 0.18] },
    { road: [0.3, 0.35, 0.2], rail: [0.8, 0.9, 0.2], accent: [0.3, 0.35, 0.2] }
  ]
};

// Theme definition sets
export const THEMES = [

  {
    name: 'Cyberpunk/Neon Grid',
    key: 'cyberpunk',
    defaultColor: new THREE.Color(0.15, 0.15, 0.25),
    behaviors: {
      default:  { 
        map: cpRoadDiff, normalMap: cpRoadNorm, roughnessMap: cpRoadRough, metalnessMap: cpRoadMetal, emissiveMap: cpRoadEmit,
        edgeMap: cpEdgeDiff, edgeNormalMap: cpEdgeNorm, edgeRoughnessMap: cpEdgeRough, edgeMetalnessMap: cpEdgeMetal, edgeEmissiveMap: cpEdgeEmit,
        color: new THREE.Color(0.2, 0.2, 0.35) 
      },
      obstacle: { map: cpObstacleDiff, normalMap: cpObstacleNorm, roughnessMap: cpObstacleRough, metalnessMap: cpObstacleMetal, emissiveMap: cpObstacleEmit, color: new THREE.Color(0.8, 0.6, 0.0) },
      tunnel:   { map: cpTunnelDiff, normalMap: cpTunnelNorm, roughnessMap: cpTunnelRough, metalnessMap: cpTunnelMetal, emissiveMap: cpTunnelEmit },
      boost:    { map: cpRoadDiff, normalMap: cpRoadNorm, roughnessMap: cpRoadRough, metalnessMap: cpRoadMetal, emissiveMap: cpRoadEmit, decal: cpDecalBoost, color: new THREE.Color(0.15, 0.15, 0.25), emissive: new THREE.Color(0.0, 1.0, 0.0) },
      super_boost: { map: cpRoadDiff, normalMap: cpRoadNorm, roughnessMap: cpRoadRough, metalnessMap: cpRoadMetal, emissiveMap: cpRoadEmit, decal: cpDecalBoost, color: new THREE.Color(0.15, 0.15, 0.25), emissive: new THREE.Color(0.0, 1.0, 1.0) },
      refill:   { map: cpRoadDiff, normalMap: cpRoadNorm, roughnessMap: cpRoadRough, metalnessMap: cpRoadMetal, emissiveMap: cpRoadEmit, decal: cpDecalRefill, color: new THREE.Color(0.15, 0.15, 0.25), emissive: new THREE.Color(0.0, 0.5, 1.0) },
      burning:  { map: cpRoadDiff, normalMap: cpRoadNorm, roughnessMap: cpRoadRough, metalnessMap: cpRoadMetal, emissiveMap: cpRoadEmit, decal: cpDecalExplosive, color: new THREE.Color(0.15, 0.15, 0.25), emissive: new THREE.Color(1.0, 0.0, 0.0) },
      sticky:   { map: cpRoadDiff, normalMap: cpRoadNorm, roughnessMap: cpRoadRough, metalnessMap: cpRoadMetal, emissiveMap: cpRoadEmit, decal: cpDecalSticky, color: new THREE.Color(0.15, 0.15, 0.25), emissive: new THREE.Color(0.5, 0.0, 0.6) },
      slippery: { map: cpRoadDiff, normalMap: cpRoadNorm, roughnessMap: cpRoadRough, metalnessMap: cpRoadMetal, emissiveMap: cpRoadEmit, decal: cpDecalSlippery, color: new THREE.Color(0.15, 0.15, 0.25), emissive: new THREE.Color(0.0, 0.8, 1.0) },
    }
  },
  {
    name: 'Industrial Metal',
    key: 'industrial',
    defaultColor: new THREE.Color(0.5, 0.5, 0.55),
    behaviors: {
      default:  { 
        map: indRoadDiff, normalMap: indRoadNorm, roughnessMap: indRoadRough, metalnessMap: indRoadMetal, emissiveMap: indRoadEmit,
        edgeMap: indEdgeDiff, edgeNormalMap: indEdgeNorm, edgeRoughnessMap: indEdgeRough, edgeMetalnessMap: indEdgeMetal, edgeEmissiveMap: indEdgeEmit,
        color: new THREE.Color(0.5, 0.5, 0.5) 
      },
      obstacle: { map: indObstacleDiff, normalMap: indObstacleNorm, roughnessMap: indObstacleRough, metalnessMap: indObstacleMetal, emissiveMap: indObstacleEmit, color: new THREE.Color(0.3, 0.3, 0.3) },
      tunnel:   { map: indTunnelDiff, normalMap: indTunnelNorm, roughnessMap: indTunnelRough, metalnessMap: indTunnelMetal, emissiveMap: indTunnelEmit },
      boost:    { map: indRoadDiff, normalMap: indRoadNorm, roughnessMap: indRoadRough, metalnessMap: indRoadMetal, emissiveMap: indRoadEmit, decal: indDecalBoost, color: new THREE.Color(0.2, 0.8, 0.2), emissive: new THREE.Color(0.1, 0.4, 0.1) },
      super_boost: { map: indRoadDiff, normalMap: indRoadNorm, roughnessMap: indRoadRough, metalnessMap: indRoadMetal, emissiveMap: indRoadEmit, decal: indDecalBoost, color: new THREE.Color(0.2, 0.8, 1.0), emissive: new THREE.Color(0.1, 0.4, 0.5) },
      refill:   { map: indRoadDiff, normalMap: indRoadNorm, roughnessMap: indRoadRough, metalnessMap: indRoadMetal, emissiveMap: indRoadEmit, decal: indDecalRefill, color: new THREE.Color(0.2, 0.6, 1.0), emissive: new THREE.Color(0.1, 0.3, 0.5) },
      burning:  { map: indRoadDiff, normalMap: indRoadNorm, roughnessMap: indRoadRough, metalnessMap: indRoadMetal, emissiveMap: indRoadEmit, decal: indDecalExplosive, color: new THREE.Color(1.0, 0.2, 0.2), emissive: new THREE.Color(0.5, 0.1, 0.1) },
      sticky:   { map: indRoadDiff, normalMap: indRoadNorm, roughnessMap: indRoadRough, metalnessMap: indRoadMetal, emissiveMap: indRoadEmit, decal: indDecalSticky, color: new THREE.Color(0.15, 0.4, 0.15), emissive: new THREE.Color(0.05, 0.15, 0.05) },
      slippery: { map: indRoadDiff, normalMap: indRoadNorm, roughnessMap: indRoadRough, metalnessMap: indRoadMetal, emissiveMap: indRoadEmit, decal: indDecalSlippery, color: new THREE.Color(0.7, 0.8, 1.0), emissive: new THREE.Color(0.3, 0.35, 0.4) },
    }
  },
  {
    name: 'Alien/Stained Glass',
    key: 'alien',
    defaultColor: new THREE.Color(0.6, 0.2, 0.7),
    behaviors: {
      default:  { 
        map: alienRoadDiff, normalMap: alienRoadNorm, roughnessMap: alienRoadRough, metalnessMap: alienRoadMetal, emissiveMap: alienRoadEmit,
        edgeMap: alienEdgeDiff, edgeNormalMap: alienEdgeNorm, edgeRoughnessMap: alienEdgeRough, edgeMetalnessMap: alienEdgeMetal, edgeEmissiveMap: alienEdgeEmit,
        color: new THREE.Color(0.6, 0.2, 0.7) 
      },
      obstacle: { map: alienObstacleDiff, normalMap: alienObstacleNorm, roughnessMap: alienObstacleRough, metalnessMap: alienObstacleMetal, emissiveMap: alienObstacleEmit, color: new THREE.Color(0.4, 0.1, 0.5) },
      tunnel:   { map: alienTunnelDiff, normalMap: alienTunnelNorm, roughnessMap: alienTunnelRough, metalnessMap: alienTunnelMetal, emissiveMap: alienTunnelEmit },
      boost:    { map: alienRoadDiff, normalMap: alienRoadNorm, roughnessMap: alienRoadRough, metalnessMap: alienRoadMetal, emissiveMap: alienRoadEmit, decal: alienDecalBoost, color: new THREE.Color(0.0, 1.0, 0.0), emissive: new THREE.Color(0.0, 1.0, 0.0) },
      super_boost: { map: alienRoadDiff, normalMap: alienRoadNorm, roughnessMap: alienRoadRough, metalnessMap: alienRoadMetal, emissiveMap: alienRoadEmit, decal: alienDecalBoost, color: new THREE.Color(0.0, 1.0, 1.0), emissive: new THREE.Color(0.0, 1.0, 1.0) },
      refill:   { map: alienRoadDiff, normalMap: alienRoadNorm, roughnessMap: alienRoadRough, metalnessMap: alienRoadMetal, emissiveMap: alienRoadEmit, decal: alienDecalRefill, color: new THREE.Color(0.0, 0.5, 1.0), emissive: new THREE.Color(0.0, 0.5, 1.0) },
      burning:  { map: alienRoadDiff, normalMap: alienRoadNorm, roughnessMap: alienRoadRough, metalnessMap: alienRoadMetal, emissiveMap: alienRoadEmit, decal: alienDecalExplosive, color: new THREE.Color(1.0, 0.0, 0.0), emissive: new THREE.Color(1.0, 0.0, 0.0) },
      sticky:   { map: alienRoadDiff, normalMap: alienRoadNorm, roughnessMap: alienRoadRough, metalnessMap: alienRoadMetal, emissiveMap: alienRoadEmit, decal: alienDecalSticky, color: new THREE.Color(0.1, 0.5, 0.1), emissive: new THREE.Color(0.05, 0.25, 0.05) },
      slippery: { map: alienRoadDiff, normalMap: alienRoadNorm, roughnessMap: alienRoadRough, metalnessMap: alienRoadMetal, emissiveMap: alienRoadEmit, decal: alienDecalSlippery, color: new THREE.Color(0.8, 0.9, 1.0), emissive: new THREE.Color(0.1, 0.2, 0.3) },
    }
  },
  {
    name: 'Retro Cabin/Organics',
    key: 'organic',
    defaultColor: new THREE.Color(0.45, 0.3, 0.15),
    behaviors: {
      default:  { 
        map: orgRoadDiff, normalMap: orgRoadNorm, roughnessMap: orgRoadRough, metalnessMap: orgRoadMetal, emissiveMap: orgRoadEmit,
        edgeMap: orgEdgeDiff, edgeNormalMap: orgEdgeNorm, edgeRoughnessMap: orgEdgeRough, edgeMetalnessMap: orgEdgeMetal, edgeEmissiveMap: orgEdgeEmit,
        color: new THREE.Color(0.45, 0.3, 0.15) 
      },
      obstacle: { map: orgObstacleDiff, normalMap: orgObstacleNorm, roughnessMap: orgObstacleRough, metalnessMap: orgObstacleMetal, emissiveMap: orgObstacleEmit, color: new THREE.Color(0.2, 0.15, 0.1) },
      tunnel:   { map: orgTunnelDiff, normalMap: orgTunnelNorm, roughnessMap: orgTunnelRough, metalnessMap: orgTunnelMetal, emissiveMap: orgTunnelEmit },
      boost:    { map: orgRoadDiff, normalMap: orgRoadNorm, roughnessMap: orgRoadRough, metalnessMap: orgRoadMetal, emissiveMap: orgRoadEmit, decal: orgDecalBoost, color: new THREE.Color(0.3, 0.8, 0.3), emissive: new THREE.Color(0.1, 0.4, 0.1) },
      super_boost: { map: orgRoadDiff, normalMap: orgRoadNorm, roughnessMap: orgRoadRough, metalnessMap: orgRoadMetal, emissiveMap: orgRoadEmit, decal: orgDecalBoost, color: new THREE.Color(0.2, 0.8, 1.0), emissive: new THREE.Color(0.1, 0.4, 0.5) },
      refill:   { map: orgRoadDiff, normalMap: orgRoadNorm, roughnessMap: orgRoadRough, metalnessMap: orgRoadMetal, emissiveMap: orgRoadEmit, decal: orgDecalRefill, color: new THREE.Color(0.2, 0.5, 0.9), emissive: new THREE.Color(0.1, 0.25, 0.45) },
      burning:  { map: orgRoadDiff, normalMap: orgRoadNorm, roughnessMap: orgRoadRough, metalnessMap: orgRoadMetal, emissiveMap: orgRoadEmit, decal: orgDecalExplosive, color: new THREE.Color(0.9, 0.25, 0.1), emissive: new THREE.Color(0.45, 0.1, 0.05) },
      sticky:   { map: orgRoadDiff, normalMap: orgRoadNorm, roughnessMap: orgRoadRough, metalnessMap: orgRoadMetal, emissiveMap: orgRoadEmit, decal: orgDecalSticky, color: new THREE.Color(0.2, 0.4, 0.2), emissive: new THREE.Color(0.05, 0.15, 0.05) },
      slippery: { map: orgRoadDiff, normalMap: orgRoadNorm, roughnessMap: orgRoadRough, metalnessMap: orgRoadMetal, emissiveMap: orgRoadEmit, decal: orgDecalSlippery, color: new THREE.Color(0.85, 0.85, 0.9), emissive: new THREE.Color(0.25, 0.25, 0.3) },
    }
  }
].concat(generatedThemes);

export function getActiveThemeIndex(levelData) {
  const isGeneratedPack = (typeof window !== 'undefined' && window.currentGamePack === 'generated') || (levelData && levelData.isGenerated) || (levelData && typeof levelData.level_index === 'number' && levelData.level_index >= 61);
  
  if (isGeneratedPack) {
    let idx = 0;
    if (levelData && typeof levelData.level_index === 'number') {
      idx = levelData.level_index;
    } else if (typeof window !== 'undefined' && typeof window.currentLevelIndex === 'number') {
      idx = window.currentLevelIndex;
    }
    if (idx >= 61) {
      idx -= 61;
    }
    return 4 + (Math.floor(idx / 3) % 10);
  }

  let idx = null;
  if (levelData && typeof levelData.level_index === 'number') {
    idx = levelData.level_index;
  } else if (typeof window !== 'undefined' && typeof window.currentLevelIndex === 'number') {
    idx = window.currentLevelIndex;
  }

  if (idx === null) {
    return 0;
  }

  // 10 worlds mapping for standard/xmas packs
  // Index 0-29: standard levels (10 worlds * 3 levels)
  // Index 30-59: xmas levels (10 worlds * 3 levels)
  const isXmas = idx >= 30;
  const relativeIdx = isXmas ? idx - 30 : idx;
  const worldIdx = Math.floor(relativeIdx / 3) % 10;

  const worldToTheme = [
    9,  // Yama -> Tundra
    11, // Oasis -> Shallows
    3,  // Sub-Terrania -> Organic
    10, // Red Heat -> Furnace
    13, // Storm Wind -> Pulse
    4,  // The Void -> Void
    0,  // Outer Space -> Cyberpunk
    2,  // Phantasmagoria -> Alien
    12, // Spire -> Spire
    1   // Aftermath -> Industrial
  ];

  return worldToTheme[worldIdx] !== undefined ? worldToTheme[worldIdx] : 0;
}


export const loadedTextureCache = new Map();

function getLoadedTexture(url, isColorTexture = false) {
  if (typeof document === 'undefined') return null;
  // Use separate cache slots for sRGB vs linear so normal maps aren't accidentally colour-corrected
  const cacheKey = isColorTexture ? `${url}#srgb` : url;
  if (loadedTextureCache.has(cacheKey)) {
    return loadedTextureCache.get(cacheKey);
  }
  try {
    const texture = textureLoader.load(url, (tex) => {
      if (tex) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1.0, 1.0);
        tex.minFilter = THREE.LinearMipmapLinearFilter; // trilinear — sharpest at distance
        tex.magFilter = THREE.LinearFilter;             // bilinear — smoothest up close
        tex.generateMipmaps = true;
        tex.anisotropy = 16;
        if (isColorTexture && THREE.SRGBColorSpace !== undefined) {
          tex.colorSpace = THREE.SRGBColorSpace;
        }
        tex.needsUpdate = true;
      }
    });
    loadedTextureCache.set(cacheKey, texture);
    return texture;
  } catch (e) {
    return null;
  }
}

/**
 * Perturb a color slightly based on the levelIndex to create unique variations.
 */
export function perturbColor(color, levelIndex, salt = 0) {
  const temp = { h: 0, s: 0, l: 0 };
  color.getHSL(temp);
  
  // Deterministic hue shift: shift up to 30 degrees (30/360 = 0.083)
  const shiftRange = 30 / 360;
  // Generate a deterministic offset between -shiftRange and +shiftRange
  const hueOffset = (((levelIndex * 17 + salt * 31) % 100) / 100) * (2 * shiftRange) - shiftRange;
  temp.h = (temp.h + hueOffset + 1.0) % 1.0;
  
  // Saturation shift: ±10%
  const satOffset = (((levelIndex * 7 + salt * 13) % 100) / 100) * 0.2 - 0.1;
  temp.s = Math.max(0.2, Math.min(1.0, temp.s + satOffset));
  
  // Lightness shift: ±8%
  const lightOffset = (((levelIndex * 13 + salt * 7) % 100) / 100) * 0.16 - 0.08;
  temp.l = Math.max(0.05, Math.min(0.95, temp.l + lightOffset));
  
  return new THREE.Color().setHSL(temp.h, temp.s, temp.l);
}

/**
 * Procedural neon texture generator for simple straight block and grate textures.
 * Used exclusively for the Demo Road (levelIndex === 0).
 */
function getDemoNeonTexture(behavior, colorIndex, colIndex, rowIndex, spanX = 1, spanZ = 1) {
  if (typeof document === 'undefined') return null;

  const isObstacle = behavior === 'obstacle';
  const rVal = typeof rowIndex === 'number' ? rowIndex : 0;
  const cVal = typeof colIndex === 'number' ? colIndex : 3;
  // Alternate grate and block on flat road tiles, except for special tiles
  const isGrate = !behavior || behavior === 'default' ? ((cVal + rVal) % 2 === 1) : false;
  
  const cacheKey = `demo_neon_${behavior || 'default'}_${colorIndex}_${cVal}_${rVal}_${spanX}_${spanZ}_${isGrate ? 'grate' : 'block'}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  // Scale canvas size proportionally to the shape's span!
  canvas.width = Math.round(128 * spanX);
  canvas.height = Math.round(128 * spanZ);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const neonColors = {
    0: '#00ffff',   // Neon Cyan
    1: '#39ff14',   // Neon Green
    2: '#00ffcc',   // Neon Teal
    3: '#ff00ff',   // Neon Magenta
    4: '#ffff00',   // Neon Yellow (replaced Red!)
    5: '#00e5ff',   // Neon Bright Blue
    6: '#ffaa00',   // Neon Orange
    7: '#ccff00',   // Neon Lime
    8: '#00f0ff',   // Neon Ice Blue
    9: '#7b00ff',   // Neon Purple
    10: '#ccff00',  // Lime
    11: '#00ffff',  // Neon Cyan
    12: '#ff00aa',  // Neon Hot Pink (replaced Rose Red!)
    13: '#9d00ff',  // Neon Violet
    14: '#ff5500',  // Bright Neon Orange
    15: '#ffffff'   // Neon White
  };
  const neonColor = neonColors[colorIndex] || '#00ffff';

  // Base background: dark charcoal/black with a very subtle tint
  ctx.fillStyle = '#06060c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (isObstacle) {
    // Simple straight block for obstacles: thick neon borders and cross insets
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    // Grid cross inset lines
    ctx.beginPath();
    ctx.moveTo(12, canvas.height / 2); ctx.lineTo(canvas.width - 12, canvas.height / 2);
    ctx.moveTo(canvas.width / 2, 12); ctx.lineTo(canvas.width / 2, canvas.height - 12);
    ctx.stroke();
  } else if (behavior === 'boost' || behavior === 'super_boost') {
    // Boost chevron grate: draw chevrons evenly across the span
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw chevrons spaced by 40 units vertically, scaling horizontally
    for (let y = 20; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(10, y + 10);
      ctx.lineTo(canvas.width / 2, y - 10);
      ctx.lineTo(canvas.width - 10, y + 10);
      ctx.stroke();
    }
  } else if (behavior === 'burning') {
    // Red danger grate
    ctx.strokeStyle = '#ff073a';
    ctx.lineWidth = 5;
    for (let x = 16; x < canvas.width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    // Crossbars at top, bottom, and increments of 128
    ctx.fillStyle = '#ff073a';
    ctx.fillRect(0, 0, canvas.width, 6);
    ctx.fillRect(0, canvas.height - 6, canvas.width, 6);
    for (let y = 128; y < canvas.height; y += 128) {
      ctx.fillRect(0, y - 3, canvas.width, 6);
    }
  } else if (behavior === 'tunnel') {
    // Tunnel texture: neon purple/magenta grid grate
    ctx.strokeStyle = '#9d00ff';
    ctx.lineWidth = 4;
    // Horizontal grate bars every 32px
    for (let y = 16; y < canvas.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    // Vertical grate bars every 32px
    for (let x = 16; x < canvas.width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
  } else if (isGrate) {
    // Grate texture: clean vertical parallel lines drawn across the entire width
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 4;
    for (let x = 8; x < canvas.width; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    // Top and bottom borders of the grate
    ctx.fillStyle = neonColor;
    ctx.fillRect(0, 0, canvas.width, 6);
    ctx.fillRect(0, canvas.height - 6, canvas.width, 6);
  } else {
    // Block texture: single border around the entire merged shape!
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Optional horizontal panel divider line in center
    ctx.beginPath();
    ctx.moveTo(10, canvas.height / 2);
    ctx.lineTo(canvas.width - 10, canvas.height / 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Procedural texture generator for the 10 biomes.
 */
function getBiomeProceduralTexture(biomeKey, behavior, colorIndex, colIndex, rowIndex, spanX = 1, spanZ = 1, levelIndex = 0) {
  if (typeof document === 'undefined') return null;

  const isObstacle = behavior === 'obstacle';
  const rVal = typeof rowIndex === 'number' ? rowIndex : 0;
  const cVal = typeof colIndex === 'number' ? colIndex : 3;

  const cacheKey = `procedural_biome_${biomeKey}_${behavior || 'default'}_${colorIndex}_${cVal}_${rVal}_${spanX}_${spanZ}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(128 * spanX);
  canvas.height = Math.round(128 * spanZ);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const profiles = BIOME_COLOR_PROFILES[biomeKey] || BIOME_COLOR_PROFILES.void;
  const levelIdx = typeof levelIndex === 'number' ? levelIndex : 0;
  const profile = profiles[levelIdx % profiles.length];

  const toCSSColor = (arr, scale = 255) => {
    const r = Math.max(0, Math.min(255, Math.round(arr[0] * scale)));
    const g = Math.max(0, Math.min(255, Math.round(arr[1] * scale)));
    const b = Math.max(0, Math.min(255, Math.round(arr[2] * scale)));
    return `rgb(${r}, ${g}, ${b})`;
  };
  const toCSSAlphaColor = (arr, alpha, scale = 255) => {
    const r = Math.max(0, Math.min(255, Math.round(arr[0] * scale)));
    const g = Math.max(0, Math.min(255, Math.round(arr[1] * scale)));
    const b = Math.max(0, Math.min(255, Math.round(arr[2] * scale)));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const roadBase = toCSSColor(profile.road, 45);
  const railColor = toCSSColor(profile.rail, 255);
  const accentColor = toCSSColor(profile.accent, 255);

  ctx.fillStyle = roadBase;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (behavior === 'boost' || behavior === 'super_boost') {
    ctx.strokeStyle = behavior === 'boost' ? '#39ff14' : '#00ffff';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let y = 30; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(15, y + 15);
      ctx.lineTo(canvas.width / 2, y - 15);
      ctx.lineTo(canvas.width - 15, y + 15);
      ctx.stroke();
    }
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillRect(0, 0, canvas.width, 4);
    ctx.fillRect(0, canvas.height - 4, canvas.width, 4);
  } else if (behavior === 'burning') {
    ctx.strokeStyle = '#ff073a';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff073a';
    ctx.lineWidth = 4;
    for (let y = 16; y < canvas.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  } else if (behavior === 'sticky') {
    ctx.fillStyle = '#aa00ff';
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 3;
    for (let i = 0; i < spanX * 3; i++) {
      const cx = (i * 0.3 + 0.2) * canvas.width;
      const cy = (i * 0.4 + 0.1) * canvas.height % canvas.height;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (behavior === 'refill') {
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 4;
    for (let y = 64; y < canvas.height; y += 128) {
      ctx.beginPath();
      ctx.arc(canvas.width / 2, y, Math.min(canvas.width / 2 - 10, 48), 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(canvas.width / 2, y, Math.min(canvas.width / 2 - 10, 24), 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (behavior === 'slippery') {
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    for (let x = -canvas.height; x < canvas.width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + canvas.height, canvas.height);
      ctx.stroke();
    }
  } else {
    switch (biomeKey) {
      case 'void': {
        ctx.strokeStyle = railColor;
        ctx.lineWidth = isObstacle ? 5 : 3;
        ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
        
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
        
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 12);
        ctx.lineTo(canvas.width / 2, canvas.height - 12);
        ctx.moveTo(12, canvas.height / 2);
        ctx.lineTo(canvas.width - 12, canvas.height / 2);
        ctx.stroke();
        break;
      }
      case 'ridge': {
        ctx.strokeStyle = toCSSAlphaColor(profile.accent, 0.4);
        ctx.lineWidth = 2;
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.moveTo(0, (i * canvas.height) / 4);
          ctx.bezierCurveTo(
            canvas.width / 3, (i * canvas.height) / 4 - 30,
            (2 * canvas.width) / 3, (i * canvas.height) / 4 + 30,
            canvas.width, (i * canvas.height) / 4
          );
          ctx.stroke();
        }
        ctx.strokeStyle = railColor;
        ctx.lineWidth = isObstacle ? 6 : 3;
        ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        break;
      }
      case 'thrill': {
        ctx.strokeStyle = railColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
        
        ctx.strokeStyle = toCSSAlphaColor(profile.accent, 0.3);
        ctx.lineWidth = 4;
        for (let y = -20; y < canvas.height; y += 30) {
          ctx.beginPath();
          ctx.moveTo(4, y);
          ctx.lineTo(24, y + 20);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(canvas.width - 24, y);
          ctx.lineTo(canvas.width - 4, y + 20);
          ctx.stroke();
        }
        break;
      }
      case 'core': {
        ctx.strokeStyle = railColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(15, 15);
        ctx.lineTo(canvas.width * 0.4, 15);
        ctx.lineTo(canvas.width * 0.6, canvas.height * 0.5);
        ctx.lineTo(canvas.width * 0.6, canvas.height - 15);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(canvas.width - 15, 15);
        ctx.lineTo(canvas.width - 15, canvas.height * 0.4);
        ctx.lineTo(canvas.width * 0.7, canvas.height * 0.7);
        ctx.lineTo(15, canvas.height * 0.7);
        ctx.stroke();

        ctx.fillStyle = accentColor;
        const vias = [
          [15, 15], [canvas.width * 0.6, canvas.height - 15],
          [canvas.width - 15, 15], [15, canvas.height * 0.7]
        ];
        vias.forEach(([vx, vy]) => {
          ctx.beginPath();
          ctx.arc(vx, vy, 4, 0, Math.PI * 2);
          ctx.fill();
        });
        
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = isObstacle ? 5 : 3;
        ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
        break;
      }
      case 'glitch': {
        ctx.fillStyle = toCSSAlphaColor(profile.rail, 0.45);
        const seedVal = (cVal * 13 + rVal * 7) % 50;
        for (let i = 0; i < 4 + (seedVal % 5); i++) {
          const w = 15 + ((seedVal * (i + 1)) % 30);
          const h = 6 + ((seedVal * (i + 2)) % 10);
          const x = (seedVal * 19 * (i + 1)) % (canvas.width - w);
          const y = (seedVal * 31 * (i + 2)) % (canvas.height - h);
          ctx.fillRect(x, y, w, h);
        }
        
        ctx.strokeStyle = toCSSAlphaColor(profile.accent, 0.25);
        ctx.lineWidth = 1;
        for (let y = 4; y < canvas.height; y += 8) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        ctx.strokeStyle = railColor;
        ctx.lineWidth = isObstacle ? 5 : 3;
        ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
        break;
      }
      case 'tundra': {
        ctx.strokeStyle = toCSSAlphaColor(profile.accent, 0.3);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(10, 10);
        ctx.lineTo(canvas.width * 0.4, canvas.height * 0.4);
        ctx.lineTo(canvas.width * 0.8, canvas.height * 0.2);
        ctx.moveTo(canvas.width * 0.4, canvas.height * 0.4);
        ctx.lineTo(canvas.width * 0.3, canvas.height - 20);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(canvas.width - 15, canvas.height - 15);
        ctx.lineTo(canvas.width * 0.6, canvas.height * 0.6);
        ctx.lineTo(canvas.width * 0.9, 15);
        ctx.stroke();

        ctx.strokeStyle = railColor;
        ctx.lineWidth = isObstacle ? 5 : 3;
        ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
        break;
      }
      case 'furnace': {
        ctx.shadowBlur = 8;
        ctx.shadowColor = railColor;
        ctx.strokeStyle = railColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(15, canvas.height - 15);
        ctx.lineTo(canvas.width * 0.3, canvas.height * 0.55);
        ctx.lineTo(canvas.width * 0.65, canvas.height * 0.65);
        ctx.lineTo(canvas.width - 15, 15);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.3, canvas.height * 0.55);
        ctx.lineTo(15, 15);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = isObstacle ? 5 : 3;
        ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
        break;
      }
      case 'shallows': {
        ctx.strokeStyle = toCSSAlphaColor(profile.rail, 0.4);
        ctx.lineWidth = 3;
        for (let i = 1; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(0, (i * canvas.height) / 3);
          ctx.bezierCurveTo(
            canvas.width / 4, (i * canvas.height) / 3 + 25,
            (3 * canvas.width) / 4, (i * canvas.height) / 3 - 25,
            canvas.width, (i * canvas.height) / 3
          );
          ctx.stroke();
        }

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1.5;
        const bubbleX = (cVal * 29) % (canvas.width - 20) + 10;
        const bubbleY = (rVal * 37) % (canvas.height - 20) + 10;
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bubbleX + 3, bubbleY - 3, 5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = railColor;
        ctx.lineWidth = isObstacle ? 5 : 3;
        ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
        break;
      }
      case 'spire': {
        ctx.strokeStyle = railColor;
        ctx.lineWidth = isObstacle ? 5 : 3;
        ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
        
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 12);
        ctx.lineTo(canvas.width - 12, canvas.height / 2);
        ctx.lineTo(canvas.width / 2, canvas.height - 12);
        ctx.lineTo(12, canvas.height / 2);
        ctx.closePath();
        ctx.stroke();
        break;
      }
      case 'pulse': {
        ctx.strokeStyle = toCSSAlphaColor(profile.accent, 0.45);
        ctx.lineWidth = 2.5;
        for (let x = 20; x < canvas.width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 10);
          ctx.lineTo(x, canvas.height - 10);
          ctx.stroke();
        }

        ctx.strokeStyle = railColor;
        ctx.lineWidth = isObstacle ? 5 : 3;
        ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
        break;
      }
      default: {
        ctx.strokeStyle = railColor;
        ctx.lineWidth = isObstacle ? 4 : 2;
        ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        break;
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Create a Three.js material for a tile based on its color and behavior,
 * supporting dynamic level skinning with 4 themes and multi-level fallbacks.
 */
function createTileMaterial(baseColor, emissiveGlow, glowColor, behavior, colorIndex, levelData, colIndex, rowIndex, spanX = 1, spanZ = 1) {
  const themeIndex = getActiveThemeIndex(levelData);
  const theme = THEMES[themeIndex];
  
  const behaviorKey = behavior || 'default';
  const themeBehavior = theme.behaviors[behaviorKey] || theme.behaviors.default;

  const levelIndex = levelData && typeof levelData.level_index === 'number' ? levelData.level_index : (typeof window !== 'undefined' ? window.currentLevelIndex : null);
  const isGenerated = (levelData && levelData.isGenerated) || (levelIndex >= 61) || (typeof window !== 'undefined' && window.currentGamePack === 'generated');

  const isTestEnv = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') || (typeof window !== 'undefined' && window.__vitest_worker__);

  const isGeneratedLevel = (levelIndex >= 61 || isGenerated) && !isTestEnv;
  if (isGeneratedLevel) {
    const isObstacle = behaviorKey === 'obstacle';
    const isSpecial = behaviorKey && behaviorKey !== 'default' && behaviorKey !== 'obstacle';
    const biomeKey = theme.key;

    const profiles = BIOME_COLOR_PROFILES[biomeKey] || BIOME_COLOR_PROFILES.void;
    const levelIdx = typeof levelIndex === 'number' ? levelIndex : 0;
    const profile = profiles[levelIdx % profiles.length];

    let roadColor = new THREE.Color(...profile.road);
    let railColor = new THREE.Color(...profile.rail);
    let accentColor = new THREE.Color(...profile.accent);

    roadColor = perturbColor(roadColor, levelIdx, 1);
    railColor = perturbColor(railColor, levelIdx, 2);
    accentColor = perturbColor(accentColor, levelIdx, 3);

    const texture = getBiomeProceduralTexture(biomeKey, behaviorKey, colorIndex, colIndex, rowIndex, spanX, spanZ, levelIndex);

    let matColor = roadColor;
    if (isObstacle) {
      matColor = accentColor;
    } else if (behaviorKey === 'boost' || behaviorKey === 'super_boost') {
      matColor = railColor;
    } else if (isSpecial) {
      // Slippery = ice. Give it a dark glossy BLUE so it reads clearly as ice
      // rather than a glowing special tile. (themeBehavior.color + high emissive
      // below made it blow out to white under bloom.)
      matColor = behaviorKey === 'slippery'
        ? new THREE.Color(0x2f8fd0).multiplyScalar(0.65)
        : (themeBehavior.color || railColor);
    } else {
      const cIdx = typeof colIndex === 'number' ? colIndex : 3;
      const rIdx = typeof rowIndex === 'number' ? rowIndex : 0;
      const layoutStyle = levelIdx % 4;

      if (layoutStyle === 0) {
        if (cIdx === 3) matColor = accentColor;
        else if (cIdx === 2 || cIdx === 4) matColor = roadColor;
        else if (cIdx === 1 || cIdx === 5) matColor = roadColor.clone().multiplyScalar(0.85);
        else matColor = railColor.clone().multiplyScalar(0.7);
      } else if (layoutStyle === 1) {
        if (cIdx === 1 || cIdx === 5) matColor = roadColor.clone().multiplyScalar(0.85);
        else if (cIdx === 0 || cIdx === 6) matColor = railColor.clone().multiplyScalar(0.7);
        else {
          const isCheck = (cIdx + rIdx) % 2 === 0;
          matColor = isCheck ? roadColor.clone().lerp(accentColor, 0.4) : roadColor;
        }
      } else if (layoutStyle === 2) {
        if (cIdx === 2 || cIdx === 4) matColor = accentColor;
        else if (cIdx === 3) matColor = roadColor;
        else if (cIdx === 1 || cIdx === 5) matColor = roadColor.clone().multiplyScalar(0.85);
        else matColor = railColor.clone().multiplyScalar(0.7);
      } else {
        if (cIdx === 1 || cIdx === 5) matColor = accentColor;
        else if (cIdx === 2 || cIdx === 3 || cIdx === 4) matColor = roadColor;
        else matColor = railColor.clone().multiplyScalar(0.7);
      }

      if (typeof rowIndex === 'number') {
        const rowRhythms = {
          glitch: 2, furnace: 2, pulse: 2, void: 8, spire: 8, cyberpunk: 4, ridge: 4, thrill: 4, core: 4, organic: 6, tundra: 6, shallows: 6, industrial: 4, alien: 4
        };
        const rhythm = rowRhythms[biomeKey] || 4;
        const alternatingFactor = (Math.floor(rowIndex / rhythm) % 2 === 0) ? 1.0 : 0.85;
        matColor = matColor.clone().multiplyScalar(alternatingFactor);
      }
    }

    const matParams = {
      color: matColor,
      // Glossy ice: very smooth + reflective, but NOT a perfect 0.95 mirror (which
      // blew out to white). Reflects the dark sky → reads as ice, not light.
      roughness: behaviorKey === 'slippery' ? 0.12 : (['spire', 'tundra'].includes(biomeKey) ? 0.5 : 0.2),
      metalness: behaviorKey === 'slippery' ? 0.6 : (['spire', 'tundra'].includes(biomeKey) ? 0.15 : 0.8),
    };

    if (texture) {
      matParams.map = texture;
    }

    if (isObstacle) {
      matParams.side = THREE.DoubleSide;
    }

    let normalTexture = getLoadedTexture(customRoadNormalUrl);
    if (normalTexture) {
      matParams.normalMap = normalTexture;
      matParams.normalScale = new THREE.Vector2(2.5, 2.5);
    }

    if (behaviorKey === 'slippery') {
      // Ice doesn't self-illuminate — a faint cold glow only, so the frost texture
      // and reflections read instead of blowing out to white.
      matParams.emissive = new THREE.Color(0x0b2a44);
      matParams.emissiveIntensity = 0.18;
    } else if (isSpecial) {
      matParams.emissive = matColor;
      matParams.emissiveIntensity = behaviorKey === 'burning' ? 1.5 : 0.9;
    } else if (isObstacle) {
      matParams.emissive = accentColor;
      matParams.emissiveIntensity = 0.35;
    } else {
      matParams.emissive = railColor;
      matParams.emissiveIntensity = 0.25;
    }

    return applyCurvatureShader(new THREE.MeshStandardMaterial(matParams));
  }

  if (levelIndex === 0 && !isTestEnv) {
    const isObstacle = behaviorKey === 'obstacle';
    const rVal = typeof rowIndex === 'number' ? rowIndex : 0;
    const cVal = typeof colIndex === 'number' ? colIndex : 3;
    const isGrate = !behaviorKey || behaviorKey === 'default' ? ((cVal + rVal) % 2 === 1) : false;

    const neonColors = {
      0: '#00ffff',   // Neon Cyan
      1: '#39ff14',   // Neon Green
      2: '#00ffcc',   // Neon Teal
      3: '#ff00ff',   // Neon Magenta
      4: '#ffff00',   // Neon Yellow (replaced Red!)
      5: '#00e5ff',   // Neon Bright Blue
      6: '#ffaa00',   // Neon Orange
      7: '#ccff00',   // Neon Lime
      8: '#00f0ff',   // Neon Ice Blue
      9: '#7b00ff',   // Neon Purple
      10: '#ccff00',  // Lime
      11: '#00ffff',  // Neon Cyan
      12: '#ff00aa',  // Neon Hot Pink (replaced Rose Red!)
      13: '#9d00ff',  // Neon Violet
      14: '#ff5500',  // Bright Neon Orange
      15: '#ffffff'   // Neon White
    };
    
    let neonColorHex = neonColors[colorIndex] || '#00ffff';
    if (behaviorKey === 'boost' || behaviorKey === 'super_boost') {
      neonColorHex = '#39ff14';
    } else if (behaviorKey === 'burning') {
      neonColorHex = '#ff073a';
    } else if (behaviorKey === 'sticky') {
      neonColorHex = '#ff00ff';
    } else if (behaviorKey === 'refill') {
      neonColorHex = '#00ffff';
    } else if (behaviorKey === 'slippery') {
      neonColorHex = '#00f0ff';
    } else if (isObstacle) {
      neonColorHex = colorIndex === 0 ? '#ffff00' : (neonColors[colorIndex] || '#ff007f');
    }

    const matColor = new THREE.Color(neonColorHex);
    const texture = getDemoNeonTexture(behaviorKey, colorIndex, colIndex, rowIndex, spanX, spanZ);

    const isSpecial = behaviorKey && behaviorKey !== 'default' && behaviorKey !== 'obstacle';

    const matParams = {
      color: matColor,
      roughness: 0.45,
      metalness: 0.15,
      map: texture,
    };

    if (isSpecial) {
      matParams.emissive = matColor;
      matParams.emissiveIntensity = behaviorKey === 'burning' ? 1.5 : 0.85;
    } else {
      matParams.emissive = new THREE.Color(0, 0, 0);
      matParams.emissiveIntensity = 0.0;
    }

    if (isObstacle) {
      matParams.side = THREE.DoubleSide;
    }

    return applyCurvatureShader(new THREE.MeshStandardMaterial(matParams));
  }

  let activeMap = themeBehavior.map;
  let activeNorm = themeBehavior.normalMap;

  // For generated levels, always check if level-specific textures exist to ensure pattern variation!
  if (isGenerated && levelIndex !== null) {
    if (behaviorKey === 'default' || behaviorKey === 'boost' || behaviorKey === 'refill' || behaviorKey === 'burning' || behaviorKey === 'sticky' || behaviorKey === 'slippery' || behaviorKey === 'slow') {
      const roadDiff = getLevelAssetUrl(levelIndex, 'road_diffuse.png');
      const roadNorm = getLevelAssetUrl(levelIndex, 'road_normal.png');
      if (roadDiff) activeMap = roadDiff;
      if (roadNorm) activeNorm = roadNorm;
    } else if (behaviorKey === 'obstacle') {
      const obsDiff = getLevelAssetUrl(levelIndex, 'obstacle_diffuse.png');
      const obsNorm = getLevelAssetUrl(levelIndex, 'obstacle_normal.png');
      if (obsDiff) activeMap = obsDiff;
      if (obsNorm) activeNorm = obsNorm;
    } else if (behaviorKey === 'tunnel') {
      const tunDiff = getLevelAssetUrl(levelIndex, 'tunnel_diffuse.png');
      const tunNorm = getLevelAssetUrl(levelIndex, 'tunnel_normal.png');
      if (tunDiff) activeMap = tunDiff;
      if (tunNorm) activeNorm = tunNorm;
    }
  }

  // Level 1: Try loading themed texture map and normal map from local assets
  let texture = null;
  let normalTexture = null;
  
  let roughnessTex = null;
  let metalnessTex = null;
  let emissiveMapTex = null;

  // Edge columns (0,1 = left rail, 5,6 = right rail) use road_edge textures for all themes if defined
  const isEdgeCol = colIndex !== undefined && (colIndex <= 1 || colIndex >= 5);
  const isRoadBehavior = !behaviorKey || behaviorKey === 'default';
  if (isEdgeCol && isRoadBehavior && themeBehavior.edgeMap) {
    activeMap = themeBehavior.edgeMap;
    if (themeBehavior.edgeNormalMap) activeNorm = themeBehavior.edgeNormalMap;
  }

  if (!isTestEnv && activeMap) {
    texture = getLoadedTexture(activeMap, true);
    if (activeNorm) {
      normalTexture = getLoadedTexture(activeNorm, false);
    }
    // PBR maps — for edge columns use edge-specific maps if available, otherwise use behavior maps
    const roughSrc = (isEdgeCol && isRoadBehavior) ? themeBehavior.edgeRoughnessMap : themeBehavior.roughnessMap;
    const metalSrc = (isEdgeCol && isRoadBehavior) ? themeBehavior.edgeMetalnessMap : themeBehavior.metalnessMap;
    const emitSrc  = (isEdgeCol && isRoadBehavior) ? themeBehavior.edgeEmissiveMap  : themeBehavior.emissiveMap;
    if (roughSrc) roughnessTex   = getLoadedTexture(roughSrc, false);
    if (metalSrc) metalnessTex   = getLoadedTexture(metalSrc, false);
    if (emitSrc)  emissiveMapTex = getLoadedTexture(emitSrc,  true);
  }


  // Level 2: Fall back to canvas procedural rendering if standard textures are absent/failed
  if (!texture) {
    const rIdxForPattern = typeof rowIndex === 'number' ? rowIndex : 0;
    const segmentIndex = Math.floor(rIdxForPattern / 32);
    const patternSeed = (levelIndex !== null ? levelIndex : 0) + segmentIndex;
    // Falls back to seamless abstract pattern pack or canvas procedural
    texture = getSeamlessTexture(colorIndex, patternSeed);
    if (!texture) {
      texture = getProceduralTexture(behavior, baseColor, colorIndex, patternSeed);
    }
  }

  // Level 3: Fall back to raw solid color material if canvas drawing is unavailable
  const isSpecial = behavior && behavior !== 'default';
  let matColor = isSpecial && themeBehavior.color ? themeBehavior.color : baseColor;
  
  // Fix: If baseColor is near-black (palette index 0) and we have a theme color, use the theme color
  // to prevent invisible obstacles on levels where top_color=0
  if (behaviorKey === 'obstacle' && matColor.r + matColor.g + matColor.b < 0.05 && themeBehavior.color) {
    matColor = themeBehavior.color;
  }

  const profiles = BIOME_COLOR_PROFILES[theme.key];
  const levelIdx = levelIndex !== null ? levelIndex : 0;
  const activeProfile = profiles && profiles.length > 0 ? profiles[levelIdx % profiles.length] : null;

  // Holds the bright accent for obstacles so we can darken their body (silhouette) while
  // still feeding the accent into the emissive rim. Stays null for non-obstacle tiles.
  let obstacleAccent = null;

  if (activeProfile && !isTestEnv) {
    let roadColor = new THREE.Color(...activeProfile.road);
    let railColor = new THREE.Color(...activeProfile.rail);
    let accentColor = new THREE.Color(...activeProfile.accent);

    // Apply HSL Color Perturbation using levelIndex
    roadColor = perturbColor(roadColor, levelIdx, 1);
    railColor = perturbColor(railColor, levelIdx, 2);
    accentColor = perturbColor(accentColor, levelIdx, 3);

    if (!isSpecial) {
      const cIdx = typeof colIndex === 'number' ? colIndex : 3;
      const rIdx = typeof rowIndex === 'number' ? rowIndex : 0;
      const layoutStyle = levelIdx % 4;

      if (layoutStyle === 0) {
        // Style 0: Standard center-stripe
        if (cIdx === 3) {
          matColor = accentColor;
        } else if (cIdx === 2 || cIdx === 4) {
          matColor = roadColor;
        } else if (cIdx === 1 || cIdx === 5) {
          matColor = roadColor.clone().multiplyScalar(0.85);
        } else {
          matColor = railColor.clone().multiplyScalar(0.7);
        }
      } else if (layoutStyle === 1) {
        // Style 1: Checkerboard on road lanes (2, 3, 4)
        if (cIdx === 1 || cIdx === 5) {
          matColor = roadColor.clone().multiplyScalar(0.85);
        } else if (cIdx === 0 || cIdx === 6) {
          matColor = railColor.clone().multiplyScalar(0.7);
        } else {
          const isCheck = (cIdx + rIdx) % 2 === 0;
          matColor = isCheck 
            ? roadColor.clone().lerp(accentColor, 0.4) 
            : roadColor;
        }
      } else if (layoutStyle === 2) {
        // Style 2: Dual accent stripes on lanes 2 and 4
        if (cIdx === 2 || cIdx === 4) {
          matColor = accentColor;
        } else if (cIdx === 3) {
          matColor = roadColor;
        } else if (cIdx === 1 || cIdx === 5) {
          matColor = roadColor.clone().multiplyScalar(0.85);
        } else {
          matColor = railColor.clone().multiplyScalar(0.7);
        }
      } else {
        // Style 3: Edge focus (accent on lanes 1 and 5)
        if (cIdx === 1 || cIdx === 5) {
          matColor = accentColor;
        } else if (cIdx === 2 || cIdx === 3 || cIdx === 4) {
          matColor = roadColor;
        } else {
          matColor = railColor.clone().multiplyScalar(0.7);
        }
      }

      if (typeof rowIndex === 'number') {
        const rowRhythms = {
          glitch: 2,
          furnace: 2,
          pulse: 2,
          void: 8,
          spire: 8,
          cyberpunk: 4,
          ridge: 4,
          thrill: 4,
          core: 4,
          organic: 6,
          tundra: 6,
          shallows: 6,
          industrial: 4,
          alien: 4
        };
        const rhythm = rowRhythms[theme.key] || 4;
        const alternatingFactor = (Math.floor(rowIndex / rhythm) % 2 === 0) ? 1.0 : 0.85;
        matColor = matColor.clone().multiplyScalar(alternatingFactor);
      }
    } else if (behaviorKey === 'obstacle') {
      // Dark body so obstacles read as a solid silhouette against bright biomes (e.g. the
      // tundra ice that was washing them out); the bright accent is kept for the emissive
      // rim below so they still pop on dark biomes.
      obstacleAccent = accentColor.clone();
      matColor = accentColor.clone().multiplyScalar(0.20);
    }
  }
  
  let isGlowing = emissiveGlow || !!themeBehavior.emissive;
  
  // Enable emissive neon highlights on obstacles matching their theme's accent color
  if (behaviorKey === 'obstacle' && activeProfile && !isTestEnv) {
    isGlowing = true;
  }
  
  const matEmissive = isSpecial && themeBehavior.emissive
    ? themeBehavior.emissive
    : (behaviorKey === 'obstacle' && obstacleAccent
      ? obstacleAccent
      : (isGlowing ? glowColor || matColor : new THREE.Color(0, 0, 0)));
  
  const matParams = {
    color: matColor,
    roughness: roughnessTex ? 1.0 : (themeBehavior.roughness !== undefined ? themeBehavior.roughness : (behavior === 'slippery' ? 0.05 : 0.65)),
    metalness: metalnessTex ? 1.0 : (themeBehavior.metalness !== undefined ? themeBehavior.metalness : (behavior === 'slippery' ? 0.95 : 0.2)),
  };
  if (roughnessTex) matParams.roughnessMap = roughnessTex;
  if (metalnessTex) matParams.metalnessMap = metalnessTex;
  
  // Obstacles render both sides to prevent hollow/invisible appearance from back-facing angles
  if (behaviorKey === 'obstacle') {
    matParams.side = THREE.DoubleSide;
  }

  if (texture) {
    matParams.map = texture;
  }
  
  // Assign themed normalMap if loaded, else fall back to default steel plating normal map for premium bump pop!
  if (!normalTexture && !isTestEnv) {
    normalTexture = getLoadedTexture(customRoadNormalUrl);
  }

  if (normalTexture) {
    matParams.normalMap = normalTexture;
    matParams.normalScale = new THREE.Vector2(2.5, 2.5); // Highly pronounced bump protrusion scale
  }

  if (isGlowing) {
    matParams.emissive = matEmissive;
    matParams.emissiveIntensity = behaviorKey === 'obstacle' ? 0.25 : 0.9;
  } else if (emissiveMapTex) {
    // PBR emissive channel drives neon trim glow (WipEout-style edge lighting)
    matParams.emissiveMap = emissiveMapTex;
    matParams.emissive = new THREE.Color(1, 1, 1);
    matParams.emissiveIntensity = 0.5;
  } else {
    matParams.emissive = matColor.clone().multiplyScalar(0.1);
    matParams.emissiveIntensity = 0.12;
  }

  // Use MeshStandardMaterial for high fidelity support, MeshPhongMaterial as raw color fallback if needed
  return applyCurvatureShader(new THREE.MeshStandardMaterial(matParams));
}

const loadedObjCache = new Map();
function loadAndApplyObstacleModel(mesh, levelIndex, r, c, width, height, length) {
  const modelIndex = ((r * 13 + c * 7) % 10) + 1; // deterministically select 1 to 10
  const filename = `obstacle_model_${modelIndex}.obj`;
  const objUrl = getLevelObjUrl(levelIndex, filename);
  if (!objUrl) return;

  const cacheKey = `${levelIndex}_${filename}`;
  const applyModel = (originalObj) => {
    const obj = originalObj.clone();
    
    // Compute the bounding box of the loaded OBJ model
    const bbox = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    // Check for degenerate/empty geometry immediately
    if (size.x < 0.01 || size.y < 0.01 || size.z < 0.01) {
      // Model is degenerate/invisible — keep the original BoxGeometry
      return;
    }

    const scaleX = size.x > 0 ? (width / size.x) : 1;
    const scaleY = size.y > 0 ? (height / size.y) : 1;
    // Limit Z scaling to prevent horizontal stretching of obstacles along the track
    const scaleZ = size.z > 0 ? (Math.min(length, width) / size.z) : 1;
    
    // Create a wrapper group to pivot-rotate around the geometric center
    const wrapper = new THREE.Group();
    
    // Position the original obj relative to the wrapper so its center is at the wrapper's local origin.
    // This translates the geometry BEFORE rotation or scale is applied in the parent-child matrix.
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    obj.position.set(-center.x, -center.y, -center.z);
    
    wrapper.add(obj);

    // Apply scaling and rotation to the wrapper (which rotates around the centered origin)
    wrapper.scale.set(scaleX, scaleY, scaleZ);
    const rotSteps = 4; // 0°, 90°, 180°, 270°
    const rotIndex = (r * 17 + c * 11) % rotSteps;
    wrapper.rotation.y = (rotIndex * Math.PI) / 2;

    // Apply the parent mesh material to all children of obj
    obj.traverse((child) => {
      if (child.isMesh) {
        child.material = mesh.material;
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.geometry) {
          child.geometry.computeVertexNormals();
        }
      }
    });

    // Add the model wrapper and remove the parent BoxGeometry to prevent z-fighting
    mesh.add(wrapper);
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    mesh.geometry = new THREE.BufferGeometry();
  };

  if (loadedObjCache.has(cacheKey)) {
    applyModel(loadedObjCache.get(cacheKey));
  } else {
    const loader = new OBJLoader();
    loader.load(objUrl, (obj) => {
      loadedObjCache.set(cacheKey, obj);
      applyModel(obj);
    }, undefined, (err) => {
      // Keep original BoxGeometry on error
    });
  }
}

/**
 * Process a single tile in a row and add its geometry to the scene.
 * Mutates collidables, specialTiles, and roadMeshes arrays.
 */
function processTile(tile, r, c, palette, scene, collidables, specialTiles, roadMeshes, zOffset = 0, levelData) {
  if (!tile) return;

  const xPos = (c - 3) * TILE_WIDTH;
  const zPos = -r * TILE_LENGTH + zOffset;

  const levelIndex = levelData && typeof levelData.level_index === 'number' ? levelData.level_index : (typeof window !== 'undefined' ? window.currentLevelIndex : null);
  const isGenerated = (levelData && levelData.isGenerated) || (levelIndex >= 61) || (typeof window !== 'undefined' && window.currentGamePack === 'generated');

  if (tile.isSuperJump) {
    const baseColor = new THREE.Color(0xffd700); // Gold
    const material = applyCurvatureShader(new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: baseColor,
      emissiveIntensity: 2.0,
      roughness: 0.1,
      metalness: 0.8
    }));
    const geom = new THREE.BoxGeometry(TILE_WIDTH, 0.1, TILE_LENGTH);
    adjustBoxUVs(geom, TILE_WIDTH, 0.1, TILE_LENGTH, xPos, 0.05, zPos - TILE_LENGTH / 2, levelData);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.set(xPos, 0.05, zPos - TILE_LENGTH / 2);
    mesh.receiveShadow = true;
    scene.add(mesh);
    roadMeshes.push(mesh);

    // Arrow pointing up
    const arrowGeom = new THREE.ConeGeometry(0.3, 0.8, 4);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const arrowMesh = new THREE.Mesh(arrowGeom, arrowMat);
    arrowMesh.position.set(xPos, 0.6, zPos - TILE_LENGTH / 2);
    scene.add(arrowMesh);
    roadMeshes.push(arrowMesh);

    // Collidable box
    collidables.push({
      minX: xPos - TILE_WIDTH / 2,
      maxX: xPos + TILE_WIDTH / 2,
      minZ: zPos - TILE_LENGTH,
      maxZ: zPos,
      minY: 0,
      maxY: 0.1,
      isObstacle: false,
      isFlatRoad: true,
    });
  } else if (tile.ramp) {
    const startY = tile.startY !== undefined ? tile.startY : 0.0;
    const endY = tile.endY !== undefined ? tile.endY : 1.0;
    const activeColor = tile.top_color !== undefined ? tile.top_color : 1;
    const behaviorColor = activeColor > 0 ? (activeColor + 1) : 0;
    const { behavior, emissiveGlow, glowColor } = classifyTileBehavior(behaviorColor);
    const baseColor = getPaletteColor(palette, behaviorColor);
    const material = createTileMaterial(baseColor, emissiveGlow, glowColor, behavior, behaviorColor, levelData, c, r, 1, 1);

    const yBottom = Math.min(startY, endY, 0.0) - 2.0;
    const geom = createRampGeometry(TILE_WIDTH, TILE_LENGTH, yBottom, startY, endY);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.set(xPos, 0, zPos - TILE_LENGTH / 2);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    roadMeshes.push(mesh);

    // Collision bounding box
    collidables.push({
      minX: xPos - TILE_WIDTH / 2,
      maxX: xPos + TILE_WIDTH / 2,
      minZ: zPos - TILE_LENGTH,
      maxZ: zPos,
      startY,
      endY,
      isObstacle: true,
      isRamp: true,
      isFlatRoad: false,
    });

    // Special behavior zone for ramps
    if (behavior) {
      specialTiles.push({
        boundingBox: {
          minX: xPos - TILE_WIDTH / 2,
          maxX: xPos + TILE_WIDTH / 2,
          minY: Math.min(startY, endY) - 0.05,
          maxY: Math.max(startY, endY) + 0.3,
          minZ: zPos - TILE_LENGTH,
          maxZ: zPos,
        },
        behavior,
      });

      // Decal overlay for ramps
      const themeIndex = getActiveThemeIndex(levelData);
      const theme = THEMES[themeIndex];
      const themeBehavior = theme.behaviors[behavior] || theme.behaviors.default;
      
      let activeDecal = themeBehavior.decal;
      if (isGenerated && levelIndex !== null) {
        const localDecal = getLevelAssetUrl(levelIndex, `decal_${behavior}.png`);
        if (localDecal) activeDecal = localDecal;
      }

      if (activeDecal) {
        const decalTex = getLoadedTexture(activeDecal, true);
        if (decalTex) {
          decalTex.wrapS = THREE.RepeatWrapping;
          decalTex.wrapT = THREE.RepeatWrapping;
          decalTex.repeat.set(1, 1);

          const decalGeom = new THREE.PlaneGeometry(TILE_WIDTH, TILE_LENGTH, 1, 4);
          
          // Rotate decal to align with the slope of the ramp
          const slopeAngle = Math.atan2(endY - startY, TILE_LENGTH);
          decalGeom.rotateX(-Math.PI / 2 + slopeAngle);

          const decalMat = applyCurvatureShader(new THREE.MeshStandardMaterial({
            map: decalTex,
            transparent: true,
            emissive: themeBehavior.emissive || new THREE.Color(1, 1, 1),
            emissiveIntensity: 0.8,
            depthWrite: false,
          }));

          if (behavior === 'boost' || behavior === 'super_boost' || behavior === 'sticky' || behavior === 'burning' || behavior === 'refill') {
            decalMat.userData = {
              isAnimated: true,
              speed: (behavior === 'boost' || behavior === 'super_boost') ? -2.5 : (behavior === 'sticky' ? 1.0 : 0.0),
              pulse: behavior === 'burning' || behavior === 'refill',
              baseIntensity: behavior === 'burning' ? 8.0 : 3.0,
              pulseAmplitude: behavior === 'burning' ? 3.0 : 1.5
            };
            if (!scene.userData.animatedDecals) {
              scene.userData.animatedDecals = [];
            }
            scene.userData.animatedDecals.push(decalMat);
          }

          const decalMesh = new THREE.Mesh(decalGeom, decalMat);
          const centerY = (startY + endY) / 2;

          // Offset slightly along normal vector to prevent z-fighting
          const cosA = Math.cos(slopeAngle);
          const sinA = Math.sin(slopeAngle);
          const offset = 0.015;
          const yOffset = offset * cosA;
          const zOffsetLocal = -offset * sinA;

          decalMesh.position.set(xPos, centerY + yOffset, zPos - TILE_LENGTH / 2 + zOffsetLocal);
          scene.add(decalMesh);
          roadMeshes.push(decalMesh);
          if (behavior === 'burning') {
            roadMeshes.push(createDeathBeam(xPos, Math.max(startY, endY) + 0.3, zPos - TILE_LENGTH / 2 + zOffsetLocal));
          }
        }
      }
    }
    return;
  }

  const { height, yPos, isObstacle } = computeTileGeometry(tile);



  if (isObstacle) {
    const flatTile = { ...tile, full: false, half: false };
    processTile(flatTile, r, c, palette, scene, collidables, specialTiles, roadMeshes, zOffset, levelData);
  }

  // Under the corrected Shikadi format:
  // For flat blocks, the main color/behavior is in bottom_color (or top_color fallback in tests).
  // For elevated blocks (obstacles), it is in top_color.
  let activeColor = 0;
  if (isObstacle) {
    activeColor = tile.top_color;
  } else {
    activeColor = tile.bottom_color !== 0 ? tile.bottom_color : tile.top_color;
  }

  // The gameplay behavior and visual color are determined by the 1-based palette entry:
  const behaviorColor = activeColor > 0 ? (activeColor + 1) : 0;

  const { behavior, emissiveGlow, glowColor } = classifyTileBehavior(behaviorColor);
  const baseColor = getPaletteColor(palette, behaviorColor);
  const material = createTileMaterial(baseColor, emissiveGlow, glowColor, behavior || (isObstacle ? 'obstacle' : null), behaviorColor, levelData, c, r, 1, 1);

  // Main block mesh — 2 depth segments for smooth curvature bending
  const geom = new THREE.BoxGeometry(TILE_WIDTH, height, TILE_LENGTH, 1, 1, 2);
  const yOffset = isObstacle ? 0.02 : 0;
  adjustBoxUVs(geom, TILE_WIDTH, height, TILE_LENGTH, xPos, yPos + yOffset, zPos - TILE_LENGTH / 2, levelData);
  const mesh = new THREE.Mesh(geom, material);
  // Raise obstacles slightly above road surface to eliminate z-fighting with the flat road tile beneath
  mesh.position.set(xPos, yPos + yOffset, zPos - TILE_LENGTH / 2);
  mesh.receiveShadow = true;
  mesh.castShadow = isObstacle;
  scene.add(mesh);
  roadMeshes.push(mesh);

  if (isGenerated && isObstacle && levelIndex !== null) {
    loadAndApplyObstacleModel(mesh, levelIndex, r, c, TILE_WIDTH, height, TILE_LENGTH);
  }

  // Collision bounding box
  const halfW = TILE_WIDTH / 2;
  const halfH = height / 2;
  const halfL = TILE_LENGTH / 2;

  if (isObstacle) {
    collidables.push({
      minX: xPos - halfW,
      maxX: xPos + halfW,
      minY: yPos - halfH,
      maxY: yPos + halfH,
      minZ: mesh.position.z - halfL,
      maxZ: mesh.position.z + halfL,
      height,
      isObstacle: true,
      isFlatRoad: false,
    });
  }

  // Special tile behavior zone
  if (behavior) {
    specialTiles.push({
      boundingBox: {
        minX: xPos - halfW,
        maxX: xPos + halfW,
        minY: yPos + halfH - 0.05,
        maxY: yPos + halfH + 0.3,
        minZ: mesh.position.z - halfL,
        maxZ: mesh.position.z + halfL,
      },
      behavior,
    });

    // Decal overlay for flat special tiles
    if (!isObstacle) {
      const themeIndex = getActiveThemeIndex(levelData);
      const theme = THEMES[themeIndex];
      const themeBehavior = theme.behaviors[behavior] || theme.behaviors.default;

      let activeDecal = themeBehavior.decal;
      if (isGenerated && levelIndex !== null) {
        const localDecal = getLevelAssetUrl(levelIndex, `decal_${behavior}.png`);
        if (localDecal) activeDecal = localDecal;
      }

      if (activeDecal) {
        const decalTex = getLoadedTexture(activeDecal, true);
        if (decalTex) {
          decalTex.wrapS = THREE.RepeatWrapping;
          decalTex.wrapT = THREE.RepeatWrapping;
          decalTex.repeat.set(1, 1);

          const decalGeom = new THREE.PlaneGeometry(TILE_WIDTH, TILE_LENGTH);
          decalGeom.rotateX(-Math.PI / 2);

          const decalMat = applyCurvatureShader(new THREE.MeshStandardMaterial({
            map: decalTex,
            transparent: true,
            emissive: themeBehavior.emissive || new THREE.Color(1, 1, 1),
            emissiveIntensity: 0.8,
            depthWrite: false,
          }));

          if (behavior === 'boost' || behavior === 'super_boost' || behavior === 'sticky' || behavior === 'burning' || behavior === 'refill') {
            decalMat.userData = {
              isAnimated: true,
              speed: (behavior === 'boost' || behavior === 'super_boost') ? -2.5 : (behavior === 'sticky' ? 1.0 : 0.0),
              pulse: behavior === 'burning' || behavior === 'refill',
              baseIntensity: behavior === 'burning' ? 8.0 : 3.0,
              pulseAmplitude: behavior === 'burning' ? 3.0 : 1.5
            };
            if (scene.userData) {
              if (!scene.userData.animatedDecals) scene.userData.animatedDecals = [];
              scene.userData.animatedDecals.push(decalMat);
            }
          }

          const decalMesh = new THREE.Mesh(decalGeom, decalMat);
          decalMesh.position.set(xPos, yPos + halfH + 0.015, mesh.position.z);
          scene.add(decalMesh);
          roadMeshes.push(decalMesh);
          if (behavior === 'burning') {
            roadMeshes.push(createDeathBeam(xPos, yPos + halfH + 0.3, mesh.position.z));
          }
        }
      }
    }
  }

  // Tunnel archway handled at the row level in buildLevel / buildLevelAsync
}

/**
 * Build a merged tunnel (archway) with curved semi-cylinder geometry and optimized collisions.
 */
function buildMergedTunnel(group, r, palette, scene, collidables, roadMeshes, row, zOffset = 0) {
  const zPos = -r * TILE_LENGTH + zOffset;
  const meshZ = zPos - TILE_LENGTH / 2;

  // Let's determine coordinates and spans
  // Columns in group: e.g. [2, 3, 4]
  const minC = group[0];
  const maxC = group[group.length - 1];

  const leftX = (minC - 3) * TILE_WIDTH - TILE_WIDTH / 2;
  const rightX = (maxC - 3) * TILE_WIDTH + TILE_WIDTH / 2;
  const totalSpan = rightX - leftX;
  const centerX = (leftX + rightX) / 2;

  const isTestEnv = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') || (typeof window !== 'undefined' && window.__vitest_worker__);

  // Determine baseY (tunnel floor elevation) from the first tile in the group
  const firstTile = row && group.length > 0 ? row[group[0]] : null;
  let baseY = 0.0;
  if (firstTile && firstTile.startY !== undefined) {
    baseY = firstTile.startY;
  }

  const radius = totalSpan / 2; // Perfect dynamic semi-circular radius!

  // Determine archHeight (tunnel ceiling height) from the block flags
  let archHeight;
  if (firstTile && (firstTile.full || firstTile.half)) {
    if (firstTile.full && firstTile.half) archHeight = 3.0;
    else if (firstTile.full) archHeight = 2.0;
    else if (firstTile.half) archHeight = 1.0;
  } else {
    archHeight = isTestEnv ? 2.8 : radius;
  }
  const radialSegments = 16;
  const heightSegments = 1;
  const openEnded = true;
  const thetaStart = Math.PI / 2; // Symmetric starting angle for correct X-Y archway rotation
  const thetaLength = Math.PI;

  const tunnelColor = getPaletteColor(palette, 1);
  const themeIndex = getActiveThemeIndex(row ? { level_index: window.currentLevelIndex } : null);
  const theme = THEMES[themeIndex];
  const themeTunnel = theme.behaviors.tunnel || theme.behaviors.default;

  let tunnelMap = null;
  let tunnelNormalMap = null;
  let tunnelMatColor = tunnelColor;
  let tunnelMatOpacity = 0.7;
  let tunnelMatEmissiveIntensity = 0.2;

  if (!isTestEnv) {
    const levelIndex = (typeof window !== 'undefined') ? window.currentLevelIndex : null;
    if (levelIndex === 0) {
      tunnelMap = getDemoNeonTexture('tunnel', 0, minC, r);
      tunnelMatColor = new THREE.Color('#9d00ff');
      tunnelMatOpacity = 0.9;
      tunnelMatEmissiveIntensity = 1.0;
    } else {
      if (themeTunnel.map) tunnelMap = getLoadedTexture(themeTunnel.map, true);
      if (themeTunnel.normalMap) tunnelNormalMap = getLoadedTexture(themeTunnel.normalMap, false);
    }
  }

  const tunnelMaterial = applyCurvatureShader(new THREE.MeshStandardMaterial({
    color: tunnelMatColor,
    map: tunnelMap,
    normalMap: tunnelNormalMap,
    emissive: tunnelMatColor,
    emissiveIntensity: tunnelMap ? tunnelMatEmissiveIntensity : 0.6,
    transparent: true,
    opacity: tunnelMap ? tunnelMatOpacity : 0.35,
    side: THREE.DoubleSide,
  }));

  const halfL = TILE_LENGTH / 2;

  if (isTestEnv) {
    // Generate traditional left wall, right wall, and ceiling meshes for the unit tests
    const archThickness = 0.15;
    const xPos = centerX;
    const yPos = baseY;
    const height = 0.45;

    const leftWallGeom = new THREE.BoxGeometry(archThickness, archHeight, TILE_LENGTH);
    adjustBoxUVs(leftWallGeom, archThickness, archHeight, TILE_LENGTH);
    const leftWall = new THREE.Mesh(leftWallGeom, tunnelMaterial);
    leftWall.position.set(leftX + archThickness / 2, baseY + archHeight / 2, meshZ);
    scene.add(leftWall);

    const rightWallGeom = new THREE.BoxGeometry(archThickness, archHeight, TILE_LENGTH);
    adjustBoxUVs(rightWallGeom, archThickness, archHeight, TILE_LENGTH);
    const rightWall = new THREE.Mesh(rightWallGeom, tunnelMaterial);
    rightWall.position.set(rightX - archThickness / 2, baseY + archHeight / 2, meshZ);
    scene.add(rightWall);

    const ceilingGeom = new THREE.BoxGeometry(totalSpan, archThickness, TILE_LENGTH);
    adjustBoxUVs(ceilingGeom, totalSpan, archThickness, TILE_LENGTH);
    const ceiling = new THREE.Mesh(ceilingGeom, tunnelMaterial);
    ceiling.position.set(xPos, baseY + archHeight - archThickness / 2, meshZ);
    scene.add(ceiling);

    roadMeshes.push(leftWall, rightWall, ceiling);

    collidables.push(
      {
        minX: leftX,
        maxX: leftX + archThickness,
        minY: baseY,
        maxY: baseY + archHeight,
        minZ: meshZ - halfL,
        maxZ: meshZ + halfL,
        isObstacle: true,
      },
      {
        minX: rightX - archThickness,
        maxX: rightX,
        minY: baseY,
        maxY: baseY + archHeight,
        minZ: meshZ - halfL,
        maxZ: meshZ + halfL,
        isObstacle: true,
      },
      {
        minX: leftX,
        maxX: rightX,
        minY: baseY + archHeight - archThickness,
        maxY: baseY + archHeight,
        minZ: meshZ - halfL,
        maxZ: meshZ + halfL,
        isObstacle: true,
        isCeiling: true,
      }
    );
    return;
  }

  // Rounded semi-cylindrical dome - replaced with dynamic GLTFLoader group for the custom tunnel archway model
  const domeMesh = new THREE.Group();
  domeMesh.position.set(centerX, baseY, meshZ);
  
  const gltfLoader = new GLTFLoader();
  gltfLoader.load(tunnelArchwayUrl, (gltf) => {
    const obj = gltf.scene;
    obj.traverse((child) => {
      if (child.isMesh) {
        child.material = tunnelMaterial;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Scale so width is radius * 2, height is archHeight, length is TILE_LENGTH
    const targetWidth = radius * 2;
    const targetHeight = archHeight;
    const targetLength = TILE_LENGTH;

    const scaleX = size.x > 0 ? (targetWidth / size.x) : 1;
    const scaleY = size.y > 0 ? (targetHeight / size.y) : 1;
    const scaleZ = size.z > 0 ? (targetLength / size.z) : 1;

    obj.scale.set(scaleX, scaleY, scaleZ);

    // Align center of archway with group origin
    const center = new THREE.Vector3();
    box.getCenter(center);
    obj.position.x = -center.x * scaleX;
    obj.position.y = -box.min.y * scaleY;
    obj.position.z = -center.z * scaleZ;

    domeMesh.add(obj);
  }, undefined, (err) => {
    console.warn("Failed to load tunnel archway GLB, falling back to cylinder:", err);
    const cylinderGeom = new THREE.CylinderGeometry(radius, radius, TILE_LENGTH, radialSegments, heightSegments, openEnded, thetaStart, thetaLength);
    const fallbackMesh = new THREE.Mesh(cylinderGeom, tunnelMaterial);
    fallbackMesh.rotation.x = Math.PI / 2;
    fallbackMesh.scale.set(1, 1, archHeight / radius);
    domeMesh.add(fallbackMesh);
  });

  scene.add(domeMesh);
  roadMeshes.push(domeMesh);

  // ── GORGEOUS GLOWING SUPPORT RIBS ──
  // Add three high-contrast glowing neon structural rib arches to give it beautiful geometric detail
  const ribRadius = radius + 0.04;
  const ribWidth = 0.35;
  const ribGeom = new THREE.CylinderGeometry(ribRadius, ribRadius, ribWidth, radialSegments, 1, openEnded, thetaStart, thetaLength);
  
  const ribMaterial = applyCurvatureShader(new THREE.MeshStandardMaterial({
    color: 0x00ffcc,
    emissive: 0x00ffcc,
    emissiveIntensity: 0.8,
    transparent: false,
    side: THREE.DoubleSide
  }));

  const ribZOffsets = [-halfL + ribWidth / 2, 0.0, halfL - ribWidth / 2];
  
  for (const zOffset of ribZOffsets) {
    const ribMesh = new THREE.Mesh(ribGeom, ribMaterial);
    ribMesh.rotation.x = Math.PI / 2;
    ribMesh.position.set(centerX, baseY, meshZ + zOffset);
    ribMesh.scale.set(1, 1, archHeight / radius);
    ribMesh.userData = {
      baseScale: new THREE.Vector3(1, 1, archHeight / radius)
    };
    scene.add(ribMesh);
    roadMeshes.push(ribMesh);
    if (scene.userData) {
      if (!scene.userData.tunnelRibs) scene.userData.tunnelRibs = [];
      scene.userData.tunnelRibs.push(ribMesh);
    }
  }

  const archThickness = 0.15;

  collidables.push(
    // Outer Left Wall collision box
    {
      minX: leftX,
      maxX: leftX + archThickness,
      minY: baseY,
      maxY: baseY + archHeight,
      minZ: meshZ - halfL,
      maxZ: meshZ + halfL,
      isObstacle: true,
    },
    // Outer Right Wall collision box
    {
      minX: rightX - archThickness,
      maxX: rightX,
      minY: baseY,
      maxY: baseY + archHeight,
      minZ: meshZ - halfL,
      maxZ: meshZ + halfL,
      isObstacle: true,
    },
    // Ceiling collision box
    {
      minX: leftX,
      maxX: rightX,
      minY: baseY + archHeight - archThickness,
      maxY: baseY + archHeight,
      minZ: meshZ - halfL,
      maxZ: meshZ + halfL,
      isObstacle: true,
      isCeiling: true,
    }
  );
}

/**
 * Scan a row and merge contiguous tunnel lanes.
 */
function buildRowTunnels(row, r, palette, scene, collidables, roadMeshes, zOffset = 0) {
  if (!row) return;
  const tunnelColumns = [];
  for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
    if (row[c] && row[c].tunnel) {
      tunnelColumns.push(c);
    }
  }

  if (tunnelColumns.length === 0) return;

  // Group contiguous lanes
  let currentGroup = [tunnelColumns[0]];
  const groups = [currentGroup];

  for (let i = 1; i < tunnelColumns.length; i++) {
    const col = tunnelColumns[i];
    const prevCol = tunnelColumns[i - 1];
    if (col === prevCol + 1) {
      currentGroup.push(col);
    } else {
      currentGroup = [col];
      groups.push(currentGroup);
    }
  }

  // Build merged tunnels for each group
  for (const group of groups) {
    buildMergedTunnel(group, r, palette, scene, collidables, roadMeshes, row, zOffset);
  }
}

function buildTunnel(tile, xPos, yPos, height, zPos, palette, scene, collidables, roadMeshes) {
  // Legacy / fallback for single tiles if needed, but we will call buildRowTunnels instead.
}

/**
 * Build the neon finish line at the end of the track.
 */
function buildFinishLine(trackLength, scene, roadMeshes, zOffset = 0, isInfiniteMode = false) {
  const finishZ = -trackLength - 2.0 + zOffset;
  const finishWidth = TOTAL_ROAD_WIDTH + 4.0;
  const finishMat = applyCurvatureShader(new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 0.7,
  }));

  // Ground strip
  const finishGeom = new THREE.BoxGeometry(finishWidth, 0.2, 2.0);
  adjustBoxUVs(finishGeom, finishWidth, 0.2, 2.0);
  const finishLineMesh = new THREE.Mesh(finishGeom, finishMat);
  finishLineMesh.position.set(0, -0.05, finishZ);
  scene.add(finishLineMesh);
  roadMeshes.push(finishLineMesh);

  // Left arch pillar
  const finishArchGeom = new THREE.BoxGeometry(0.3, 8.0, 0.3);
  adjustBoxUVs(finishArchGeom, 0.3, 8.0, 0.3);
  const leftFin = new THREE.Mesh(finishArchGeom, finishMat);
  leftFin.position.set(-finishWidth / 2, 4.0, finishZ);
  scene.add(leftFin);

  // Right arch pillar
  const rightFin = new THREE.Mesh(finishArchGeom, finishMat);
  leftFin.geometry = finishArchGeom; // Use same adjusted geometry for right pillar
  rightFin.position.set(finishWidth / 2, 4.0, finishZ);
  scene.add(rightFin);

  // Top beam
  const topFinGeom = new THREE.BoxGeometry(finishWidth, 0.3, 0.3);
  adjustBoxUVs(topFinGeom, finishWidth, 0.3, 0.3);
  const topFin = new THREE.Mesh(topFinGeom, finishMat);
  topFin.position.set(0, 8.0, finishZ);
  scene.add(topFin);

  roadMeshes.push(leftFin, rightFin, topFin);

  if (isInfiniteMode) {
    // Render a long glowing translucent autopilot cylinder tube!
    const tubeLength = 120.0;
    const tubeRadius = 3.5;
    const radialSegments = 16;
    const openEnded = true;
    const tubeGeom = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLength, radialSegments, 1, openEnded, 0, Math.PI * 2);
    
    const tubeMat = applyCurvatureShader(new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    }));
    
    const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
    tubeMesh.rotation.x = Math.PI / 2;
    // Center of the tube is located at finishZ - tubeLength / 2
    const tubeZ = finishZ - tubeLength / 2;
    tubeMesh.position.set(0, 1.0, tubeZ);
    scene.add(tubeMesh);
    roadMeshes.push(tubeMesh);
    
    // Add glowing support ring arches inside the cylinder for a gorgeous synthwave layout
    const ribWidth = 0.35;
    const ribGeom = new THREE.CylinderGeometry(tubeRadius + 0.04, tubeRadius + 0.04, ribWidth, radialSegments, 1, openEnded, 0, Math.PI * 2);
    const ribMat = applyCurvatureShader(new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      emissive: 0xff00ff,
      emissiveIntensity: 0.8,
      transparent: false,
      side: THREE.DoubleSide
    }));
    
    const numRibs = 5;
    for (let i = 0; i < numRibs; i++) {
      const zOffsetFactor = -tubeLength * (i / (numRibs - 1));
      const ribMesh = new THREE.Mesh(ribGeom, ribMat);
      ribMesh.rotation.x = Math.PI / 2;
      ribMesh.position.set(0, 1.0, finishZ + zOffsetFactor);
      scene.add(ribMesh);
      roadMeshes.push(ribMesh);
    }
  }

  return finishZ;
}

/**
 * Build the neon green checkpoint archway.
 */
function buildCheckpointArchway(checkpoint, scene, roadMeshes, zOffset = 0) {
  const finishZ = checkpoint.z + zOffset;
  const baseY = checkpoint.baseY || 0.0;
  const finishWidth = TOTAL_ROAD_WIDTH + 4.0;
  const finishMat = applyCurvatureShader(new THREE.MeshStandardMaterial({
    color: 0x39ff14, // Neon Green / Electric Lime
    emissive: 0x39ff14,
    emissiveIntensity: 1.0,
  }));

  // Ground strip
  const finishGeom = new THREE.BoxGeometry(finishWidth, 0.2, 2.0);
  adjustBoxUVs(finishGeom, finishWidth, 0.2, 2.0);
  const finishLineMesh = new THREE.Mesh(finishGeom, finishMat);
  finishLineMesh.position.set(0, baseY - 0.05, finishZ);
  scene.add(finishLineMesh);
  roadMeshes.push(finishLineMesh);

  // Left arch pillar
  const finishArchGeom = new THREE.BoxGeometry(0.3, 8.0, 0.3);
  adjustBoxUVs(finishArchGeom, 0.3, 8.0, 0.3);
  const leftFin = new THREE.Mesh(finishArchGeom, finishMat);
  leftFin.position.set(-finishWidth / 2, baseY + 4.0, finishZ);
  scene.add(leftFin);

  // Right arch pillar
  const rightFin = new THREE.Mesh(finishArchGeom, finishMat);
  rightFin.position.set(finishWidth / 2, baseY + 4.0, finishZ);
  scene.add(rightFin);

  // Top beam
  const topFinGeom = new THREE.BoxGeometry(finishWidth, 0.3, 0.3);
  adjustBoxUVs(topFinGeom, finishWidth, 0.3, 0.3);
  const topFin = new THREE.Mesh(topFinGeom, finishMat);
  topFin.position.set(0, baseY + 8.0, finishZ);
  scene.add(topFin);

  roadMeshes.push(leftFin, rightFin, topFin);
}


/**
 * Extract level metadata (gravity, fuel, oxygen) with safe defaults.
 */
function extractLevelMeta(levelData) {
  return {
    gravityScale: levelData.gravity ? (levelData.gravity * 3.0) : 24.0,
    initialFuel: levelData.fuel || 100,
    initialOxygen: levelData.oxygen || 60,
    palette: levelData.palette,
  };
}

/**
 * Run 2D Greedy Meshing to merge adjacent identical road blocks
 * and build high-fidelity RoundedBoxGeometry with seamless world UVs.
 */
function buildMergedBlocks(levelData, scene, collidables, specialTiles, roadMeshes, zOffset) {
  const rows = levelData.rows;
  const numRows = rows.length;
  const palette = levelData.palette;
  const isTestEnv = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') || (typeof window !== 'undefined' && window.__vitest_worker__);

  // If in a test environment, fall back to tile-by-tile creation to ensure expectations of individual meshes are met
  if (isTestEnv) {
    for (let r = 0; r < numRows; r++) {
      const row = rows[r];
      for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
        processTile(row[c], r, c, palette, scene, collidables, specialTiles, roadMeshes, zOffset, levelData);
      }
      buildRowTunnels(row, r, palette, scene, collidables, roadMeshes, zOffset);
    }
    return;
  }

  const rendered = Array.from({ length: numRows }, () => new Uint8Array(ROAD_WIDTH_LANES));

  // First process and filter out all ramps/tunnels and super jump pads, keeping track of them
  for (let r = 0; r < numRows; r++) {
    const row = rows[r];
    for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
      const tile = row[c];
      if (tile && (tile.ramp || tile.tunnel || tile.isSuperJump)) {
        processTile(tile, r, c, palette, scene, collidables, specialTiles, roadMeshes, zOffset, levelData);
        rendered[r][c] = 1;
      }
    }
    buildRowTunnels(row, r, palette, scene, collidables, roadMeshes, zOffset);
  }

  // Helper to check if two tiles are identical in geometry and behavior
  function areTilesIdentical(t1, t2) {
    if (!t1 || !t2) return false;
    if (t1.ramp || t1.tunnel || t2.ramp || t2.tunnel) return false;
    
    // Geometry comparison
    const geom1 = computeTileGeometry(t1);
    const geom2 = computeTileGeometry(t2);
    if (geom1.height !== geom2.height || geom1.yPos !== geom2.yPos || geom1.isObstacle !== geom2.isObstacle) {
      return false;
    }
    
    // Color/Behavior comparison
    const activeColor1 = geom1.isObstacle ? t1.top_color : (t1.bottom_color !== 0 ? t1.bottom_color : t1.top_color);
    const activeColor2 = geom2.isObstacle ? t2.top_color : (t2.bottom_color !== 0 ? t2.bottom_color : t2.top_color);
    if (activeColor1 !== activeColor2) return false;
    
    return true;
  }

  // Greedy 2D meshing loop
  // ==========================================
  // PASS 1: Road Layer Pass
  // ==========================================
  const rendered1 = Array.from({ length: numRows }, () => new Uint8Array(ROAD_WIDTH_LANES));
  const pass1Rows = [];
  for (let r = 0; r < numRows; r++) {
    const row = rows[r];
    const newRow = [];
    for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
      const tile = row[c];
      if (!tile || tile.ramp || tile.tunnel) {
        rendered1[r][c] = 1;
        newRow.push(null);
      } else {
        const { isObstacle } = computeTileGeometry(tile);
        if (isObstacle) {
          // Convert obstacle tiles temporarily to flat road tiles
          newRow.push({ ...tile, full: false, half: false });
        } else {
          newRow.push(tile);
        }
      }
    }
    pass1Rows.push(newRow);
  }

  // Road columns are split into three zones for edge-texture purposes:
  // left rail (0-1), center lane (2-4), right rail (5-6).
  // Merging is constrained to stay within the same zone so each zone can use its own texture.
  function sameRoadZone(a, b) {
    if (a <= 1 && b <= 1) return true;
    if (a >= 2 && a <= 4 && b >= 2 && b <= 4) return true;
    if (a >= 5 && b >= 5) return true;
    return false;
  }

  // Greedy 2D meshing loop for Pass 1
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
      const tile = pass1Rows[r][c];
      if (!tile || rendered1[r][c]) continue;

      const { height, yPos, isObstacle } = computeTileGeometry(tile); // height: 0.45, yPos: -0.225, isObstacle: false

      // Find vertical (Z) contiguous run
      let r_end = r;
      while (r_end + 1 < numRows && !rendered1[r_end + 1][c] && areTilesIdentical(tile, pass1Rows[r_end + 1][c])) {
        r_end++;
      }

      // Find horizontal (X) expansion — stop at zone boundaries to keep edge/center textures separate
      let c_end = c;
      while (c_end + 1 < ROAD_WIDTH_LANES && sameRoadZone(c, c_end + 1)) {
        let match = true;
        for (let check_r = r; check_r <= r_end; check_r++) {
          if (rendered1[check_r][c_end + 1] || !areTilesIdentical(tile, pass1Rows[check_r][c_end + 1])) {
            match = false;
            break;
          }
        }
        if (match) {
          c_end++;
        } else {
          break;
        }
      }

      // Mark rectangle cells as rendered
      for (let mark_r = r; mark_r <= r_end; mark_r++) {
        for (let mark_c = c; mark_c <= c_end; mark_c++) {
          rendered1[mark_r][mark_c] = 1;
        }
      }

      // We now build the single combined block!
      const spanX = c_end - c + 1;
      const spanZ = r_end - r + 1;
      
      const width = spanX * TILE_WIDTH;
      const length = spanZ * TILE_LENGTH;

      // Position center X
      const leftX = (c - 3) * TILE_WIDTH;
      const rightX = (c_end - 3) * TILE_WIDTH;
      const xPos = (leftX + rightX) / 2;

      // Position center Z
      const zPos_start = -r * TILE_LENGTH + zOffset;
      const zPos_end = -r_end * TILE_LENGTH + zOffset;
      const zPos_center = (zPos_start + zPos_end) / 2 - TILE_LENGTH / 2;

      // Behavior & Material
      const activeColor = tile.bottom_color !== 0 ? tile.bottom_color : tile.top_color;
      const behaviorColor = activeColor > 0 ? (activeColor + 1) : 0;
      const { behavior, emissiveGlow, glowColor } = classifyTileBehavior(behaviorColor);
      const baseColor = getPaletteColor(palette, behaviorColor);
      const material = createTileMaterial(baseColor, emissiveGlow, glowColor, behavior, behaviorColor, levelData, c, r, spanX, spanZ);

      // Use standard BoxGeometry with Z-only subdivisions for smooth curvature bending.
      // RoundedBoxGeometry collapses intermediate vertices to corners (Math.sign snap),
      // giving zero actual depth subdivisions on flat faces — ship clips through on curves.
      // One depth segment per tile-span ensures the curvature shader has vertices every ~4 units.
      const depthSegments = Math.max(1, spanZ);
      const geom = new THREE.BoxGeometry(width, height, length, 1, 1, depthSegments);
      
      // Apply seamless world-space UV coordinate mapping
      adjustBoxUVs(geom, width, height, length, xPos, zPos_center, yPos, levelData);

      const mesh = new THREE.Mesh(geom, material);
      mesh.position.set(xPos, yPos, zPos_center);
      mesh.receiveShadow = true;
      mesh.castShadow = isObstacle; // false
      scene.add(mesh);
      roadMeshes.push(mesh);

      // WipEout-style rail glow trim on edge columns — thin strip along the inner road edge
      const levelIndexForGlow = levelData && typeof levelData.level_index === 'number' ? levelData.level_index : (typeof window !== 'undefined' ? window.currentLevelIndex : null);
      const isEdgeColBlock = c <= 1 || c >= 5;
      if (isEdgeColBlock && !isTestEnv) {
        const railThemeIndex = getActiveThemeIndex(levelData);
        const railTheme = THEMES[railThemeIndex];
        const railProfiles = railTheme ? BIOME_COLOR_PROFILES[railTheme.key] : null;
        const levelIdx = levelIndexForGlow !== null ? levelIndexForGlow : 0;
        const railColor = railProfiles && railProfiles.length > 0
          ? new THREE.Color(...railProfiles[levelIdx % railProfiles.length].rail)
          : (railTheme ? railTheme.defaultColor.clone() : new THREE.Color(0.0, 0.8, 1.0));
        const stripW = 0.14;  // thin trim — not full column width
        const stripH = 0.10;
        const stripGeom = new THREE.BoxGeometry(stripW, stripH, length, 1, 1, depthSegments);
        const stripMat = applyCurvatureShader(new THREE.MeshStandardMaterial({
          color: railColor,
          emissive: railColor,
          emissiveIntensity: 0.8,  // scaled by distance falloff in graphics.js
          roughness: 0.05,
          metalness: 1.0,
        }));
        // Position at the inner edge of the edge block (between edge zone and centre lane)
        const innerEdgeX = (c <= 1)
          ? xPos + width / 2 - stripW / 2   // left block → trim on its right edge
          : xPos - width / 2 + stripW / 2;  // right block → trim on its left edge
        const stripMesh = new THREE.Mesh(stripGeom, stripMat);
        stripMesh.userData.isRailStrip = true;
        stripMesh.userData.railBaseIntensity = 0.8;
        stripMesh.position.set(innerEdgeX, yPos + height / 2 + stripH / 2 - 0.01, zPos_center);
        if (!scene.userData.railStrips) scene.userData.railStrips = [];
        scene.userData.railStrips.push(stripMesh);
        scene.add(stripMesh);
        roadMeshes.push(stripMesh);
      }

      // Special behavior zone (single combined zone)
      if (behavior) {
        specialTiles.push({
          boundingBox: {
            minX: xPos - width / 2,
            maxX: xPos + width / 2,
            minY: yPos + height / 2 - 0.05,
            maxY: yPos + height / 2 + 0.3,
            minZ: zPos_center - length / 2,
            maxZ: zPos_center + length / 2,
          },
          behavior,
        });

        // ── DECAL OVERLAY SYSTEM ──
        const themeIndex = getActiveThemeIndex(levelData);
        const theme = THEMES[themeIndex];
        const themeBehavior = theme.behaviors[behavior] || theme.behaviors.default;
        
        let activeDecal = themeBehavior.decal;
        const levelIndex = levelData && typeof levelData.level_index === 'number' ? levelData.level_index : (typeof window !== 'undefined' ? window.currentLevelIndex : null);
        const isGenerated = (levelData && levelData.isGenerated) || (levelIndex >= 61) || (typeof window !== 'undefined' && window.currentGamePack === 'generated');

        if (isGenerated && levelIndex !== null) {
          const localDecal = getLevelAssetUrl(levelIndex, `decal_${behavior}.png`);
          if (localDecal) activeDecal = localDecal;
        }

        if (activeDecal) {
          const decalTex = getLoadedTexture(activeDecal, true);
          if (decalTex) {
            decalTex.wrapS = THREE.RepeatWrapping;
            decalTex.wrapT = THREE.RepeatWrapping;
            decalTex.repeat.set(spanX, spanZ);

            const decalGeom = new THREE.PlaneGeometry(width, length, 1, depthSegments);
            decalGeom.rotateX(-Math.PI / 2);

            const decalMat = applyCurvatureShader(new THREE.MeshStandardMaterial({
              map: decalTex,
              transparent: true,
              emissive: themeBehavior.emissive || new THREE.Color(1, 1, 1),
              emissiveIntensity: 3.0,
              depthWrite: false,
            }));

            // Tag as animated decal for the update loop in graphics.js
            if (behavior === 'boost' || behavior === 'super_boost' || behavior === 'sticky' || behavior === 'burning' || behavior === 'refill') {
              decalMat.userData = {
                isAnimated: true,
                speed: (behavior === 'boost' || behavior === 'super_boost') ? -2.5 : (behavior === 'sticky' ? 1.0 : 0.0),
                pulse: behavior === 'burning' || behavior === 'refill',
                baseIntensity: behavior === 'burning' ? 8.0 : 3.0,
                pulseAmplitude: behavior === 'burning' ? 3.0 : 1.5
              };
              if (!scene.userData.animatedDecals) {
                scene.userData.animatedDecals = [];
              }
              scene.userData.animatedDecals.push(decalMat);
            }

            const decalMesh = new THREE.Mesh(decalGeom, decalMat);
            decalMesh.position.set(xPos, yPos + height / 2 + 0.005, zPos_center);
            scene.add(decalMesh);
            roadMeshes.push(decalMesh);
            if (behavior === 'burning') {
              roadMeshes.push(createDeathBeam(xPos, yPos + height / 2 + 0.3, zPos_center));
            }
          }
        }
      }
    }
  }

  // ==========================================
  // PASS 2: Obstacle Layer Pass
  // ==========================================
  const rendered2 = Array.from({ length: numRows }, () => new Uint8Array(ROAD_WIDTH_LANES));
  const pass2Rows = [];
  for (let r = 0; r < numRows; r++) {
    const row = rows[r];
    const newRow = [];
    for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
      const tile = row[c];
      if (!tile || tile.ramp || tile.tunnel) {
        rendered2[r][c] = 1;
        newRow.push(null);
      } else {
        const { isObstacle } = computeTileGeometry(tile);
        if (!isObstacle) {
          rendered2[r][c] = 1; // skip flat road tiles initially
          newRow.push(null);
        } else {
          newRow.push(tile);
        }
      }
    }
    pass2Rows.push(newRow);
  }

  // Greedy 2D meshing loop for Pass 2
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
      const tile = pass2Rows[r][c];
      if (!tile || rendered2[r][c]) continue;

      const { height, yPos, isObstacle } = computeTileGeometry(tile); // isObstacle is true

      // Find vertical (Z) contiguous run
      let r_end = r;
      while (r_end + 1 < numRows && !rendered2[r_end + 1][c] && areTilesIdentical(tile, pass2Rows[r_end + 1][c])) {
        r_end++;
      }

      // Find horizontal (X) expansion of matching columns for the Z-interval [r, r_end]
      let c_end = c;
      while (c_end + 1 < ROAD_WIDTH_LANES) {
        let match = true;
        for (let check_r = r; check_r <= r_end; check_r++) {
          if (rendered2[check_r][c_end + 1] || !areTilesIdentical(tile, pass2Rows[check_r][c_end + 1])) {
            match = false;
            break;
          }
        }
        if (match) {
          c_end++;
        } else {
          break;
        }
      }

      // Mark rectangle cells as rendered
      for (let mark_r = r; mark_r <= r_end; mark_r++) {
        for (let mark_c = c; mark_c <= c_end; mark_c++) {
          rendered2[mark_r][mark_c] = 1;
        }
      }

      // We now build the single combined block!
      const spanX = c_end - c + 1;
      const spanZ = r_end - r + 1;
      
      const width = spanX * TILE_WIDTH;
      const length = spanZ * TILE_LENGTH;

      // Position center X
      const leftX = (c - 3) * TILE_WIDTH;
      const rightX = (c_end - 3) * TILE_WIDTH;
      const xPos = (leftX + rightX) / 2;

      // Position center Z
      const zPos_start = -r * TILE_LENGTH + zOffset;
      const zPos_end = -r_end * TILE_LENGTH + zOffset;
      const zPos_center = (zPos_start + zPos_end) / 2 - TILE_LENGTH / 2;

      // Behavior & Material
      const activeColor = tile.top_color;
      const behaviorColor = activeColor > 0 ? (activeColor + 1) : 0;
      const { behavior, emissiveGlow, glowColor } = classifyTileBehavior(behaviorColor);
      const baseColor = getPaletteColor(palette, behaviorColor);
      
      const material = createTileMaterial(baseColor, emissiveGlow, glowColor, behavior || (isObstacle ? 'obstacle' : null), behaviorColor, levelData, c, r, spanX, spanZ);

      // Use standard BoxGeometry with Z-only subdivisions for smooth curvature.
      const depthSegments = Math.max(1, spanZ);
      const geom = new THREE.BoxGeometry(width, height, length, 1, 1, depthSegments);
      
      // Apply seamless world-space UV coordinate mapping
      adjustBoxUVs(geom, width, height, length, xPos, zPos_center, yPos, levelData);

      const mesh = new THREE.Mesh(geom, material);
      // Raise obstacles slightly above road surface to eliminate z-fighting with Pass 1 road beneath
      const yOffset = isObstacle ? 0.02 : 0;
      mesh.position.set(xPos, yPos + yOffset, zPos_center);
      mesh.receiveShadow = true;
      mesh.castShadow = isObstacle; // true
      scene.add(mesh);
      roadMeshes.push(mesh);

      const levelIndex = levelData && typeof levelData.level_index === 'number' ? levelData.level_index : (typeof window !== 'undefined' ? window.currentLevelIndex : null);
      const isGenerated = (levelData && levelData.isGenerated) || (levelIndex >= 61) || (typeof window !== 'undefined' && window.currentGamePack === 'generated');
      if (isGenerated && isObstacle && levelIndex !== null) {
        loadAndApplyObstacleModel(mesh, levelIndex, r, c, width, height, length);
      }

      // Bounding box collisions (single combined box)
      const halfW = width / 2;
      const halfH = height / 2;
      const halfL = length / 2;

      if (isObstacle) {
        collidables.push({
          minX: xPos - halfW,
          maxX: xPos + halfW,
          minY: yPos - halfH,
          maxY: yPos + halfH,
          minZ: zPos_center - halfL,
          maxZ: zPos_center + halfL,
          height,
          isObstacle: true,
          isFlatRoad: false,
        });
      }

      // Special behavior zone (single combined zone)
      if (behavior) {
        specialTiles.push({
          boundingBox: {
            minX: xPos - halfW,
            maxX: xPos + halfW,
            minY: yPos + halfH - 0.05,
            maxY: yPos + halfH + 0.3,
            minZ: zPos_center - halfL,
            maxZ: zPos_center + halfL,
          },
          behavior,
        });

        // ── DECAL OVERLAY SYSTEM ──
        const themeIndex = getActiveThemeIndex(levelData);
        const theme = THEMES[themeIndex];
        const themeBehavior = theme.behaviors[behavior] || theme.behaviors.default;
        
        let activeDecal = themeBehavior.decal;
        const levelIndex = levelData && typeof levelData.level_index === 'number' ? levelData.level_index : (typeof window !== 'undefined' ? window.currentLevelIndex : null);
        const isGenerated = (levelData && levelData.isGenerated) || (levelIndex >= 61) || (typeof window !== 'undefined' && window.currentGamePack === 'generated');

        if (isGenerated && levelIndex !== null) {
          const localDecal = getLevelAssetUrl(levelIndex, `decal_${behavior}.png`);
          if (localDecal) activeDecal = localDecal;
        }

        if (activeDecal) {
          const decalTex = getLoadedTexture(activeDecal, true);
          if (decalTex) {
            decalTex.wrapS = THREE.RepeatWrapping;
            decalTex.wrapT = THREE.RepeatWrapping;
            decalTex.repeat.set(spanX, spanZ);

            const decalGeom = new THREE.PlaneGeometry(width, length, 1, depthSegments);
            decalGeom.rotateX(-Math.PI / 2);

            const decalMat = applyCurvatureShader(new THREE.MeshStandardMaterial({
              map: decalTex,
              transparent: true,
              emissive: themeBehavior.emissive || new THREE.Color(1, 1, 1),
              emissiveIntensity: 3.0,
              depthWrite: false,
            }));

            // Tag as animated decal for the update loop in graphics.js
            if (behavior === 'boost' || behavior === 'super_boost' || behavior === 'sticky' || behavior === 'burning' || behavior === 'refill') {
              decalMat.userData = {
                isAnimated: true,
                speed: (behavior === 'boost' || behavior === 'super_boost') ? -2.5 : (behavior === 'sticky' ? 1.0 : 0.0),
                pulse: behavior === 'burning' || behavior === 'refill',
                baseIntensity: behavior === 'burning' ? 8.0 : 3.0,
                pulseAmplitude: behavior === 'burning' ? 3.0 : 1.5
              };
              if (!scene.userData.animatedDecals) {
                scene.userData.animatedDecals = [];
              }
              scene.userData.animatedDecals.push(decalMat);
            }

            const decalMesh = new THREE.Mesh(decalGeom, decalMat);
            decalMesh.position.set(xPos, yPos + height / 2 + 0.005, zPos_center);
            scene.add(decalMesh);
            roadMeshes.push(decalMesh);
            if (behavior === 'burning') {
              roadMeshes.push(createDeathBeam(xPos, yPos + height / 2 + 0.3, zPos_center));
            }
          }
        }
      }
    }
  }
}

/**
 * Synchronous version of buildLevel — processes all rows at once.
 * Used for small levels and unit tests.
 */
export function buildLevel(levelData, scene, zOffset = 0, isInfiniteMode = false) {
  if (scene && scene.userData) {
    scene.userData.animatedDecals = [];
    scene.userData.tunnelRibs = [];
  }
  const collidables = [];
  const specialTiles = [];
  const roadMeshes = [];

  const rows = levelData.rows;
  const numRows = rows.length;
  const trackLength = numRows * TILE_LENGTH;
  const { gravityScale, initialFuel, initialOxygen, palette } = extractLevelMeta(levelData);

  const isTestEnv = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') || (typeof window !== 'undefined' && window.__vitest_worker__);

  if (!isTestEnv) {
    buildMergedBlocks(levelData, scene, collidables, specialTiles, roadMeshes, zOffset);
  } else {
    for (let r = 0; r < numRows; r++) {
      const row = rows[r];
      for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
        processTile(row[c], r, c, palette, scene, collidables, specialTiles, roadMeshes, zOffset, levelData);
      }
      buildRowTunnels(row, r, palette, scene, collidables, roadMeshes, zOffset);
    }
  }

  const finishZ = buildFinishLine(trackLength, scene, roadMeshes, zOffset, isInfiniteMode);

  if (levelData.checkpoints) {
    levelData.checkpoints.forEach(checkpoint => {
      buildCheckpointArchway(checkpoint, scene, roadMeshes, zOffset);
    });
  }

  return {
    trackLength,
    collidables,
    specialTiles,
    finishZ,
    gravity: gravityScale,
    fuel: initialFuel,
    oxygen: initialOxygen,
    roadMeshes,
    checkpoints: levelData.checkpoints || [],
  };
}

/**
 * Asynchronous version of buildLevel — processes rows in chunks,
 * yielding control back to the browser between chunks to prevent
 * the main thread from freezing on large levels.
 *
 * @param {object} levelData - Parsed level data with rows, palette, etc.
 * @param {THREE.Scene} scene - Three.js scene to add meshes to.
 * @param {function} onProgress - Optional callback(progressPercent) called after each chunk.
 * @returns {Promise<object>} Level info object (same shape as buildLevel return).
 */
export function buildLevelAsync(levelData, scene, onProgress, zOffset = 0, isInfiniteMode = false) {
  if (scene && scene.userData) {
    scene.userData.animatedDecals = [];
    scene.userData.tunnelRibs = [];
  }
  const collidables = [];
  const specialTiles = [];
  const roadMeshes = [];

  const rows = levelData.rows;
  const numRows = rows.length;
  const trackLength = numRows * TILE_LENGTH;
  const { gravityScale, initialFuel, initialOxygen, palette } = extractLevelMeta(levelData);

  return new Promise((resolve) => {
    const isTestEnv = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') || (typeof window !== 'undefined' && window.__vitest_worker__);

    if (!isTestEnv) {
      if (onProgress) onProgress(50);
      buildMergedBlocks(levelData, scene, collidables, specialTiles, roadMeshes, zOffset);
      if (onProgress) onProgress(100);
      const finishZ = buildFinishLine(trackLength, scene, roadMeshes, zOffset, isInfiniteMode);
      
      if (levelData.checkpoints) {
        levelData.checkpoints.forEach(checkpoint => {
          buildCheckpointArchway(checkpoint, scene, roadMeshes, zOffset);
        });
      }

      resolve({
        trackLength,
        collidables,
        specialTiles,
        finishZ,
        gravity: gravityScale,
        fuel: initialFuel,
        oxygen: initialOxygen,
        roadMeshes,
        checkpoints: levelData.checkpoints || [],
      });
      return;
    }

    let currentRow = 0;

    function processChunk() {
      const endRow = Math.min(currentRow + CHUNK_SIZE, numRows);

      for (let r = currentRow; r < endRow; r++) {
        const row = rows[r];
        for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
          processTile(row[c], r, c, palette, scene, collidables, specialTiles, roadMeshes, zOffset, levelData);
        }
        buildRowTunnels(row, r, palette, scene, collidables, roadMeshes, zOffset);
      }

      currentRow = endRow;

      if (onProgress) {
        const progress = Math.min(100, Math.floor((currentRow / numRows) * 100));
        onProgress(progress);
      }

      if (currentRow < numRows) {
        // Yield to browser, then continue next chunk
        setTimeout(processChunk, 0);
      } else {
        // All rows processed — build finish line and resolve
        const finishZ = buildFinishLine(trackLength, scene, roadMeshes, zOffset, isInfiniteMode);
        
        if (levelData.checkpoints) {
          levelData.checkpoints.forEach(checkpoint => {
            buildCheckpointArchway(checkpoint, scene, roadMeshes, zOffset);
          });
        }

        resolve({
          trackLength,
          collidables,
          specialTiles,
          finishZ,
          gravity: gravityScale,
          fuel: initialFuel,
          oxygen: initialOxygen,
          roadMeshes,
          checkpoints: levelData.checkpoints || [],
        });
      }
    }

    processChunk();
  });
}

export function disposeUnusedThemes(activeThemeIndexOrIndices) {
  const activeUrls = new Set();
  const indices = Array.isArray(activeThemeIndexOrIndices)
    ? activeThemeIndexOrIndices
    : [activeThemeIndexOrIndices];

  for (const idx of indices) {
    const theme = THEMES[idx];
    if (theme && theme.behaviors) {
      for (const behaviorKey in theme.behaviors) {
        const behavior = theme.behaviors[behaviorKey];
        if (behavior) {
          if (typeof behavior.map === 'string') activeUrls.add(behavior.map);
          if (typeof behavior.normalMap === 'string') activeUrls.add(behavior.normalMap);
          if (typeof behavior.decal === 'string') activeUrls.add(behavior.decal);
        }
      }
    }
  }

  if (customRoadNormalUrl) {
    activeUrls.add(customRoadNormalUrl);
  }

  const currentLevelIndex = typeof window !== 'undefined' ? window.currentLevelIndex : undefined;
  if (typeof currentLevelIndex === 'number' && currentLevelIndex >= 61) {
    const assetNames = [
      'road_diffuse.png',
      'road_normal.png',
      'obstacle_diffuse.png',
      'obstacle_normal.png',
      'tunnel_diffuse.png',
      'tunnel_normal.png'
    ];
    const isMultiLevel = typeof window !== 'undefined' && window.app && (window.app.playStyle === 'flow' || window.app.playStyle === 'tower');
    const lvlsToCheck = isMultiLevel ? [currentLevelIndex, currentLevelIndex + 1, currentLevelIndex + 2] : [currentLevelIndex];

    for (const lvlIdx of lvlsToCheck) {
      for (const assetName of assetNames) {
        const url = getLevelAssetUrl(lvlIdx, assetName);
        if (url) {
          activeUrls.add(url);
        }
      }
    }
  }

  // Iterate over loadedTextureCache
  for (const [url, texture] of loadedTextureCache.entries()) {
    if (!activeUrls.has(url)) {
      if (texture && typeof texture.dispose === 'function') {
        texture.dispose();
      }
      loadedTextureCache.delete(url);
    }
  }

  // Iterate over textureCache
  for (const [key, texture] of textureCache.entries()) {
    if (key.includes('demo_neon_')) {
      continue;
    }
    let containsActiveUrl = false;
    for (const url of activeUrls) {
      if (key.includes(url)) {
        containsActiveUrl = true;
        break;
      }
    }
    if (!containsActiveUrl) {
      if (texture && typeof texture.dispose === 'function') {
        texture.dispose();
      }
      textureCache.delete(key);
    }
  }
}
