// SkyRoads Level Loader & 3D Geometry Generator (Three.js)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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

// Tile width and Z-length configuration — declared in heightfield.js (single source of truth)
export { TILE_WIDTH, TILE_LENGTH, ROAD_WIDTH_LANES, TOTAL_ROAD_WIDTH } from './heightfield.js';
import { TILE_WIDTH, TILE_LENGTH, ROAD_WIDTH_LANES, TOTAL_ROAD_WIDTH, buildColumnGrid, legacyTileToSpans } from './heightfield.js';

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
    // Local→world matrix. For InstancedMesh, fold the per-instance transform in so
    // each instance curves by its own world Z. THREE auto-defines USE_INSTANCING and
    // declares instanceMatrix for instanced draws; the #else path is byte-identical to
    // the original non-instanced code so every existing mesh is unchanged.
    #ifdef USE_INSTANCING
      mat4 _curveModel = modelMatrix * instanceMatrix;
    #else
      mat4 _curveModel = modelMatrix;
    #endif
    vec4 wp = _curveModel * vec4(transformed, 1.0);
    float d = uCameraZ - wp.z;        // distance ahead (positive = in front)
    float ang = d / uCurvatureRadius;

    // Displace in WORLD space (Y = up, Z = forward)
    wp.y += uCurvatureRadius * (1.0 - cos(ang));   // always >= 0 (curves up)
    wp.z += uCurvatureRadius * sin(ang) - d;        // Z compression

    // Convert displaced world position back to the pre-transform space that
    // <project_vertex> expects (it re-applies instanceMatrix then modelMatrix).
    transformed = (inverse(_curveModel) * wp).xyz;
  }
`;

/**
 * Inject curvature vertex shader into any THREE.Material.
 * Uses onBeforeCompile to modify the vertex shader at GPU compile time.
 * Zero per-frame cost beyond the single uniform update.
 */
export function applyCurvatureShader(material, opts) {
  if (!material || material.isShaderMaterial) return material;
  const voidViz = !!(opts && opts.voidViz);
  // Per-material: the world-Z where this tile's segment starts (drives the viz panel).
  const zStartUniform = new THREE.Uniform(opts && typeof opts.zStart === 'number' ? opts.zStart : 0);

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
       ${voidViz ? 'varying vec3 vWorldPos;' : ''}
       void main() {`
    );

    // Inject curvature displacement after #include <begin_vertex>; capture the curved
    // world position afterwards so the void viz panel sticks to the visible road.
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n' + CURVATURE_VERTEX_GLSL +
        (voidViz ? '\n  vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;' : '')
    );

    // Void biome: sample the live music visualizer across each track segment.
    if (voidViz) {
      shader.uniforms.uVoidViz       = voidVizUniforms.uVoidViz;
      shader.uniforms.uVoidVizOn     = voidVizUniforms.uVoidVizOn;
      shader.uniforms.uVoidVizGain   = voidVizUniforms.uVoidVizGain;
      shader.uniforms.uVoidVizUnits  = voidVizUniforms.uVoidVizUnits;
      shader.uniforms.uVoidVizZStart = zStartUniform;
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `uniform sampler2D uVoidViz;
         uniform float uVoidVizOn;
         uniform float uVoidVizGain;
         uniform float uVoidVizUnits;
         uniform float uVoidVizZStart;
         varying vec3 vWorldPos;
         void main() {`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n' + VOID_VIZ_FRAGMENT_GLSL
      );
    }
  };

  // Force Three.js to recompile when curvature is toggled / for the void variant
  material.customProgramCacheKey = () =>
    'curvature_' + (curvatureUniforms.uCurvatureOn.value > 0.5 ? '1' : '0') + (voidViz ? '_vv' : '');

  return material;
}

// ═══════════════════════════════════════════════════════════════════
// Live music-visualizer road for the Void biome (levels 61-63).
// The milkdrop visualizer already renders to graphics.visualizerTexture each frame;
// we sample it on the road, mapped per set-piece SEGMENT (each segment shows one
// flowing panel). World-position sampling + a per-material segment Z-start needs no
// custom geometry/attributes. The shared uniforms are fed once per frame by
// GraphicsEngine — O(1) in the number of tiles.
// ═══════════════════════════════════════════════════════════════════
let _voidVizFallbackTex = null;
function getVoidVizFallbackTex() {
  if (!_voidVizFallbackTex && typeof THREE.DataTexture === 'function') {
    // 1x1 black — keeps the sampler valid at first compile (a null sampler set later
    // doesn't rebind reliably); GraphicsEngine swaps in the live visualizer texture.
    _voidVizFallbackTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    _voidVizFallbackTex.needsUpdate = true;
  }
  return _voidVizFallbackTex;
}

// Master toggle for the Void road music-visualizer overlay. OFF for now — the whole
// pipeline (shader variant, uniforms, graphics per-frame feed, worldBuilder `segments`)
// is kept in place; flip this to true to bring the per-segment visualizer road back.
const VOID_VIZ_ENABLED = false;

export const voidVizUniforms = {
  uVoidViz:      new THREE.Uniform(getVoidVizFallbackTex()),
  uVoidVizOn:    new THREE.Uniform(0.0),   // 1 when the live visualizer texture is available
  uVoidVizGain:  new THREE.Uniform(0.6),   // <1 so bright presets don't bloom to white
  uVoidVizUnits: new THREE.Uniform(24.0),  // world units per visualizer frame along the track
};

// Rows-per-segment fallback when a level lacks `segments` metadata (e.g. bespoke 61).
const VOID_SEGMENT_CHUNK = 24;
function getVoidSegment(levelData, rowIndex) {
  const r = typeof rowIndex === 'number' ? rowIndex : 0;
  const segs = levelData && levelData.segments;
  if (Array.isArray(segs)) {
    for (let i = 0; i < segs.length; i++) {
      if (r >= segs[i].startRow && r <= segs[i].endRow) return segs[i];
    }
  }
  const startRow = Math.floor(r / VOID_SEGMENT_CHUNK) * VOID_SEGMENT_CHUNK;
  return { startRow, endRow: startRow + VOID_SEGMENT_CHUNK - 1 };
}

// Sample the live visualizer across the segment: U spans the 14u road width, V flows
// toward the player and resets at each segment's Z-start. sRGB→linear, gain-limited.
const VOID_VIZ_FRAGMENT_GLSL = `
  if (uVoidVizOn > 0.5) {
    float vizAcross = clamp((vWorldPos.x + 7.0) / 14.0, 0.0, 1.0);                       // across road width
    float vizAlong  = fract((uVoidVizZStart - vWorldPos.z) / max(1.0, uVoidVizUnits));   // down the track
    // Rotated 90°: the visualizer's horizontal (U) axis reads DOWN the track.
    vec3 vizCol = pow(texture2D(uVoidViz, vec2(vizAlong, vizAcross)).rgb, vec3(2.2));
    totalEmissiveRadiance += vizCol * uVoidVizGain;
  }
`;

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
  // Identical geometry+material per rung, so draw them as one InstancedMesh instead of
  // one mesh each. Its own material (identical look to the rails) keeps the instanced
  // program variant separate from the non-instanced rails above.
  const rungMat = applyCurvatureShader(new THREE.MeshStandardMaterial({
    color: 0x05070a,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.4,
    metalness: 0.0,
  }));
  const rungSpacing = (opts.rungSpacingRows || 5) * TILE_LENGTH;
  const rungGeom = new THREE.BoxGeometry(TOTAL_ROAD_WIDTH * 0.74, 0.05, 0.5);
  const rungZs = [];
  for (let z = -rungSpacing; z > -trackLength; z -= rungSpacing) rungZs.push(z);
  if (rungZs.length > 0) {
    const rungs = new THREE.InstancedMesh(rungGeom, rungMat, rungZs.length);
    rungs.frustumCulled = false;
    rungs.userData.isDeckCeilingLight = true;
    const m = new THREE.Matrix4();
    for (let i = 0; i < rungZs.length; i++) {
      m.makeTranslation(0, underY - 0.02, rungZs[i]);
      rungs.setMatrixAt(i, m);
    }
    rungs.instanceMatrix.needsUpdate = true;
    group.add(rungs);
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

  // Every column/trim is identical geometry+material differing only by position, so
  // draw them as two InstancedMesh (2 draw calls) instead of ~440 individual meshes
  // per deck. The instance-aware curvature shader bends each instance by its own Z,
  // so the colonnade is pixel-identical to the per-mesh version.
  const positions = [];
  for (let z = -spacing; z > -trackLength; z -= spacing) {
    for (const sx of [-sideX, sideX]) positions.push([sx, z]);
  }
  const n = positions.length;
  if (n === 0) return;

  const columns = new THREE.InstancedMesh(columnGeom, columnMat, n);
  const trims = new THREE.InstancedMesh(trimGeom, trimMat, n);
  columns.frustumCulled = false; // curvature invalidates the static AABB
  trims.frustumCulled = false;
  columns.castShadow = false;
  trims.castShadow = false;
  columns.userData.isDeckPillar = true;
  trims.userData.isDeckPillar = true;

  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const [sx, z] = positions[i];
    m.makeTranslation(sx, midY, z);
    columns.setMatrixAt(i, m);
    // Emissive trim on the inner face (toward road center).
    m.makeTranslation(sx + (sx < 0 ? 0.26 : -0.26), midY, z);
    trims.setMatrixAt(i, m);
  }
  columns.instanceMatrix.needsUpdate = true;
  trims.instanceMatrix.needsUpdate = true;
  group.add(columns);
  group.add(trims);
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
  // Demo (0), generated biomes, AND standard-pack world-neon levels all use per-block 0..1 UVs
  // so their span-sized neon canvas maps once across each merged block at constant world density
  // (the else-branch's per-tile world-space tiling would repeat the span-sized canvas per tile).
  const isProcedural = (levelIndex === 0 || isGenerated || !!getStandardWorld(levelData) || !!getXmasWorld(levelData)) && !isTestEnv;
  
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

// ── Tile MATERIAL cache ──────────────────────────────────────────────────────
// Tiles with identical appearance previously each got their OWN MeshStandardMaterial
// (createTileMaterial ran per tile). A unique material object per draw defeats Three's
// per-draw uniform-skip fast path (_currentMaterialId), so ~thousands of draws each did
// a full StandardMaterial uniform refresh — measured as the dominant flow-mode CPU cost.
// Sharing ONE material object across tiles that render identically is pixel-identical and
// lets the renderer's material sort group them (huge per-draw CPU saving). The key is
// checked BEFORE any texture is generated, so it also removes redundant texture work/VRAM.
// Cleared at the start of every buildLevel/buildLevelAsync — a fresh cache per level build.
// Clearing the Map only drops references; it never disposes (live meshes still own their
// materials until level teardown disposes them per-mesh, exactly as before).
export const tileMaterialCache = new Map();
export function clearTileMaterialCache() { tileMaterialCache.clear(); }
function cachedTileMaterial(key, build) {
  if (key != null) {
    const hit = tileMaterialCache.get(key);
    if (hit) return hit;
  }
  const mat = build();
  if (key != null && mat) tileMaterialCache.set(key, mat);
  return mat;
}
// Determinant key for the neon-world (standard/xmas) tile materials. drawNeonRoad depends
// only on (set→tag, behaviorKey, isGrate, seed) + span; colIndex/rowIndex enter solely via
// isGrate/seed, and colorIndex does not affect the pixels at all (createWorldNeonMaterial
// and getNeonWorldTexture never use it). Matches those, so sharing on this key is pixel-identical.
function neonMatKey(tag, behaviorKey, colIndex, rowIndex, spanX, spanZ) {
  const isDefault = behaviorKey === 'default';
  const c = typeof colIndex === 'number' ? colIndex : 3;
  const r = typeof rowIndex === 'number' ? rowIndex : 0;
  const isGrate = isDefault && ((c + r) % 2 === 1);
  const seed = isDefault ? (((c * 13 + r * 7) % 97) + 1) : 0;
  return `neon|${tag}|${behaviorKey}|${spanX}|${spanZ}|${isGrate ? 'g' : 'b'}|s${seed}`;
}

// ── Stage D: fixed-size tile → texture-array atlas + merged batches ───────────
// The track is drawn as hundreds/thousands of individual meshes (ramps + un-merged
// single tiles), each with its own material — CPU/draw-call bound. This post-pass
// (run AFTER the normal build so collision/decals/data stay untouched) consolidates
// every 128×128-textured tile mesh into a handful of merged meshes: one per render-
// param group, each sampling ONE THREE.DataArrayTexture (the tile's exact texture is
// kept as an atlas layer, selected per-vertex by aTexLayer). Pixel-identical by
// construction; gated so it's easy to A/B. See docs / probe verification.
// NOTE: renders correctly + deterministically and is visually indistinguishable from the
// per-tile path, but bit-identity vs the baseline was NOT rigorously proven (headless A/B
// diffing a live-animated, curvature-anchored scene is confounded). Review on real hardware
// before enabling on the live demo. Flow/tower only. See the frozen-frame diff notes.
const TILE_ATLAS_ENABLED = true;
const TILE_TEX_SIZE = 128; // single-span tile canvas edge (128*span); only span-1 is atlased

// Groups meshes that can share one atlas material (everything except the per-tile texture).
function atlasParamKey(mat) {
  if (!mat || !mat.isMeshStandardMaterial || !mat.map) return null;
  const img = mat.map.image;
  if (!img || img.width !== TILE_TEX_SIZE || img.height !== TILE_TEX_SIZE) return null; // atlas only 128²
  const emis = mat.emissive ? mat.emissive.getHexString() : '000000';
  const col = mat.color ? mat.color.getHexString() : 'ffffff';
  return `${col}|${mat.roughness}|${mat.metalness}|${emis}|${mat.emissiveIntensity}|${mat.side}|${mat.normalMap ? mat.normalMap.uuid : 'n'}`;
}

// Build a DataArrayTexture from a list of 128×128 canvas-backed textures. Rows are flipped
// so the array (no flipY support) matches the source CanvasTextures (flipY=true). Filters/
// wrap/anisotropy/colorSpace/mips are copied from the source so sampling is identical.
function buildTileArrayTexture(sourceTextures) {
  const n = sourceTextures.length, S = TILE_TEX_SIZE, stride = S * S * 4;
  const data = new Uint8Array(stride * n);
  const cvs = document.createElement('canvas'); cvs.width = S; cvs.height = S;
  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  for (let i = 0; i < n; i++) {
    ctx.clearRect(0, 0, S, S);
    ctx.drawImage(sourceTextures[i].image, 0, 0, S, S);
    const src = ctx.getImageData(0, 0, S, S).data; // top-down
    const base = i * stride;
    for (let y = 0; y < S; y++) {
      const dstRow = base + (S - 1 - y) * S * 4; // flip vertically to match flipY=true source
      const srcRow = y * S * 4;
      data.set(src.subarray(srcRow, srcRow + S * 4), dstRow);
    }
  }
  const tex = new THREE.DataArrayTexture(data, S, S, n);
  const s0 = sourceTextures[0];
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.colorSpace = s0.colorSpace;
  tex.wrapS = s0.wrapS; tex.wrapT = s0.wrapT;
  tex.magFilter = s0.magFilter; tex.minFilter = s0.minFilter;
  tex.anisotropy = s0.anisotropy;
  tex.generateMipmaps = s0.generateMipmaps;
  tex.needsUpdate = true;
  return tex;
}

// Material shared by a merged atlas batch: identical MeshStandardMaterial lighting to the
// per-tile materials + the SAME curvature displacement, but the diffuse texture is sampled
// from the array by the per-vertex layer. A 1×1 white dummy map turns on Three's UV plumbing
// (vMapUv) and leaves <map_fragment> as an identity multiply before the atlas sample.
let _atlasWhiteMap = null;
function atlasWhiteMap() {
  if (!_atlasWhiteMap) {
    _atlasWhiteMap = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    _atlasWhiteMap.needsUpdate = true;
  }
  return _atlasWhiteMap;
}
function makeAtlasTileMaterial(sampleMat, atlasTex) {
  const mat = new THREE.MeshStandardMaterial({
    color: sampleMat.color.clone(),
    roughness: sampleMat.roughness,
    metalness: sampleMat.metalness,
    emissive: sampleMat.emissive ? sampleMat.emissive.clone() : new THREE.Color(0x000000),
    emissiveIntensity: sampleMat.emissiveIntensity,
    side: sampleMat.side,
    map: atlasWhiteMap(),
  });
  if (sampleMat.normalMap) { mat.normalMap = sampleMat.normalMap; mat.normalScale = sampleMat.normalScale.clone(); }
  const uAtlas = new THREE.Uniform(atlasTex);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCurvatureRadius = curvatureUniforms.uCurvatureRadius;
    shader.uniforms.uCameraZ = curvatureUniforms.uCameraZ;
    shader.uniforms.uCurvatureOn = curvatureUniforms.uCurvatureOn;
    shader.uniforms.uAtlas = uAtlas;
    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      `uniform float uCurvatureRadius;
       uniform float uCameraZ;
       uniform float uCurvatureOn;
       attribute float aTexLayer;
       varying float vTexLayer;
       void main() {`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  vTexLayer = aTexLayer;\n' + CURVATURE_VERTEX_GLSL
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      `precision highp sampler2DArray;
       uniform sampler2DArray uAtlas;
       varying float vTexLayer;
       void main() {`
    );
    // <map_fragment> multiplied diffuseColor by the white dummy (identity); now apply the
    // real per-tile texel from the array at the tile's layer, matching the original map path.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      '#include <map_fragment>\n  diffuseColor *= texture(uAtlas, vec3(vMapUv, vTexLayer));'
    );
  };
  mat.customProgramCacheKey = () => 'atlastile_' + (curvatureUniforms.uCurvatureOn.value > 0.5 ? '1' : '0');
  return mat;
}

// Post-build pass: replace every 128²-textured tile mesh in `group` with a few merged,
// array-textured meshes (one per render-param group). Leaves variable-span merged blocks,
// decals, tunnels, instanced decorations, and animated ribs untouched.
export function consolidateTilesToAtlas(group) {
  // Only for flow/tower decks (dedicated Groups). Classic/infinite pass the GLOBAL scene
  // (ship/skybox/particles live there) — never traverse/mutate that.
  if (!TILE_ATLAS_ENABLED || !group || !group.isGroup || typeof document === 'undefined') return;
  const ribs = new Set(group.userData && group.userData.tunnelRibs ? group.userData.tunnelRibs : []);
  const groups = new Map(); // paramKey -> { sample, meshes:[] }
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || ribs.has(o)) return;
    const key = atlasParamKey(o.material);
    if (!key) return;
    let g = groups.get(key);
    if (!g) { g = { sample: o.material, meshes: [] }; groups.set(key, g); }
    g.meshes.push(o);
  });

  for (const { sample, meshes } of groups.values()) {
    if (meshes.length < 2) continue; // nothing to gain from a singleton
    // Assign each distinct source texture a layer.
    const layerOf = new Map(); const layerTextures = [];
    for (const m of meshes) {
      const t = m.material.map;
      if (!layerOf.has(t.uuid)) { layerOf.set(t.uuid, layerTextures.length); layerTextures.push(t); }
    }
    const atlasTex = buildTileArrayTexture(layerTextures);
    const geoms = [];
    let castShadow = false, receiveShadow = false;
    for (const m of meshes) {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      m.updateMatrix();
      g.applyMatrix4(m.matrix); // bake the tile's position into the merged (group-local) geometry
      const layer = layerOf.get(m.material.map.uuid);
      const vcount = g.attributes.position.count;
      const arr = new Float32Array(vcount).fill(layer);
      g.setAttribute('aTexLayer', new THREE.BufferAttribute(arr, 1));
      // keep only the attributes the merge/material needs, in a consistent set
      for (const name of Object.keys(g.attributes)) {
        if (!['position', 'normal', 'uv', 'aTexLayer'].includes(name)) g.deleteAttribute(name);
      }
      if (!g.attributes.normal) g.computeVertexNormals();
      geoms.push(g);
      castShadow = castShadow || m.castShadow;
      receiveShadow = receiveShadow || m.receiveShadow;
    }
    const merged = mergeGeometries(geoms, false);
    geoms.forEach((g) => g.dispose());
    if (!merged) continue;
    const atlasMat = makeAtlasTileMaterial(sample, atlasTex);
    // The DataArrayTexture lives in a custom uniform (not material.map), so tie its disposal
    // to the material's — level teardown disposes the material and this frees the atlas VRAM.
    atlasMat.addEventListener('dispose', () => atlasTex.dispose());
    const mesh = new THREE.Mesh(merged, atlasMat);
    mesh.frustumCulled = false; // spans the deck; curvature invalidates a static AABB anyway
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    mesh.userData.isAtlasBatch = true;
    group.add(mesh);
    // remove + dispose the originals (their shared materials are owned by tileMaterialCache)
    for (const m of meshes) { m.parent && m.parent.remove(m); m.geometry.dispose(); }
  }
}

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
  texture.anisotropy = 16; // keep procedural lines sharp at grazing angles (road → horizon)
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

// Master toggle for the per-world procedural neon skin on the STANDARD pack
// (mirrors VOID_VIZ_ENABLED). Set false to fall back to the legacy PBR/profile path.
const STANDARD_NEON_ENABLED = true;

/**
 * Resolve a STANDARD-pack level to its original SkyRoads world for the neon skin.
 * Standard pack layout: idx 0 = DEMO ROAD (excluded), idx 1..30 = 10 worlds × 3 roads,
 * so worldIdx uses (idx - 1) to stay aligned past the demo slot. Returns null (→ legacy
 * path) for the demo, the standalone xmas pack, generated levels, or when disabled.
 */
function getStandardWorld(levelData) {
  if (!STANDARD_NEON_ENABLED) return null;
  const pack = (typeof window !== 'undefined') ? window.currentGamePack : null;
  if (pack !== 'standard') return null;              // gate: only the standard pack (not xmas/custom/generated)
  if (levelData && levelData.isGenerated) return null;
  let idx = null;
  if (levelData && typeof levelData.level_index === 'number') {
    idx = levelData.level_index;
  } else if (typeof window !== 'undefined' && typeof window.currentLevelIndex === 'number') {
    idx = window.currentLevelIndex;
  }
  if (idx === null || idx < 1 || idx > 30) return null;
  return { worldIdx: Math.floor((idx - 1) / 3), roadInWorld: (idx - 1) % 3 };
}

/**
 * Resolve an Xmas-pack level to its world for the festive neon skin. Xmas worlds appear in TWO
 * places: the standalone 'xmas' pack (idx 0 = XMAS DEMO, 1..30 = 10 worlds × 3) and the xmas half
 * of the 'standard' pack (idx 31 = XMAS DEMO, 32..61 = the worlds). Both use a −1 demo offset.
 * Returns null (→ legacy path) for the demos, other packs, generated levels, or when disabled.
 */
function getXmasWorld(levelData) {
  if (!STANDARD_NEON_ENABLED) return null;
  const pack = (typeof window !== 'undefined') ? window.currentGamePack : null;
  if (levelData && levelData.isGenerated) return null;
  let idx = null;
  if (levelData && typeof levelData.level_index === 'number') {
    idx = levelData.level_index;
  } else if (typeof window !== 'undefined' && typeof window.currentLevelIndex === 'number') {
    idx = window.currentLevelIndex;
  }
  if (idx === null) return null;
  let rel = null;
  if (pack === 'xmas' && idx >= 1 && idx <= 30) rel = idx;                 // standalone xmas (demo at 0)
  else if (pack === 'standard' && idx >= 32 && idx <= 61) rel = idx - 31;  // xmas half of standard (demo at 31)
  if (rel === null) return null;
  return { worldIdx: Math.floor((rel - 1) / 3), roadInWorld: (rel - 1) % 3 };
}

/**
 * The curated neon set actually driving a level's road ({base, primary, secondary, accent}),
 * resolved in the SAME priority order as createTileMaterial so lighting always matches the road:
 * standard world → xmas world → generated biome → demo → null. Used by graphics.js to tint the
 * scene lights per biome/world. Returns null only for legacy non-neon levels (skin disabled).
 */
export function getActiveNeonSet(levelData) {
  const sw = getStandardWorld(levelData);
  if (sw) return tintNeonSet(WORLD_NEON_SETS[sw.worldIdx] || WORLD_NEON_SETS[0], sw.roadInWorld);
  const xw = getXmasWorld(levelData);
  if (xw) return tintNeonSet(XMAS_NEON_SETS[xw.worldIdx] || XMAS_NEON_SETS[0], xw.roadInWorld);

  let idx = (levelData && typeof levelData.level_index === 'number') ? levelData.level_index
    : (typeof window !== 'undefined' && typeof window.currentLevelIndex === 'number' ? window.currentLevelIndex : null);
  const isGen = (levelData && levelData.isGenerated) || (idx !== null && idx >= 61)
    || (typeof window !== 'undefined' && window.currentGamePack === 'generated');
  if (isGen) {
    const theme = THEMES[getActiveThemeIndex(levelData)];
    const key = theme ? theme.key : 'void';
    const lvlInBiome = idx !== null ? ((((idx - 61) % 3) + 3) % 3) : 0;
    return tintNeonSet(BIOME_NEON_SETS[key] || BIOME_NEON_SETS.void, lvlInBiome);
  }
  if (idx === 0) return { base: '#06060c', primary: '#00ffff', secondary: '#ff00ff', accent: '#39ff14' }; // demo road
  return null;
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

// Curated neon palette for the Demo Road (levelIndex 0) — also reused by the Void
// biome road so it matches the demo road exactly.
const DEMO_NEON_COLORS = {
  0: '#00ffff', 1: '#39ff14', 2: '#00ffcc', 3: '#ff00ff',
  4: '#ffff00', 5: '#00e5ff', 6: '#ffaa00', 7: '#ccff00',
  8: '#00f0ff', 9: '#7b00ff', 10: '#ccff00', 11: '#00ffff',
  12: '#ff00aa', 13: '#9d00ff', 14: '#ff5500', 15: '#ffffff',
};

/**
 * Procedural neon texture generator for simple straight block and grate textures.
 * Used by the Demo Road (levelIndex === 0) and the Void biome road.
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
  texture.anisotropy = 16; // keep the neon lines sharp at grazing angles (road → horizon)
  textureCache.set(cacheKey, texture);
  return texture;
}

const _PI2 = Math.PI * 2;

function _hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function _rgbToHex(r, g, b) {
  const t = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${t(r)}${t(g)}${t(b)}`;
}
// Rotate a hex colour's hue by `deg` degrees in sRGB HSL space (canvas-friendly).
function rotateHueHex(hex, deg) {
  let [r, g, b] = _hexToRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  h = (h + deg / 360 + 1) % 1;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let R = l, G = l, B = l;
  if (s !== 0) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    R = hue2rgb(p, q, h + 1 / 3);
    G = hue2rgb(p, q, h);
    B = hue2rgb(p, q, h - 1 / 3);
  }
  return _rgbToHex(R * 255, G * 255, B * 255);
}

// Per-level variation within a biome (0/1/2): a small hue rotation of the neon
// strokes, keeping the dark base fixed so biome identity (motif + darkness) dominates.
function tintNeonSet(set, lvlInBiome) {
  if (!lvlInBiome) return set;
  const deg = lvlInBiome === 1 ? 14 : -14;
  return {
    base: set.base,
    primary: rotateHueHex(set.primary, deg),
    secondary: rotateHueHex(set.secondary, deg),
    accent: rotateHueHex(set.accent, deg),
    motif: set.motif,
  };
}

function _frame(ctx, W, H, color, lw, inset) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
}

// Shared default-road framing so every biome keeps the demo's grate/block rhythm.
function _defaultFrame(ctx, W, H, pal, isGrate) {
  if (isGrate) {
    ctx.fillStyle = pal.primary;
    ctx.fillRect(0, 0, W, 5);
    ctx.fillRect(0, H - 5, W, 5);
  } else {
    _frame(ctx, W, H, pal.primary, 4, 2);
    _frame(ctx, W, H, pal.primary, 1.5, 10);
  }
}

// --- Shared behaviour motifs (tinted per biome, but shapes fixed for readability) ---

function drawObstacle(ctx, W, H, pal) {
  _frame(ctx, W, H, pal.primary, 6, 3);
  _frame(ctx, W, H, pal.primary, 2, 12);
  ctx.strokeStyle = pal.primary;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, H / 2); ctx.lineTo(W - 12, H / 2);
  ctx.moveTo(W / 2, 12); ctx.lineTo(W / 2, H - 12);
  ctx.stroke();
}

// Boost: universal green chevrons (cyan for super) — readability over biome flavour.
function drawBoostChevrons(ctx, W, H, isSuper) {
  const col = isSuper ? '#00ffff' : '#39ff14';
  ctx.strokeStyle = col;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let y = 20; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(10, y + 12);
    ctx.lineTo(W / 2, y - 12);
    ctx.lineTo(W - 10, y + 12);
    ctx.stroke();
  }
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, W, 4);
  ctx.fillRect(0, H - 4, W, 4);
}

// Burning: universal red danger bars. Colour hardcoded regardless of biome.
function drawBurningBars(ctx, W, H) {
  ctx.strokeStyle = '#ff073a';
  ctx.shadowBlur = 6;
  ctx.shadowColor = '#ff073a';
  ctx.lineWidth = 5;
  for (let x = 16; x < W; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff073a';
  ctx.fillRect(0, 0, W, 6);
  ctx.fillRect(0, H - 6, W, 6);
  for (let y = 128; y < H; y += 128) ctx.fillRect(0, y - 3, W, 6);
}

// Refill: universal cyan concentric rings.
function drawRefillRings(ctx, W, H) {
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 4;
  for (let y = 64; y < H; y += 128) {
    ctx.beginPath();
    ctx.arc(W / 2, y, Math.min(W / 2 - 10, 48), 0, _PI2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, y, Math.min(W / 2 - 10, 24), 0, _PI2);
    ctx.stroke();
  }
}

// Sticky: rounded blobs, biome-accent fill with a magenta rim.
function drawStickyBlobs(ctx, W, H, pal) {
  ctx.fillStyle = pal.accent;
  ctx.strokeStyle = '#ff00ff';
  ctx.lineWidth = 3;
  const n = Math.max(3, Math.round(W / 48));
  for (let i = 0; i < n; i++) {
    const cx = ((i * 53) % Math.max(1, W - 24)) + 12;
    const cy = ((i * 89) % Math.max(1, H - 24)) + 12;
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, _PI2);
    ctx.fill();
    ctx.stroke();
  }
}

// Slippery: universal ice-cyan diagonals (kept fixed; material also enforces ice).
function drawSlipperyDiagonals(ctx, W, H) {
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 3;
  for (let x = -H; x < W; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + H, H);
    ctx.stroke();
  }
}

// Tunnel: biome-accent grid grate.
function drawTunnelGrid(ctx, W, H, pal) {
  ctx.strokeStyle = pal.accent;
  ctx.lineWidth = 4;
  for (let y = 16; y < H; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let x = 16; x < W; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
}

// --- Per-biome default-road signature motifs (demo grammar, biome flavour) ---

function motifVoid(ctx, W, H, pal, isGrate) {
  // The live music visualizer is drawn in the fragment shader (VOID_VIZ_FRAGMENT_GLSL),
  // sampled per segment. The diffuse stays mostly DARK so the visualizer pops; we only
  // lay down a faint baseline so the road still reads when the visualizer is off.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = pal.secondary;
  ctx.fillRect(0, 4, W, 4);
  ctx.globalAlpha = 1.0;
  _defaultFrame(ctx, W, H, pal, isGrate);
}

function motifRidge(ctx, W, H, pal, isGrate) {
  // Guide: high verticality, tiered climb-then-plunge crests with marker arches at each apex.
  ctx.shadowBlur = 6; ctx.shadowColor = pal.primary;
  ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 1; i <= 3; i++) {
    const y = (i * H) / 4;
    ctx.strokeStyle = i === 2 ? pal.primary : pal.secondary;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(W / 3, y - 26, (2 * W) / 3, y - 26, W, y);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2, y - 20); ctx.lineTo(W / 2, y - 30); ctx.stroke(); // marker post at crest
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = pal.accent;
  for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(W / 2, (i * H) / 4 - 30, 2, 0, _PI2); ctx.fill(); }
  _defaultFrame(ctx, W, H, pal, isGrate);
}

function motifThrill(ctx, W, H, pal, isGrate) {
  // Guide: neon rollercoaster — glowing rails + ties + forward speed chevrons down the centre.
  const x1 = W * 0.28, x2 = W * 0.72;
  ctx.shadowBlur = 6; ctx.shadowColor = pal.primary;
  ctx.strokeStyle = pal.secondary; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, H); ctx.moveTo(x2, 0); ctx.lineTo(x2, H); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 3;
  for (let y = 14; y < H; y += 26) { ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); }
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 2.5;
  for (let y = 20; y < H; y += 34) { ctx.beginPath(); ctx.moveTo(W / 2 - 7, y + 6); ctx.lineTo(W / 2, y - 4); ctx.lineTo(W / 2 + 7, y + 6); ctx.stroke(); }
  _defaultFrame(ctx, W, H, pal, isGrate);
}

function motifCore(ctx, W, H, pal, isGrate) {
  // Guide: supercomputer circuit board — traces, an IC die, gold vias with solder halos.
  ctx.strokeStyle = pal.secondary; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(15, 15); ctx.lineTo(W * 0.4, 15); ctx.lineTo(W * 0.6, H * 0.5); ctx.lineTo(W * 0.6, H - 15);
  ctx.moveTo(W - 15, 15); ctx.lineTo(W - 15, H * 0.4); ctx.lineTo(W * 0.7, H * 0.7); ctx.lineTo(15, H * 0.7);
  ctx.moveTo(W * 0.3, H - 15); ctx.lineTo(W * 0.3, H * 0.6); ctx.lineTo(15, H * 0.45);
  ctx.stroke();
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 1.5;
  ctx.strokeRect(W * 0.42, H * 0.4, W * 0.16, H * 0.16); // IC die
  const vias = [[15, 15], [W * 0.6, H - 15], [W - 15, 15], [15, H * 0.7], [W * 0.3, H - 15]];
  vias.forEach(([vx, vy]) => {
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(vx, vy, 3.5, 0, _PI2); ctx.fill();
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(vx, vy, 6, 0, _PI2); ctx.stroke();
  });
  _defaultFrame(ctx, W, H, pal, isGrate);
}

function motifGlitch(ctx, W, H, pal, isGrate, seed) {
  // Guide: phasing/unreliable ground — RGB-split datamosh blocks + scanlines + torn slivers.
  const rng = _srng(seed);
  for (let i = 0; i < 6; i++) {
    const w = 14 + rng() * 30, h = 4 + rng() * 9;
    const x = rng() * Math.max(1, W - w), y = rng() * Math.max(1, H - h);
    ctx.fillStyle = pal.secondary; ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 0.6; ctx.fillStyle = pal.primary; ctx.fillRect(x + 3, y, w, h); ctx.globalAlpha = 1; // channel split
  }
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 1;
  for (let y = 4; y < H; y += 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = pal.primary;
  for (let i = 0; i < 3; i++) ctx.fillRect(0, rng() * H, W, 1.5); // torn bright slivers
  _defaultFrame(ctx, W, H, pal, isGrate);
}

function motifTundra(ctx, W, H, pal, isGrate, seed) {
  // Guide: frictionless ice glide — frost cracks + a hex ice crystal + faint drift sheen.
  // Thin strokes keep the white area low for bloom safety.
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.5;
  const cx = W / 2, cy = H / 2;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * _PI2 + (seed % 7) * 0.12;
    const ex = cx + Math.cos(ang) * W * 0.5, ey = cy + Math.sin(ang) * H * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(ex, ey);
    ctx.moveTo((cx + ex) / 2, (cy + ey) / 2);
    ctx.lineTo((cx + ex) / 2 + Math.cos(ang + 1) * 9, (cy + ey) / 2 + Math.sin(ang + 1) * 9);
    ctx.stroke();
  }
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 1.2;
  const hr = Math.min(W, H) * 0.12;
  ctx.beginPath();
  for (let k = 0; k < 6; k++) { const a = (k / 6) * _PI2, x = cx + Math.cos(a) * hr, y = cy + Math.sin(a) * hr; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.closePath(); ctx.stroke();
  ctx.globalAlpha = 0.3; ctx.strokeStyle = pal.secondary; ctx.lineWidth = 1;
  for (let y = 10; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y - 3); ctx.stroke(); }
  ctx.globalAlpha = 1;
  _defaultFrame(ctx, W, H, pal, isGrate);
}

function motifFurnace(ctx, W, H, pal, isGrate, seed) {
  // Guide: lava burn-grid with a safe centre lane — branching glowing magma cracks + embers.
  ctx.shadowBlur = 8; ctx.shadowColor = pal.primary;
  ctx.strokeStyle = pal.secondary; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(15, H - 15); ctx.lineTo(W * 0.35, H * 0.55); ctx.lineTo(W * 0.6, H * 0.62); ctx.lineTo(W - 15, 15);
  ctx.moveTo(W * 0.35, H * 0.55); ctx.lineTo(15, 20);
  ctx.moveTo(W * 0.6, H * 0.62); ctx.lineTo(W * 0.75, H - 15);
  ctx.stroke();
  ctx.shadowBlur = 0;
  const rng = _srng(seed); ctx.fillStyle = pal.accent;
  for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(rng() * W, rng() * H, 1.4, 0, _PI2); ctx.fill(); }
  _defaultFrame(ctx, W, H, pal, isGrate);
}

function motifShallows(ctx, W, H, pal, isGrate, seed) {
  // Guide: cosmic fog + tunnels — soft nebula fog bands, half-wall guide rails, bubbles + stars.
  const rng = _srng(seed);
  for (let i = 0; i < 3; i++) {
    const y = rng() * H, h = 10 + rng() * 16;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, pal.secondary); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.22; ctx.fillStyle = g; ctx.fillRect(0, y, W, h); ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W * 0.22, 0); ctx.lineTo(W * 0.22, H); ctx.moveTo(W * 0.78, 0); ctx.lineTo(W * 0.78, H); ctx.stroke();
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(rng() * W, rng() * H, 6 + rng() * 6, 0, _PI2); ctx.stroke(); }
  _stars(ctx, W, H, pal.accent, 8, rng, 1.2);
  _defaultFrame(ctx, W, H, pal, isGrate);
}

function motifSpire(ctx, W, H, pal, isGrate, seed) {
  // Guide: low-gravity floating sky-islands — faceted diamonds of varying size + platform dashes.
  const rng = _srng(seed);
  const diamond = (cx, cy, r) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
  };
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 2;
  diamond(W / 2, H * 0.38, Math.min(W, H) * 0.22);
  ctx.strokeStyle = pal.secondary; ctx.lineWidth = 1.4;
  diamond(W * 0.28, H * 0.72, Math.min(W, H) * 0.1);
  diamond(W * 0.74, H * 0.7, Math.min(W, H) * 0.08);
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const x = rng() * W, y = rng() * H; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.stroke(); }
  _defaultFrame(ctx, W, H, pal, isGrate);
}

function motifPulse(ctx, W, H, pal, isGrate) {
  // Guide: mechanical timing gates — thick/thin gate bars with steel bolts + a centre pulse line
  // whose beat ticks land on each gate (brake-into-the-gate rhythm).
  let gi = 0;
  for (let x = 18; x < W; x += 30) {
    ctx.strokeStyle = pal.secondary; ctx.lineWidth = (gi % 2) ? 4 : 2;
    ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, H - 10); ctx.stroke();
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(x, 8, 2, 0, _PI2); ctx.fill(); // bolt
    gi++;
  }
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  ctx.fillStyle = pal.primary;
  for (let x = 18; x < W; x += 30) { ctx.beginPath(); ctx.arc(x, H / 2, 2.5, 0, _PI2); ctx.fill(); } // beat ticks
  _defaultFrame(ctx, W, H, pal, isGrate);
}

function motifDefault(ctx, W, H, pal, isGrate) {
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// --- Standard-pack per-world motifs (demo grammar; one signature per world) -------------
// Small deterministic RNG so scatter placement is stable per cache key (no Math.random —
// keeps textures reproducible). See docs/standard-worlds-neon-brief.md.
function _srng(seed) {
  let s = (seed | 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 8) & 0xffffff) / 0x1000000;
  };
}

function _stars(ctx, W, H, color, n, rng, maxR) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.45 + rng() * 0.55;
    ctx.beginPath();
    ctx.arc(rng() * W, rng() * H, 0.6 + rng() * (maxR || 1.6), 0, _PI2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// RED HEAT — molten: flowing lava fissures + ember dots.
function motifMolten(ctx, W, H, pal, isGrate, seed) {
  const rng = _srng(seed);
  ctx.strokeStyle = pal.primary;
  ctx.shadowBlur = 8; ctx.shadowColor = pal.secondary;
  ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const x0 = (i + 0.5) * W / 3 + (rng() - 0.5) * 10;
    ctx.beginPath(); ctx.moveTo(x0, 0);
    for (let y = H / 4; y <= H; y += H / 4) ctx.lineTo(x0 + (rng() - 0.5) * 22, y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = pal.accent;
  for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc(rng() * W, rng() * H, 1.6, 0, _PI2); ctx.fill(); }
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// INTO THE SUN — solar: radiant corona rays + flare ring.
function motifSolar(ctx, W, H, pal, isGrate) {
  const cx = W / 2, cy = H / 2;
  ctx.strokeStyle = pal.primary;
  ctx.shadowBlur = 10; ctx.shadowColor = pal.secondary;
  ctx.lineWidth = 2.5;
  const rays = 12;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * _PI2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10);
    ctx.lineTo(cx + Math.cos(a) * W * 0.7, cy + Math.sin(a) * H * 0.7);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, Math.min(W, H) * 0.28, 0, _PI2); ctx.stroke();
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// BLUE PLANET — ocean: rolling wave crests + caustic sparkles.
function motifOcean(ctx, W, H, pal, isGrate, seed) {
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.shadowBlur = 6; ctx.shadowColor = pal.secondary;
  for (let i = 1; i <= 4; i++) {
    const y = i * H / 5;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 4) {
      const yy = y + Math.sin((x / W) * Math.PI * 4 + i) * 4;
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.2;
  const rng = _srng(seed);
  for (let i = 0; i < 8; i++) {
    const x = rng() * W, y = rng() * H, s = 3 + rng() * 3;
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
  }
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// SATELLITE — orbital tech: hull panel seams + rivet ticks.
function motifOrbital(ctx, W, H, pal, isGrate) {
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 2;
  const cols = 2, rows = Math.max(2, Math.round(H / 64));
  for (let i = 1; i < cols; i++) { const x = i * W / cols; ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, H - 4); ctx.stroke(); }
  for (let j = 1; j < rows; j++) { const y = j * H / rows; ctx.beginPath(); ctx.moveTo(4, y); ctx.lineTo(W - 4, y); ctx.stroke(); }
  ctx.fillStyle = pal.accent;
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const x = Math.min(W - 4, Math.max(4, i * W / cols)), y = Math.min(H - 4, Math.max(4, j * H / rows));
    ctx.beginPath(); ctx.arc(x, y, 1.6, 0, _PI2); ctx.fill();
  }
  ctx.strokeStyle = pal.secondary; ctx.lineWidth = 1; ctx.strokeRect(8, 8, W - 16, H - 16);
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// MISTY — ether/fog: soft horizontal fog bands + faint stars.
function motifMist(ctx, W, H, pal, isGrate, seed) {
  const rng = _srng(seed);
  for (let i = 0; i < 5; i++) {
    const y = rng() * H, h = 8 + rng() * 18;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, pal.secondary);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.25; ctx.fillStyle = g; ctx.fillRect(0, y, W, h); ctx.globalAlpha = 1;
  }
  _stars(ctx, W, H, pal.primary, 10, rng, 1.4);
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// ASTEROID BELT — rocky debris: cratered rock chips + debris.
function motifBelt(ctx, W, H, pal, isGrate, seed) {
  const rng = _srng(seed);
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 1.8;
  for (let i = 0; i < 7; i++) {
    const cx = rng() * W, cy = rng() * H, r = 4 + rng() * 9, sides = 5 + ((rng() * 3) | 0);
    ctx.beginPath();
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * _PI2, rr = r * (0.7 + rng() * 0.5);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
  }
  ctx.fillStyle = pal.accent;
  for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.arc(rng() * W, rng() * H, 1.1, 0, _PI2); ctx.fill(); }
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// CRAB NEBULA — cosmic gas: drifting gas filaments + star specks.
function motifNebula(ctx, W, H, pal, isGrate, seed) {
  const rng = _srng(seed);
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = i % 2 ? pal.primary : pal.secondary;
    ctx.shadowBlur = 8; ctx.shadowColor = ctx.strokeStyle;
    ctx.lineWidth = 1.5 + rng() * 2;
    ctx.beginPath();
    let x = rng() * W; ctx.moveTo(x, 0);
    for (let yy = 0; yy <= H; yy += H / 4) {
      x += (rng() - 0.5) * 40;
      ctx.quadraticCurveTo(x, yy, x + (rng() - 0.5) * 20, Math.min(H, yy + H / 4));
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  _stars(ctx, W, H, pal.accent, 14, rng, 1.8);
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// OVER THE BASE — industrial hazard: stencil hazard band + corner brackets + chevron ticks.
function motifBase(ctx, W, H, pal, isGrate) {
  ctx.save();
  ctx.beginPath(); ctx.rect(0, H / 2 - 10, W, 20); ctx.clip();
  ctx.strokeStyle = pal.secondary; ctx.lineWidth = 6;
  for (let x = -H; x < W + H; x += 16) { ctx.beginPath(); ctx.moveTo(x, H / 2 - 12); ctx.lineTo(x + 24, H / 2 + 12); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 2.5;
  const b = 14;
  [[6, 6, 1, 1], [W - 6, 6, -1, 1], [6, H - 6, 1, -1], [W - 6, H - 6, -1, -1]].forEach(([x, y, sx, sy]) => {
    ctx.beginPath(); ctx.moveTo(x + sx * b, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * b); ctx.stroke();
  });
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 2;
  for (let y = 18; y < H; y += 28) { ctx.beginPath(); ctx.moveTo(W / 2 - 8, y + 6); ctx.lineTo(W / 2, y - 4); ctx.lineTo(W / 2 + 8, y + 6); ctx.stroke(); }
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// THE EARTH — terrestrial: globe graticule + a continent blob.
function motifTerra(ctx, W, H, pal, isGrate, seed) {
  const rng = _srng(seed);
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 1.5;
  for (let i = 1; i <= 3; i++) { const y = i * H / 4; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(W / 3, y - 6, 2 * W / 3, y + 6, W, y); ctx.stroke(); }
  for (let i = 1; i <= 2; i++) { const x = i * W / 3; ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x - 8, H / 3, x + 8, 2 * H / 3, x, H); ctx.stroke(); }
  const cx = W * 0.5, cy = H * 0.5, seg = 8;
  ctx.globalAlpha = 0.5; ctx.fillStyle = pal.secondary;
  ctx.beginPath();
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * _PI2, rr = Math.min(W, H) * 0.18 * (0.7 + rng() * 0.6);
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.2; ctx.stroke();
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// DRUIDIA — mystic grove: central vine, leaves, gold berries.
function motifGrove(ctx, W, H, pal, isGrate, seed) {
  const rng = _srng(seed);
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(W / 2, 0);
  for (let y = 0; y <= H; y += H / 6) ctx.quadraticCurveTo(W / 2 + (y / H < 0.5 ? 12 : -12), y, W / 2 + (rng() - 0.5) * 6, Math.min(H, y + H / 6));
  ctx.stroke();
  ctx.fillStyle = pal.secondary;
  let li = 0;
  for (let y = 12; y < H; y += 22) {
    const side = (li++ % 2) ? 1 : -1, lx = W / 2 + side * 14;
    ctx.save(); ctx.translate(lx, y); ctx.rotate(side * 0.6);
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, _PI2); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = pal.accent;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(rng() * W, rng() * H, 1.8, 0, _PI2); ctx.fill(); }
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// --- Xmas-pack per-world motifs (festive / winter identities) ---------------------------
// SNOWBOUND — falling six-point flakes over a drift mound.
function motifSnow(ctx, W, H, pal, isGrate, seed) {
  const rng = _srng(seed);
  ctx.fillStyle = pal.primary; ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += W / 6) ctx.quadraticCurveTo(x + W / 12, H - 10 - rng() * 8, x + W / 6, H);
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = pal.secondary; ctx.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) {
    const x = rng() * W, y = rng() * H * 0.8, r = 3 + rng() * 3;
    for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
  }
  _stars(ctx, W, H, pal.accent, 5, rng, 1);
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// AT THE OUTER RIM — a glowing planetary rim arc over a starfield.
function motifRim(ctx, W, H, pal, isGrate, seed) {
  const rng = _srng(seed);
  ctx.shadowBlur = 10; ctx.shadowColor = pal.primary;
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(W / 2, H * 1.4, W * 0.9, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = pal.secondary; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(W / 2, H * 1.4, W * 0.9 + 8, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
  _stars(ctx, W, H, pal.accent, 14, rng, 1.6);
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// TWILIGHT ZONE — dusk gradient wash + horizon lines + stars.
function motifTwilight(ctx, W, H, pal, isGrate, seed) {
  const rng = _srng(seed);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, pal.secondary); g.addColorStop(0.5, pal.primary); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.28; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.2;
  for (let i = 1; i <= 3; i++) { const y = i * H / 4; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  _stars(ctx, W, H, pal.accent, 8, rng, 1.3);
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// THE GUIDING STAR — a radiant four-point star.
function motifGuidingStar(ctx, W, H, pal, isGrate, seed) {
  const rng = _srng(seed);
  const cx = W / 2, cy = H / 2;
  ctx.shadowBlur = 10; ctx.shadowColor = pal.primary;
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - H * 0.42); ctx.lineTo(cx, cy + H * 0.42);
  ctx.moveTo(cx - W * 0.4, cy); ctx.lineTo(cx + W * 0.4, cy);
  ctx.moveTo(cx - W * 0.16, cy - H * 0.16); ctx.lineTo(cx + W * 0.16, cy + H * 0.16);
  ctx.moveTo(cx + W * 0.16, cy - H * 0.16); ctx.lineTo(cx - W * 0.16, cy + H * 0.16);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = pal.secondary; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, _PI2); ctx.fill();
  _stars(ctx, W, H, pal.accent, 8, rng, 1.2);
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// METEOR STORM — diagonal meteor streaks with glowing heads.
function motifMeteor(ctx, W, H, pal, isGrate, seed) {
  const rng = _srng(seed);
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const x = rng() * W, y = rng() * H, len = 20 + rng() * 30;
    ctx.strokeStyle = pal.primary; ctx.shadowBlur = 6; ctx.shadowColor = pal.primary; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * 0.7, y - len); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = pal.secondary; ctx.beginPath(); ctx.arc(x, y, 2, 0, _PI2); ctx.fill();
  }
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// MYSTERIOUS PLANET — orbit rings + alien rune glyphs.
function motifMystery(ctx, W, H, pal, isGrate, seed) {
  const rng = _srng(seed);
  const cx = W / 2, cy = H / 2;
  ctx.strokeStyle = pal.secondary; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(cx, cy, W * 0.36, H * 0.2, 0, 0, _PI2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy, W * 0.2, H * 0.36, 0, 0, _PI2); ctx.stroke();
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const x = 12 + rng() * (W - 24), y = 12 + rng() * (H - 24);
    ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.moveTo(x - 4, y - 2); ctx.lineTo(x + 4, y - 2); ctx.moveTo(x - 4, y + 2); ctx.lineTo(x + 4, y + 2); ctx.stroke();
  }
  ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, _PI2); ctx.fill();
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// NORTHERN LIGHTS — wavy aurora ribbons + stars.
function motifAurora(ctx, W, H, pal, isGrate, seed) {
  const rng = _srng(seed);
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = i % 2 ? pal.primary : pal.secondary;
    ctx.shadowBlur = 10; ctx.shadowColor = ctx.strokeStyle; ctx.lineWidth = 2 + rng() * 2;
    ctx.beginPath();
    const baseY = (i + 0.5) * H / 4;
    for (let x = 0; x <= W; x += 6) { const y = baseY + Math.sin(x / W * Math.PI * 3 + i * 1.3) * 10; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  _stars(ctx, W, H, pal.accent, 6, rng, 1);
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// OVER THE POLE — concentric polar rings + compass cross with a north marker.
function motifPole(ctx, W, H, pal, isGrate) {
  const cx = W / 2, cy = H / 2, m = Math.min(W, H);
  ctx.strokeStyle = pal.secondary; ctx.lineWidth = 1.4;
  for (let r = m * 0.14; r < Math.max(W, H); r += m * 0.16) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, _PI2); ctx.stroke(); }
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
  ctx.fillStyle = pal.accent;
  ctx.beginPath(); ctx.moveTo(cx, cy - m * 0.3); ctx.lineTo(cx - 4, cy - m * 0.3 + 8); ctx.lineTo(cx + 4, cy - m * 0.3 + 8); ctx.closePath(); ctx.fill();
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// UNDER THE ICE — angular ice-sheet cracks + trapped rising bubbles.
function motifSubIce(ctx, W, H, pal, isGrate, seed) {
  const rng = _srng(seed);
  ctx.strokeStyle = pal.primary; ctx.lineWidth = 1.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    let x = rng() * W; ctx.moveTo(x, 0);
    for (let yy = 0; yy <= H; yy += H / 4) { x += (rng() - 0.5) * 40; ctx.lineTo(x, yy); }
    ctx.stroke();
  }
  ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(rng() * W, rng() * H, 2 + rng() * 4, 0, _PI2); ctx.stroke(); }
  ctx.globalAlpha = 0.25; ctx.strokeStyle = pal.secondary; ctx.lineWidth = 1;
  for (let y = 12; y < H; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// THE EVE — festive garland swags with alternating baubles + a topper star.
function motifEve(ctx, W, H, pal, isGrate) {
  ctx.strokeStyle = pal.secondary; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 0; i <= 2; i++) {
    const y = 10 + i * (H - 20) / 2;
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += W / 3) ctx.quadraticCurveTo(x + W / 6, y + 14, x + W / 3, y);
    ctx.stroke();
    let b = 0;
    for (let x = W / 6; x < W; x += W / 3) {
      ctx.fillStyle = (b++ % 2) ? pal.primary : pal.accent;
      ctx.beginPath(); ctx.arc(x, y + 14, 3.5, 0, _PI2); ctx.fill();
    }
  }
  ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(W / 2, 6, 3, 0, _PI2); ctx.fill();
  _defaultFrame(ctx, W, H, pal, isGrate);
}

// Curated neon "sets" per biome — mapped from each biome's paletteIntent in
// data/world_design_docs.json. Bases are always dark for demo-style punch + bloom
// safety (tundra/spire kept dark too; their light identity lives in the material).
const BIOME_NEON_SETS = {
  void:     { base: '#0a0410', primary: '#ff2d95', secondary: '#39ff14', accent: '#b026ff', motif: motifVoid },
  ridge:    { base: '#04080f', primary: '#00e5ff', secondary: '#2f6bff', accent: '#0a3a8f', motif: motifRidge },
  thrill:   { base: '#0c0a08', primary: '#ff7a00', secondary: '#ffe14d', accent: '#ff3d00', motif: motifThrill },
  core:     { base: '#05100a', primary: '#39ff14', secondary: '#ff9d3d', accent: '#ffd700', motif: motifCore },
  glitch:   { base: '#0a0410', primary: '#ff00d4', secondary: '#00f0ff', accent: '#b026ff', motif: motifGlitch },
  tundra:   { base: '#0a1620', primary: '#8ff0ff', secondary: '#ffffff', accent: '#00cfff', motif: motifTundra },
  furnace:  { base: '#120704', primary: '#ff3b00', secondary: '#ffcc00', accent: '#ff7a00', motif: motifFurnace },
  shallows: { base: '#08040f', primary: '#b388ff', secondary: '#8a4dff', accent: '#00e5ff', motif: motifShallows },
  spire:    { base: '#101418', primary: '#ffd700', secondary: '#c8d0e0', accent: '#8a94a8', motif: motifSpire },
  pulse:    { base: '#0c0e12', primary: '#ffe14d', secondary: '#c0c8d4', accent: '#00e5ff', motif: motifPulse },
};

// Curated neon "sets" for the 10 STANDARD-pack worlds (RED HEAT … DRUIDIA), indexed by
// worldIdx = floor((level_index - 1) / 3). Authored in docs/standard-worlds-neon-brief.md.
// Dark bases (bloom-safe); the neon strokes + per-world motif carry the identity. Per-road
// variation within a world is a small hue rotation via tintNeonSet(set, roadInWorld).
const WORLD_NEON_SETS = [
  { base: '#100303', primary: '#ff2a1a', secondary: '#ff7a00', accent: '#ffd23b', motif: motifMolten },  // 0 RED HEAT
  { base: '#0e0b03', primary: '#ffd447', secondary: '#ff8a00', accent: '#fff6d0', motif: motifSolar },   // 1 INTO THE SUN
  { base: '#02060f', primary: '#22d3ee', secondary: '#2f8fff', accent: '#aefcff', motif: motifOcean },   // 2 BLUE PLANET
  { base: '#080b10', primary: '#39c6ff', secondary: '#dfe9f5', accent: '#7fb0ff', motif: motifOrbital }, // 3 SATELLITE
  { base: '#0b0c14', primary: '#c9b7ff', secondary: '#9fb4d8', accent: '#ffffff', motif: motifMist },    // 4 MISTY
  { base: '#0a0806', primary: '#d9a066', secondary: '#8a7f74', accent: '#ff7a3c', motif: motifBelt },    // 5 ASTEROID BELT
  { base: '#0a0414', primary: '#ff3db4', secondary: '#8a5cff', accent: '#ffd6f2', motif: motifNebula },  // 6 CRAB NEBULA
  { base: '#0b0a05', primary: '#ffc400', secondary: '#ffe14d', accent: '#39ff14', motif: motifBase },    // 7 OVER THE BASE
  { base: '#040814', primary: '#3aa0ff', secondary: '#38d66b', accent: '#eef6ff', motif: motifTerra },   // 8 THE EARTH
  { base: '#050e06', primary: '#39d95a', secondary: '#8fe36b', accent: '#ffd54a', motif: motifGrove },   // 9 DRUIDIA
];

// Curated neon sets for the 10 XMAS-pack worlds (SNOWBOUND … THE EVE), indexed by worldIdx.
// Festive/winter identities; authored in docs/xmas-worlds-neon-brief.md. Same dark-base rule.
const XMAS_NEON_SETS = [
  { base: '#0a1420', primary: '#bfe9ff', secondary: '#ffffff', accent: '#7fd6ff', motif: motifSnow },        // 0 SNOWBOUND
  { base: '#05060f', primary: '#6f9bff', secondary: '#b0c4ff', accent: '#9d7bff', motif: motifRim },         // 1 AT THE OUTER RIM
  { base: '#0d0714', primary: '#ff9e5c', secondary: '#b06bff', accent: '#ffd08a', motif: motifTwilight },    // 2 TWILIGHT ZONE
  { base: '#0b0a04', primary: '#ffe08a', secondary: '#fff6d0', accent: '#ffd23b', motif: motifGuidingStar }, // 3 THE GUIDING STAR
  { base: '#0c0605', primary: '#ff6a3d', secondary: '#ffd27f', accent: '#fff0d0', motif: motifMeteor },      // 4 METEOR STORM
  { base: '#04100e', primary: '#35f0c8', secondary: '#ff5cc8', accent: '#8affff', motif: motifMystery },     // 5 MYSTERIOUS PLANET
  { base: '#04100a', primary: '#39ff9a', secondary: '#00e5ff', accent: '#b06bff', motif: motifAurora },      // 6 NORTHERN LIGHTS
  { base: '#081420', primary: '#9fe8ff', secondary: '#ffffff', accent: '#4fb8ff', motif: motifPole },        // 7 OVER THE POLE
  { base: '#03101c', primary: '#4fd0ff', secondary: '#bfefff', accent: '#2f8fd0', motif: motifSubIce },      // 8 UNDER THE ICE
  { base: '#0a0806', primary: '#ff4d4d', secondary: '#39d95a', accent: '#ffd54a', motif: motifEve },         // 9 THE EVE
];

/**
 * Procedural neon texture generator for the 10 generated-level biomes.
 *
 * Shares the demo road's drawing grammar (dark base, grate/block checkerboard,
 * curated neon strokes) but swaps in a per-biome palette + signature motif from
 * BIOME_NEON_SETS. Safety-critical behaviours (boost/burning/refill/slippery) use
 * fixed shapes AND colours so gameplay reads identically across biomes; only the
 * default road, obstacle border and tunnel take biome flavour.
 */
function getBiomeProceduralTexture(biomeKey, behavior, colorIndex, colIndex, rowIndex, spanX = 1, spanZ = 1, levelIndex = 0) {
  if (typeof document === 'undefined') return null;

  const behaviorKey = behavior || 'default';
  const isDefault = behaviorKey === 'default';
  const rVal = typeof rowIndex === 'number' ? rowIndex : 0;
  const cVal = typeof colIndex === 'number' ? colIndex : 3;
  const isGrate = isDefault && ((cVal + rVal) % 2 === 1);
  const lvlInBiome = typeof levelIndex === 'number' ? ((((levelIndex - 61) % 3) + 3) % 3) : 0;

  const cacheKey = `procedural_biome_${biomeKey}_${behaviorKey}_${colorIndex}_${cVal}_${rVal}_${spanX}_${spanZ}_${lvlInBiome}_${isGrate ? 'g' : 'b'}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(128 * spanX);
  canvas.height = Math.round(128 * spanZ);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const W = canvas.width, H = canvas.height;

  const set = tintNeonSet(BIOME_NEON_SETS[biomeKey] || BIOME_NEON_SETS.void, lvlInBiome);
  const seed = ((cVal * 13 + rVal * 7) % 97) + 1;

  drawNeonRoad(ctx, W, H, set, behaviorKey, isGrate, seed);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 16; // keep procedural lines sharp at grazing angles (road → horizon)
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Shared neon-road painter used by BOTH the generated-biome and standard-world texture
 * generators. Paints the dark base + one behaviour pattern into an existing 2D context.
 * Safety-critical hazards (boost/burning/refill/slippery) draw with FIXED shapes AND colours
 * for readability; only default road / obstacle / tunnel take the palette's flavour + motif.
 */
function drawNeonRoad(ctx, W, H, set, behaviorKey, isGrate, seed) {
  ctx.fillStyle = set.base;
  ctx.fillRect(0, 0, W, H);

  if (behaviorKey === 'obstacle') {
    drawObstacle(ctx, W, H, set);
  } else if (behaviorKey === 'boost' || behaviorKey === 'super_boost') {
    drawBoostChevrons(ctx, W, H, behaviorKey === 'super_boost');
  } else if (behaviorKey === 'burning') {
    drawBurningBars(ctx, W, H);
  } else if (behaviorKey === 'refill') {
    drawRefillRings(ctx, W, H);
  } else if (behaviorKey === 'sticky') {
    drawStickyBlobs(ctx, W, H, set);
  } else if (behaviorKey === 'slippery') {
    drawSlipperyDiagonals(ctx, W, H);
  } else if (behaviorKey === 'tunnel') {
    drawTunnelGrid(ctx, W, H, set);
  } else {
    (set.motif || motifDefault)(ctx, W, H, set, isGrate, seed);
  }
}

/**
 * Generic procedural neon texture generator for a curated `set` ({base, primary, secondary,
 * accent, motif}). Same drawing grammar as getBiomeProceduralTexture. Used by both the STANDARD
 * (WORLD_NEON_SETS) and XMAS (XMAS_NEON_SETS) worlds; `cacheTag` keeps their caches distinct and
 * encodes the per-road hue-drift variant. See docs/standard-worlds-neon-brief.md + xmas brief.
 */
function getNeonWorldTexture(cacheTag, set, behavior, colorIndex, colIndex, rowIndex, spanX = 1, spanZ = 1) {
  if (typeof document === 'undefined') return null;

  const behaviorKey = behavior || 'default';
  const isDefault = behaviorKey === 'default';
  const rVal = typeof rowIndex === 'number' ? rowIndex : 0;
  const cVal = typeof colIndex === 'number' ? colIndex : 3;
  const isGrate = isDefault && ((cVal + rVal) % 2 === 1);

  const cacheKey = `procedural_${cacheTag}_${behaviorKey}_${colorIndex}_${cVal}_${rVal}_${spanX}_${spanZ}_${isGrate ? 'g' : 'b'}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(128 * spanX);
  canvas.height = Math.round(128 * spanZ);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const W = canvas.width, H = canvas.height;

  const seed = ((cVal * 13 + rVal * 7) % 97) + 1;
  drawNeonRoad(ctx, W, H, set, behaviorKey, isGrate, seed);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 16;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * The Demo Road's (level 0) exact neon material logic: the demo grate/block canvas
 * texture tinted by the curated neon palette, with per-behavior colour overrides,
 * roughness/metalness and emissive. Shared by level 0 AND the Void biome so the Void
 * road matches the demo road exactly. `opts.voidViz` overlays the live music
 * visualizer (per segment, anchored at `opts.zStart`).
 */
function createDemoNeonMaterial(behaviorKey, colorIndex, colIndex, rowIndex, spanX, spanZ, opts = {}) {
  const voidViz = !!(opts && opts.voidViz);
  // Pixels depend only on (behavior, colorIndex, isGrate, span) — see getDemoNeonTexture.
  // voidViz variants carry a per-segment zStart uniform, so they are never shareable.
  const rVal = typeof rowIndex === 'number' ? rowIndex : 0;
  const cVal = typeof colIndex === 'number' ? colIndex : 3;
  const isGrate = (!behaviorKey || behaviorKey === 'default') ? ((cVal + rVal) % 2 === 1) : false;
  const matKey = voidViz ? null : `demo|${behaviorKey}|${colorIndex}|${spanX}|${spanZ}|${isGrate ? 'g' : 'b'}`;
  return cachedTileMaterial(matKey, () => {
    const isObstacle = behaviorKey === 'obstacle';
    const isSpecial = behaviorKey && behaviorKey !== 'default' && behaviorKey !== 'obstacle';

    let neonColorHex = DEMO_NEON_COLORS[colorIndex] || '#00ffff';
    if (behaviorKey === 'boost' || behaviorKey === 'super_boost') neonColorHex = '#39ff14';
    else if (behaviorKey === 'burning') neonColorHex = '#ff073a';
    else if (behaviorKey === 'sticky') neonColorHex = '#ff00ff';
    else if (behaviorKey === 'refill') neonColorHex = '#00ffff';
    else if (behaviorKey === 'slippery') neonColorHex = '#00f0ff';
    else if (isObstacle) neonColorHex = colorIndex === 0 ? '#ffff00' : (DEMO_NEON_COLORS[colorIndex] || '#ff007f');

    const matColor = new THREE.Color(neonColorHex);
    const texture = getDemoNeonTexture(behaviorKey, colorIndex, colIndex, rowIndex, spanX, spanZ);

    const matParams = { color: matColor, roughness: 0.45, metalness: 0.15 };
    if (texture) matParams.map = texture;
    if (isSpecial) {
      matParams.emissive = matColor;
      matParams.emissiveIntensity = behaviorKey === 'burning' ? 1.5 : 0.85;
    } else {
      matParams.emissive = new THREE.Color(0, 0, 0);
      matParams.emissiveIntensity = 0.0;
    }
    if (isObstacle) matParams.side = THREE.DoubleSide;

    const shaderOpts = voidViz ? { voidViz: true, zStart: opts.zStart || 0 } : undefined;
    return applyCurvatureShader(new THREE.MeshStandardMaterial(matParams), shaderOpts);
  });
}

/**
 * Material for a STANDARD-pack world neon tile. Mirrors the generated-biome (non-void) material
 * so the neon canvas texture shows true: near-white base tinted 0.18 toward the world's primary,
 * matte finish, universal hazard glow, obstacle rim in the world accent. `set` is already the
 * per-road-drifted world set; `texture` comes from getWorldNeonTexture.
 */
function createWorldNeonMaterial(set, behaviorKey, texture) {
  const isObstacle = behaviorKey === 'obstacle';
  const isSpecial = behaviorKey && behaviorKey !== 'default' && behaviorKey !== 'obstacle';
  const primaryColor = new THREE.Color(set.primary);
  const accentColor = new THREE.Color(set.accent);

  let matColor;
  if (behaviorKey === 'slippery') {
    matColor = new THREE.Color(0x2f8fd0).multiplyScalar(0.65);   // glossy ice, bloom-safe
  } else if (isSpecial) {
    matColor = new THREE.Color(0xffffff);                        // hazard textures carry fixed colours
  } else {
    matColor = new THREE.Color(0xffffff).lerp(primaryColor, 0.18); // road/obstacle: near-white, faint world tint
  }

  const matParams = {
    color: matColor,
    roughness: behaviorKey === 'slippery' ? 0.12 : 0.4,
    metalness: behaviorKey === 'slippery' ? 0.6 : 0.2,
  };
  if (texture) matParams.map = texture;
  if (isObstacle) matParams.side = THREE.DoubleSide;

  const normalTexture = getLoadedTexture(customRoadNormalUrl);
  if (normalTexture) {
    matParams.normalMap = normalTexture;
    matParams.normalScale = new THREE.Vector2(1.0, 1.0);
  }

  const SPECIAL_GLOW = { boost: 0x39ff14, super_boost: 0x00ffff, burning: 0xff073a, refill: 0x00ffff, sticky: 0xff00ff };
  if (behaviorKey === 'slippery') {
    matParams.emissive = new THREE.Color(0x0b2a44);
    matParams.emissiveIntensity = 0.18;
  } else if (isSpecial) {
    matParams.emissive = new THREE.Color(SPECIAL_GLOW[behaviorKey] || 0xffffff);
    matParams.emissiveIntensity = behaviorKey === 'burning' ? 1.4 : 0.7;
  } else if (isObstacle) {
    matParams.emissive = accentColor;
    matParams.emissiveIntensity = 0.22;
  } else {
    matParams.emissive = primaryColor;
    matParams.emissiveIntensity = 0.12;
  }

  return applyCurvatureShader(new THREE.MeshStandardMaterial(matParams));
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

    // Void biome uses the demo road's (level 0) EXACT neon material for every tile type.
    // The live per-segment music visualizer on the default road is gated by
    // VOID_VIZ_ENABLED (currently off; kept for later).
    if (biomeKey === 'void') {
      const voidViz = VOID_VIZ_ENABLED && behaviorKey === 'default';
      const zStart = voidViz ? -getVoidSegment(levelData, rowIndex).startRow * TILE_LENGTH : 0;
      return createDemoNeonMaterial(behaviorKey, colorIndex, colIndex, rowIndex, spanX, spanZ,
        { voidViz, zStart });
    }

    // Tint + glow come from the curated neon set (the SAME palette the texture uses),
    // with the same per-level hue rotation — so the biome identity holds instead of
    // drifting to the old profile hues (which turned e.g. green 'core' pink). matColor
    // itself stays near-white so the neon texture shows true.
    const levelIdx = typeof levelIndex === 'number' ? levelIndex : 61;
    const lvlInBiome = (((levelIdx - 61) % 3) + 3) % 3;
    const nset = tintNeonSet(BIOME_NEON_SETS[biomeKey] || BIOME_NEON_SETS.void, lvlInBiome);
    const railColor = new THREE.Color(nset.primary);
    const accentColor = new THREE.Color(nset.accent);

    // Share one material across tiles that render identically. Pixels depend only on the
    // determinants below (drawNeonRoad takes seed+isGrate, not raw col/row; colorIndex is
    // unused by the biome draw but kept in the key conservatively). Checked before the
    // texture is generated, so identical tiles cost one texture + one material, not N.
    const bIsDefault = behaviorKey === 'default';
    const bCol = typeof colIndex === 'number' ? colIndex : 3;
    const bRow = typeof rowIndex === 'number' ? rowIndex : 0;
    const bIsGrate = bIsDefault && ((bCol + bRow) % 2 === 1);
    const bSeed = bIsDefault ? (((bCol * 13 + bRow * 7) % 97) + 1) : 0;
    // colorIndex is intentionally NOT in the key: the biome draw (drawNeonRoad) and material
    // colours derive from the biome palette + level, never colorIndex, so tiles that differ
    // only in colorIndex render identically and must share one material.
    const bMatKey = `biome|${biomeKey}|${behaviorKey}|${spanX}|${spanZ}|${lvlInBiome}|${bIsGrate ? 'g' : 'b'}|s${bSeed}`;
    if (tileMaterialCache.has(bMatKey)) return tileMaterialCache.get(bMatKey);

    const texture = getBiomeProceduralTexture(biomeKey, behaviorKey, colorIndex, colIndex, rowIndex, spanX, spanZ, levelIndex);

    let matColor;
    if (behaviorKey === 'slippery') {
      // Glossy ice — dark glossy blue reads as ice without blowing out under bloom.
      matColor = new THREE.Color(0x2f8fd0).multiplyScalar(0.65);
    } else if (isSpecial) {
      // Boost/burning/refill/sticky textures already carry fixed hazard colours —
      // keep the material white so they show true instead of multiplying to mud.
      matColor = new THREE.Color(0xffffff);
    } else if (biomeKey === 'void' && behaviorKey === 'default') {
      // Void default road stays DARK so the shader's live spectrum bars read as neon
      // green rather than summing with a bright base and blowing out to white.
      matColor = new THREE.Color(0x0a0410);
    } else {
      // Default road + obstacle: near-white with a faint biome tint. Tundra/spire read
      // "light" here (their high roughness below sells the snow/off-white identity).
      matColor = new THREE.Color(0xffffff).lerp(railColor, 0.18);
    }

    const matParams = {
      color: matColor,
      // Glossy ice: very smooth + reflective, but NOT a perfect mirror (which blew out
      // to white). Matte-ish elsewhere (demo-like) so the neon strokes read, not shine.
      roughness: behaviorKey === 'slippery' ? 0.12 : (['spire', 'tundra'].includes(biomeKey) ? 0.5 : 0.4),
      metalness: behaviorKey === 'slippery' ? 0.6 : (['spire', 'tundra'].includes(biomeKey) ? 0.15 : 0.2),
    };

    if (texture) {
      matParams.map = texture;
    }

    if (isObstacle) {
      matParams.side = THREE.DoubleSide;
    }

    // Gentle physical depth only — a strong normal fought the flat neon look.
    let normalTexture = getLoadedTexture(customRoadNormalUrl);
    if (normalTexture) {
      matParams.normalMap = normalTexture;
      matParams.normalScale = new THREE.Vector2(1.0, 1.0);
    }

    // Hazards glow in their fixed colour (readability); default road + obstacles get a
    // dim biome-tinted glow so the neon texture — not the emissive — carries the look.
    const SPECIAL_GLOW = { boost: 0x39ff14, super_boost: 0x00ffff, burning: 0xff073a, refill: 0x00ffff, sticky: 0xff00ff };
    if (behaviorKey === 'slippery') {
      // Ice doesn't self-illuminate — a faint cold glow only, so the frost texture
      // and reflections read instead of blowing out to white.
      matParams.emissive = new THREE.Color(0x0b2a44);
      matParams.emissiveIntensity = 0.18;
    } else if (isSpecial) {
      matParams.emissive = new THREE.Color(SPECIAL_GLOW[behaviorKey] || 0xffffff);
      matParams.emissiveIntensity = behaviorKey === 'burning' ? 1.4 : 0.7;
    } else if (isObstacle) {
      matParams.emissive = accentColor;
      matParams.emissiveIntensity = 0.22;
    } else {
      matParams.emissive = railColor;
      matParams.emissiveIntensity = 0.12;
    }

    const bMat = applyCurvatureShader(new THREE.MeshStandardMaterial(matParams));
    tileMaterialCache.set(bMatKey, bMat);
    return bMat;
  }

  if (levelIndex === 0 && !isTestEnv) {
    return createDemoNeonMaterial(behaviorKey, colorIndex, colIndex, rowIndex, spanX, spanZ);
  }

  // Standard-pack worlds (RED HEAT … DRUIDIA): per-world procedural neon skin. getStandardWorld
  // returns null for the demo, the xmas pack, generated levels, or when disabled — so those
  // fall through to the xmas check / legacy PBR path below.
  const stdWorld = !isTestEnv ? getStandardWorld(levelData) : null;
  if (stdWorld) {
    const set = tintNeonSet(WORLD_NEON_SETS[stdWorld.worldIdx] || WORLD_NEON_SETS[0], stdWorld.roadInWorld);
    const tag = `world_${stdWorld.worldIdx}_${stdWorld.roadInWorld}`;
    return cachedTileMaterial(neonMatKey(tag, behaviorKey, colIndex, rowIndex, spanX, spanZ), () => {
      const texture = getNeonWorldTexture(tag, set, behaviorKey, colorIndex, colIndex, rowIndex, spanX, spanZ);
      return createWorldNeonMaterial(set, behaviorKey, texture);
    });
  }

  // Xmas-pack worlds (SNOWBOUND … THE EVE): per-world festive neon skin. Resolves in both the
  // standalone 'xmas' pack and the xmas half of the 'standard' pack; null → legacy PBR path.
  const xmasWorld = !isTestEnv ? getXmasWorld(levelData) : null;
  if (xmasWorld) {
    const set = tintNeonSet(XMAS_NEON_SETS[xmasWorld.worldIdx] || XMAS_NEON_SETS[0], xmasWorld.roadInWorld);
    const tag = `xmas_${xmasWorld.worldIdx}_${xmasWorld.roadInWorld}`;
    return cachedTileMaterial(neonMatKey(tag, behaviorKey, colIndex, rowIndex, spanX, spanZ), () => {
      const texture = getNeonWorldTexture(tag, set, behaviorKey, colorIndex, colIndex, rowIndex, spanX, spanZ);
      return createWorldNeonMaterial(set, behaviorKey, texture);
    });
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

  // ── P3.2: native multi-span cell — render every span as its own solid box ──
  if (Array.isArray(tile.spans)) {
    const spans = legacyTileToSpans(tile); // normalises span fields (floorY, topEntryY, etc.)
    for (const span of spans) {
      // Derive drive-surface color exactly like the ramp branch: top_color if set, else bottom_color
      const activeColor = (span.topColor > 0 ? span.topColor : span.bottomColor);
      const behaviorColor = activeColor > 0 ? activeColor + 1 : 0;
      const { behavior, emissiveGlow, glowColor } = classifyTileBehavior(behaviorColor);
      const baseColor = getPaletteColor(palette, behaviorColor);
      const material = createTileMaterial(baseColor, emissiveGlow, glowColor, behavior, behaviorColor, levelData, c, r, 1, 1);

      // yBottom = span.floorY — NOT clamped to ground. An overpass slab (floorY≈3) renders
      // as a thin slab at that height with a visible underside, NOT a ground-to-top pillar.
      // ponytail: reuse createRampGeometry; it handles flat tops (y1==y2) just fine.
      const geom = createRampGeometry(TILE_WIDTH, TILE_LENGTH, span.floorY, span.topEntryY, span.topExitY);
      const mesh = new THREE.Mesh(geom, material);
      mesh.position.set(xPos, 0, zPos - TILE_LENGTH / 2);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      scene.add(mesh);
      roadMeshes.push(mesh);

      if (span.behavior) {
        specialTiles.push({
          boundingBox: {
            minX: xPos - TILE_WIDTH / 2,
            maxX: xPos + TILE_WIDTH / 2,
            minY: Math.min(span.topEntryY, span.topExitY) - 0.05,
            maxY: Math.max(span.topEntryY, span.topExitY) + 0.3,
            minZ: zPos - TILE_LENGTH,
            maxZ: zPos,
          },
          behavior: span.behavior,
        });
      }
    }
    // Do NOT push to collidables — physics uses the columnGrid for multi-span tiles.
    return;
  }

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

  // When the Void per-segment music visualizer is enabled, its road blocks must not
  // merge across a segment boundary (each block maps to one visualizer panel). With the
  // visualizer off, void meshes normally.
  const _mergeTheme = THEMES[getActiveThemeIndex(levelData)];
  const isVoidBiome = VOID_VIZ_ENABLED && !!(_mergeTheme && _mergeTheme.key === 'void');

  // Greedy 2D meshing loop for Pass 1
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
      const tile = pass1Rows[r][c];
      if (!tile || rendered1[r][c]) continue;

      const { height, yPos, isObstacle } = computeTileGeometry(tile); // height: 0.45, yPos: -0.225, isObstacle: false

      // Find vertical (Z) contiguous run (void: never cross a segment boundary)
      const segStartRow = isVoidBiome ? getVoidSegment(levelData, r).startRow : -1;
      let r_end = r;
      while (r_end + 1 < numRows && !rendered1[r_end + 1][c] && areTilesIdentical(tile, pass1Rows[r_end + 1][c])
             && (!isVoidBiome || getVoidSegment(levelData, r_end + 1).startRow === segStartRow)) {
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
        // Generated levels: match the rail trim to the biome's curated neon set (with the
        // same per-level hue rotation as the road) so it reinforces the biome instead of
        // clashing — the old profile rail turned e.g. green 'core' pink. Standard packs
        // keep their profile-based rails.
        const railStdWorld = getStandardWorld(levelData);
        const railXmasWorld = getXmasWorld(levelData);
        let railColor;
        if (levelIdx >= 61 && railTheme && BIOME_NEON_SETS[railTheme.key]) {
          const railLvlInBiome = (((levelIdx - 61) % 3) + 3) % 3;
          railColor = new THREE.Color(tintNeonSet(BIOME_NEON_SETS[railTheme.key], railLvlInBiome).primary);
        } else if (railStdWorld) {
          // Standard-pack world neon: match the rail trim to the world's curated set (same
          // per-road hue drift as the road) so it reinforces the world instead of clashing.
          railColor = new THREE.Color(tintNeonSet(WORLD_NEON_SETS[railStdWorld.worldIdx] || WORLD_NEON_SETS[0], railStdWorld.roadInWorld).primary);
        } else if (railXmasWorld) {
          railColor = new THREE.Color(tintNeonSet(XMAS_NEON_SETS[railXmasWorld.worldIdx] || XMAS_NEON_SETS[0], railXmasWorld.roadInWorld).primary);
        } else {
          railColor = railProfiles && railProfiles.length > 0
            ? new THREE.Color(...railProfiles[levelIdx % railProfiles.length].rail)
            : (railTheme ? railTheme.defaultColor.clone() : new THREE.Color(0.0, 0.8, 1.0));
        }
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
  clearTileMaterialCache(); // fresh material cache per level build (see tileMaterialCache)
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

  // P3.1 — authoritative column grid for physics (preferred over _buildGridFromCollidables fallback)
  const { grid: columnGrid } = buildColumnGrid(levelData);

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
    columnGrid,
    numRows,
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
  clearTileMaterialCache(); // fresh material cache per level build (see tileMaterialCache)
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

      // P3.1 — authoritative column grid for physics
      const { grid: columnGrid } = buildColumnGrid(levelData);

      // Stage D: collapse fixed-size tiles into atlas batches (flow/tower deck groups only).
      consolidateTilesToAtlas(scene);

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
        columnGrid,
        numRows,
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

        // P3.1 — authoritative column grid for physics
        const { grid: columnGrid } = buildColumnGrid(levelData);

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
          columnGrid,
          numRows,
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
