// tests/editorPlaytest.test.js
import { vi, describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as THREE from 'three';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Mock THREE.WebGLRenderer globally BEFORE importing editor.js
vi.mock('three', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    WebGLRenderer: vi.fn().mockImplementation(() => {
      return {
        setSize: vi.fn(),
        setPixelRatio: vi.fn(),
        shadowMap: { enabled: true },
        setScissorTest: vi.fn(),
        clear: vi.fn(),
        setViewport: vi.fn(),
        setScissor: vi.fn(),
        render: vi.fn(),
        domElement: document.createElement('canvas')
      };
    })
  };
});

// Mock OrbitControls
vi.mock('three/addons/controls/OrbitControls.js', () => {
  return {
    OrbitControls: vi.fn().mockImplementation(() => {
      return {
        update: vi.fn(),
        target: new THREE.Vector3(),
        enabled: true
      };
    })
  };
});

describe('Editor Playtest Unit & Integration Tests (Sprint 5)', () => {
  let editorModule;

  beforeEach(async () => {
    // 2. Load editor.html DOM into JSDOM
    const htmlPath = path.resolve(__dirname, '../editor.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    document.body.innerHTML = htmlContent;

    // Mock client rects for resizing
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800
    });

    // 3. Dynamically import editor.js
    vi.resetModules();
    editorModule = await import('../editor.js');
  });

  it('should initialize playtest elements correctly', () => {
    expect(document.getElementById('playtest-telemetry')).toBeDefined();
    expect(document.getElementById('playtest-banner')).toBeDefined();
    
    const state = editorModule.getPlaytestState();
    expect(state.isPlaytestActive).toBe(false);
    expect(state.playtestPhysics).toBeNull();
  });

  it('should calculate findSpawnSurfaceY correctly for different block types', () => {
    // We can directly mock state or simulate cells to test findSpawnSurfaceY
    const heightFlat = editorModule.findSpawnSurfaceY(3, 0);
    expect(heightFlat).toBe(0.0); // Default flat road Y level is 0
  });

  it('should transition into playtest mode when enterPlaytestSimulation is called', () => {
    editorModule.enterPlaytestSimulation();

    const state = editorModule.getPlaytestState();
    expect(state.isPlaytestActive).toBe(true);
    expect(state.playtestPhysics).not.toBeNull();
    expect(state.playtestPhysics.velocity.z).toBe(-18.0); // Baseline forward momentum injected

    // DOM indicators should be visible
    expect(document.getElementById('test-indicator').style.display).toBe('inline-block');
    expect(document.getElementById('playtest-telemetry').style.display).toBe('flex');
    expect(document.getElementById('viewport-3d').classList.contains('maximized')).toBe(true);
  });

  it('should clean up playtest state when exitPlaytestSimulation is called', () => {
    editorModule.enterPlaytestSimulation();
    expect(editorModule.getPlaytestState().isPlaytestActive).toBe(true);

    editorModule.exitPlaytestSimulation();

    const state = editorModule.getPlaytestState();
    expect(state.isPlaytestActive).toBe(false);
    expect(state.playtestPhysics).toBeNull();
    expect(state.playtestShipMesh).toBeNull();

    // DOM indicators should be hidden
    expect(document.getElementById('test-indicator').style.display).toBe('none');
    expect(document.getElementById('playtest-telemetry').style.display).toBe('none');
    expect(document.getElementById('viewport-3d').classList.contains('maximized')).toBe(false);
  });
});
