/**
 * renderer.js — THREE-native Milkdrop default-pipeline renderer.
 *
 * Reimplements Milkdrop's DEFAULT warp + composite feedback loop using ONLY
 * THREE's public API (ShaderMaterial + WebGLRenderTarget ping-pong). This is
 * the standard THREE render-to-texture pattern: THREE fully owns its GL
 * state, so the context-corruption that killed every Butterchurn
 * shared-context attempt this session cannot happen here. The output is a
 * normal THREE render-target texture, already in the game's context — zero
 * cross-context transfer, zero stall.
 *
 * Per frame: run the preset's per-frame equations (JS) → motion/appearance
 * uniforms; run its per-vertex equations over the 48x36 mesh → each vertex's
 * sample coordinate into the PREVIOUS frame (the warp); render the warp mesh
 * (samples prev * decay), draw the basic audio waveform on top (the seed the
 * feedback smears — without an injected source the loop is just black), then
 * the comp pass (echo/gamma/post) into the output target; swap buffers.
 *
 * Borrowed faithfully from Butterchurn (MIT): the per-vertex warp-UV
 * distortion math, the variable bag, mesh size 48x36. Deferred to later
 * phases: custom waves[] and shapes[] (their own per-point equations) and
 * blur/noise/motion-vector sampling (the default-shader presets we target
 * don't use them).
 */

import * as THREE from 'three'
import { compileEq } from './equations.js'
import { warpVert, warpFrag, compVert, compFrag } from './shaders.js'

const MESH_W = 48
const MESH_H = 36

// Subset of Butterchurn's baseValsDefaults (~line 12142) for the fields this
// phase consumes. A preset's own baseVals override these; per-frame eqs then
// override those.
const BASE_DEFAULTS = {
  decay: 0.98,
  gammaadj: 2,
  echo_zoom: 2,
  echo_alpha: 0,
  echo_orient: 0,
  brighten: 0,
  darken: 0,
  solarize: 0,
  invert: 0,
  zoom: 1,
  zoomexp: 1,
  rot: 0,
  warp: 1,
  warpscale: 1,
  warpanimspeed: 1,
  cx: 0.5,
  cy: 0.5,
  dx: 0,
  dy: 0,
  sx: 1,
  sy: 1,
  wave_x: 0.5,
  wave_y: 0.5,
  wave_r: 1,
  wave_g: 1,
  wave_b: 1,
  wave_a: 0.8,
  wave_scale: 1
}

// The frame-level motion fields that per-vertex eqs read and locally modify —
// snapshotted after frame_eqs and restored before each vertex.
const VERTEX_MOTION_FIELDS = ['zoom', 'zoomexp', 'rot', 'warp', 'cx', 'cy', 'dx', 'dy', 'sx', 'sy']

const WAVE_POINTS = 480

export class MilkdropRenderer {
  constructor(threeRenderer, { width = 1280, height = 720 } = {}) {
    this.renderer = threeRenderer
    this.width = width
    this.height = height

    const rtOpts = {
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.UnsignedByteType
    }
    this.rtA = new THREE.WebGLRenderTarget(width, height, rtOpts)
    this.rtB = new THREE.WebGLRenderTarget(width, height, rtOpts)
    this.outputRT = new THREE.WebGLRenderTarget(width, height, rtOpts)
    this.outputRT.texture.colorSpace = THREE.SRGBColorSpace
    this.prev = this.rtA
    this.target = this.rtB

    // Clip-space camera: maps geometry XY in [-1,1] straight through (the
    // ShaderMaterials ignore it; the waveform LineBasicMaterial uses it).
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    this.camera.position.z = 1

    // --- warp mesh (48x36) + per-vertex warp UV attribute ---
    this.warpMaterial = new THREE.ShaderMaterial({
      vertexShader: warpVert,
      fragmentShader: warpFrag,
      uniforms: {
        uMain: { value: null },
        uDecay: { value: 0.98 }
      },
      depthTest: false,
      depthWrite: false
    })
    const warpGeo = new THREE.PlaneGeometry(2, 2, MESH_W, MESH_H)
    this.vertexCount = warpGeo.attributes.position.count
    this.warpUVs = new Float32Array(this.vertexCount * 2)
    warpGeo.setAttribute('aWarpUv', new THREE.BufferAttribute(this.warpUVs, 2))
    // Cache each vertex's grid (x,y) in [-1,1] from the plane positions.
    const pos = warpGeo.attributes.position
    this.gridX = new Float32Array(this.vertexCount)
    this.gridY = new Float32Array(this.vertexCount)
    for (let i = 0; i < this.vertexCount; i++) {
      this.gridX[i] = pos.getX(i)
      this.gridY[i] = pos.getY(i)
    }
    this.warpMesh = new THREE.Mesh(warpGeo, this.warpMaterial)
    this.warpMesh.frustumCulled = false
    this.warpMesh.renderOrder = 0

    // --- basic waveform line (the feedback seed) ---
    const waveGeo = new THREE.BufferGeometry()
    this.wavePositions = new Float32Array(WAVE_POINTS * 3)
    waveGeo.setAttribute('position', new THREE.BufferAttribute(this.wavePositions, 3))
    this.waveMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    this.waveLine = new THREE.Line(waveGeo, this.waveMaterial)
    this.waveLine.frustumCulled = false
    this.waveLine.renderOrder = 1

    this.warpScene = new THREE.Scene()
    this.warpScene.add(this.warpMesh)
    this.warpScene.add(this.waveLine)

    // --- comp fullscreen quad ---
    this.compMaterial = new THREE.ShaderMaterial({
      vertexShader: compVert,
      fragmentShader: compFrag,
      uniforms: {
        uMain: { value: null },
        uGamma: { value: 2 },
        uEchoZoom: { value: 2 },
        uEchoAlpha: { value: 0 },
        uEchoOrient: { value: 0 },
        uBrighten: { value: 0 },
        uDarken: { value: 0 },
        uSolarize: { value: 0 },
        uInvert: { value: 0 }
      },
      depthTest: false,
      depthWrite: false
    })
    this.compScene = new THREE.Scene()
    this.compQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.compMaterial)
    this.compQuad.frustumCulled = false
    this.compScene.add(this.compQuad)

    // preset state
    this.bag = {}
    this.baseVals = { ...BASE_DEFAULTS }
    this.frameEq = () => {}
    this.pixelEq = () => {}
    this.hasPixelEqs = false
    this.time = 0
    this.frameNum = 0
  }

  loadPreset(presetObj) {
    this.baseVals = { ...BASE_DEFAULTS, ...(presetObj.baseVals || {}) }
    const initEq = compileEq(presetObj.init_eqs_str)
    this.frameEq = compileEq(presetObj.frame_eqs_str)
    this.pixelEq = compileEq(presetObj.pixel_eqs_str)
    this.hasPixelEqs = !!(presetObj.pixel_eqs_str && presetObj.pixel_eqs_str.trim())
    this.bag = {} // fresh persistent bag (clears q-vars / custom vars)
    Object.assign(this.bag, this.baseVals)
    initEq(this.bag)
  }

  /**
   * Renders one feedback frame. `audio` is an AudioLevels instance (already
   * updated this frame). `dt` is seconds since last frame.
   */
  renderFrame(audio, dt) {
    const a = this.bag
    this.time += dt
    this.frameNum += 1
    const fps = dt > 0 ? 1 / dt : 60

    // Reset per-frame motion/appearance vars to base; keep persistent vars.
    Object.assign(a, this.baseVals)
    a.time = this.time
    a.frame = this.frameNum
    a.fps = fps
    a.bass = audio.bass; a.bass_att = audio.bass_att
    a.mid = audio.mid; a.mid_att = audio.mid_att
    a.treb = audio.treb; a.treb_att = audio.treb_att
    a.meshx = MESH_W; a.meshy = MESH_H
    a.aspectx = 1; a.aspecty = 1
    a.pixelsx = this.width; a.pixelsy = this.height

    this.frameEq(a)

    // Snapshot post-frame motion values (per-vertex eqs start from these).
    const fm = {}
    for (const k of VERTEX_MOTION_FIELDS) fm[k] = a[k]
    fm.zoom = num(fm.zoom, 1)
    fm.zoomexp = num(fm.zoomexp, 1)
    const warpscale = num(a.warpscale, 1)
    const warpanimspeed = num(a.warpanimspeed, 1)
    const hasPixelEqs = this.hasPixelEqs

    // --- per-vertex warp UVs ---
    const warpTime = this.time * warpanimspeed
    const warpScaleInv = 1.0 / (warpscale || 1)
    const wf0 = 11.68 + 4.0 * Math.cos(warpTime * 1.413 + 10)
    const wf1 = 8.77 + 3.0 * Math.cos(warpTime * 1.113 + 7)
    const wf2 = 10.54 + 3.0 * Math.cos(warpTime * 1.233 + 3)
    const wf3 = 11.49 + 4.0 * Math.cos(warpTime * 0.933 + 5)

    for (let i = 0; i < this.vertexCount; i++) {
      const gx = this.gridX[i]
      const gy = this.gridY[i]
      let zoom, zoomExp, rot, warp, cx, cy, dx, dy, sx, sy

      if (hasPixelEqs) {
        // Restore frame motion state, set this vertex's coords, run eqs.
        a.zoom = fm.zoom; a.zoomexp = fm.zoomexp; a.rot = fm.rot; a.warp = fm.warp
        a.cx = fm.cx; a.cy = fm.cy; a.dx = fm.dx; a.dy = fm.dy; a.sx = fm.sx; a.sy = fm.sy
        a.x = gx * 0.5 + 0.5
        a.y = gy * -0.5 + 0.5
        a.rad = Math.sqrt(gx * gx + gy * gy)
        a.ang = Math.atan2(gy, gx)
        this.pixelEq(a)
        zoom = num(a.zoom, 1); zoomExp = num(a.zoomexp, 1); rot = num(a.rot, 0); warp = num(a.warp, 0)
        cx = num(a.cx, 0.5); cy = num(a.cy, 0.5); dx = num(a.dx, 0); dy = num(a.dy, 0)
        sx = num(a.sx, 1); sy = num(a.sy, 1)
      } else {
        zoom = fm.zoom; zoomExp = fm.zoomexp; rot = fm.rot; warp = fm.warp
        cx = fm.cx; cy = fm.cy; dx = fm.dx; dy = fm.dy; sx = fm.sx; sy = fm.sy
      }

      // Guard against degenerate values that produce NaN sample coords.
      if (!(zoom > 0.0001)) zoom = 0.0001
      if (Math.abs(sx) < 0.0001) sx = sx < 0 ? -0.0001 : 0.0001
      if (Math.abs(sy) < 0.0001) sy = sy < 0 ? -0.0001 : 0.0001

      // --- exact Butterchurn warp-UV math (default path) ---
      const zoom2 = zoom ** (zoomExp ** (this.gridRad(gx, gy) * 2.0 - 1.0))
      const zoom2Inv = 1.0 / zoom2
      let u = gx * 0.5 * zoom2Inv + 0.5
      let v = -gy * 0.5 * zoom2Inv + 0.5
      u = (u - cx) / sx + cx
      v = (v - cy) / sy + cy
      if (warp !== 0) {
        u += warp * 0.0035 * Math.sin(warpTime * 0.333 + warpScaleInv * (gx * wf0 - gy * wf3))
        v += warp * 0.0035 * Math.cos(warpTime * 0.375 - warpScaleInv * (gx * wf2 + gy * wf1))
        u += warp * 0.0035 * Math.cos(warpTime * 0.753 - warpScaleInv * (gx * wf1 - gy * wf2))
        v += warp * 0.0035 * Math.sin(warpTime * 0.825 + warpScaleInv * (gx * wf0 + gy * wf3))
      }
      const u2 = u - cx
      const v2 = v - cy
      const cosR = Math.cos(rot)
      const sinR = Math.sin(rot)
      u = u2 * cosR - v2 * sinR + cx
      v = u2 * sinR + v2 * cosR + cy
      u -= dx
      v -= dy

      this.warpUVs[i * 2] = u
      this.warpUVs[i * 2 + 1] = v
    }
    this.warpMesh.geometry.attributes.aWarpUv.needsUpdate = true

    // --- basic waveform seed ---
    this.updateWaveform(audio, a)

    // --- uniforms ---
    this.warpMaterial.uniforms.uMain.value = this.prev.texture
    this.warpMaterial.uniforms.uDecay.value = clamp(num(a.decay, 0.98), 0, 1)
    const cu = this.compMaterial.uniforms
    cu.uGamma.value = num(a.gammaadj, 2)
    cu.uEchoZoom.value = num(a.echo_zoom, 2) || 1
    cu.uEchoAlpha.value = num(a.echo_alpha, 0)
    cu.uEchoOrient.value = num(a.echo_orient, 0)
    cu.uBrighten.value = num(a.brighten, 0)
    cu.uDarken.value = num(a.darken, 0)
    cu.uSolarize.value = num(a.solarize, 0)
    cu.uInvert.value = num(a.invert, 0)

    // --- render passes (pure THREE; restores render target after) ---
    const r = this.renderer
    r.setRenderTarget(this.target)
    r.render(this.warpScene, this.camera)

    cu.uMain.value = this.target.texture
    r.setRenderTarget(this.outputRT)
    r.render(this.compScene, this.camera)

    r.setRenderTarget(null)

    // swap
    const tmp = this.prev
    this.prev = this.target
    this.target = tmp
  }

  gridRad(gx, gy) {
    return Math.sqrt(gx * gx + gy * gy)
  }

  updateWaveform(audio, a) {
    const time = audio.timeArray
    const n = time.length
    const waveScale = num(a.wave_scale, 1)
    const yCenter = 1 - 2 * num(a.wave_y, 0.5)
    const amp = 0.15 * waveScale
    for (let i = 0; i < WAVE_POINTS; i++) {
      const t = i / (WAVE_POINTS - 1)
      const s = (time[Math.floor(t * (n - 1))] - 128) / 128
      this.wavePositions[i * 3] = (t * 2 - 1) * 0.92
      this.wavePositions[i * 3 + 1] = yCenter + s * amp
      this.wavePositions[i * 3 + 2] = 0
    }
    this.waveLine.geometry.attributes.position.needsUpdate = true
    this.waveMaterial.color.setRGB(num(a.wave_r, 1), num(a.wave_g, 1), num(a.wave_b, 1))
    this.waveMaterial.opacity = clamp(num(a.wave_a, 0.8), 0, 1)
  }

  get outputTexture() {
    return this.outputRT.texture
  }

  resize(width, height) {
    this.width = width
    this.height = height
    this.rtA.setSize(width, height)
    this.rtB.setSize(width, height)
    this.outputRT.setSize(width, height)
  }

  dispose() {
    this.rtA.dispose()
    this.rtB.dispose()
    this.outputRT.dispose()
    this.warpMesh.geometry.dispose()
    this.warpMaterial.dispose()
    this.waveLine.geometry.dispose()
    this.waveMaterial.dispose()
    this.compQuad.geometry.dispose()
    this.compMaterial.dispose()
  }
}

function num(v, fallback) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}
function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x))
}
