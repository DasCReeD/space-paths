/* 🚀 Space Paths Level Editor - Rendering Engine */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Tile size constants matching game engine
export const TILE_WIDTH = 2.0;
export const TILE_LENGTH = 4.0;
export const ROAD_WIDTH_LANES = 7;
export const TOTAL_ROAD_WIDTH = TILE_WIDTH * ROAD_WIDTH_LANES;

// VGA color mapping index to Hex
const PALETTE_HEX = {
  0: '#000000', 3: '#660088', 9: '#0088aa', 10: '#0055ff',
  11: '#00cc00', 12: '#00ffff', 13: '#cc0000', 14: '#cc00cc'
};

export class EditorRenderer {
  constructor(containerId, stateManager) {
    this.container = document.getElementById(containerId);
    this.state = stateManager;

    // Create shared canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '1';
    this.container.appendChild(this.canvas);

    // Initialize WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;

    // Shared Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a0c16');

    // Lights
    this.setupLights();

    // Layers definition
    // Layer 0: 3D perspective render (full textures)
    // Layer 1: 2D orthogonal blueprints (flat outlines)
    // Layer 2: Grid and active helper lines (visible to all)
    
    // Viewports setup
    this.viewports = {
      top: {
        camera: new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000),
        domWrapper: document.getElementById('canvas-top'),
        zoom: 1.0,
        pan: new THREE.Vector3(0, 0, -40), // start centered down the track
      },
      front: {
        camera: new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000),
        domWrapper: document.getElementById('canvas-front'),
        zoom: 1.0,
        pan: new THREE.Vector3(0, 1, 0),
      },
      side: {
        camera: new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000),
        domWrapper: document.getElementById('canvas-side'),
        zoom: 1.0,
        pan: new THREE.Vector3(0, 1, -40),
      },
      perspective: {
        camera: new THREE.PerspectiveCamera(50, 1, 0.1, 1000),
        domWrapper: document.getElementById('canvas-3d'),
      }
    };

    // Configure camera layers
    this.viewports.top.camera.layers.enable(1);
    this.viewports.top.camera.layers.enable(2);
    this.viewports.top.camera.layers.disable(0);
    
    this.viewports.front.camera.layers.enable(1);
    this.viewports.front.camera.layers.enable(2);
    this.viewports.front.camera.layers.disable(0);
    
    this.viewports.side.camera.layers.enable(1);
    this.viewports.side.camera.layers.enable(2);
    this.viewports.side.camera.layers.disable(0);
    
    this.viewports.perspective.camera.layers.enable(0);
    this.viewports.perspective.camera.layers.enable(2);
    this.viewports.perspective.camera.layers.disable(1);

    // Initial camera positions
    this.resetOrthogonalCameras();

    // 3D Perspective camera controls
    this.controls3D = new OrbitControls(this.viewports.perspective.camera, this.viewports.perspective.domWrapper);
    this.controls3D.target.set(0, 0, -40);
    this.controls3D.update();

    // Texture loaders for 3D preview
    this.textureLoader = new THREE.TextureLoader();
    this.materialsCache = new Map();

    // Mesh containers
    this.perspectiveGroup = new THREE.Group();
    this.orthogonalGroup = new THREE.Group();
    this.helperGroup = new THREE.Group();
    
    this.scene.add(this.perspectiveGroup);
    this.scene.add(this.orthogonalGroup);
    this.scene.add(this.helperGroup);

    // Set layers on groups
    this.perspectiveGroup.layers.set(0);
    this.orthogonalGroup.layers.set(1);
    this.helperGroup.layers.set(2);

    // Events
    window.addEventListener('resize', () => this.resize());
    this.setupOrthogonalInteractions();

    this.showDecals = true;
    this.showGrid = true;
    this.collisionView = false;
    this.pasteHoverCell = null;
    this.marqueeStartCell = null;
    this.marqueeEndCell = null;
    this.linePreviewCells = [];

    // Build initial grid lines
    this.rebuildHelperGrid();
    this.resize();
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(15, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    const d = 30;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);

    // Subtle blue fill light
    const pointLight = new THREE.PointLight(0x0088ff, 0.4, 100);
    pointLight.position.set(0, 10, -50);
    this.scene.add(pointLight);
  }

  resetOrthogonalCameras() {
    // Top camera looking straight down Y
    this.viewports.top.camera.position.set(this.viewports.top.pan.x, 50, this.viewports.top.pan.z);
    this.viewports.top.camera.lookAt(this.viewports.top.pan.x, 0, this.viewports.top.pan.z);
    this.viewports.top.camera.up.set(0, 0, -1); // negative Z is up on screen

    // Front camera looking straight down Z (from positive Z looking at origin)
    this.viewports.front.camera.position.set(this.viewports.front.pan.x, this.viewports.front.pan.y, 50);
    this.viewports.front.camera.lookAt(this.viewports.front.pan.x, this.viewports.front.pan.y, 0);
    this.viewports.front.camera.up.set(0, 1, 0);

    // Side camera looking down X
    this.viewports.side.camera.position.set(50, this.viewports.side.pan.y, this.viewports.side.pan.z);
    this.viewports.side.camera.lookAt(0, this.viewports.side.pan.y, this.viewports.side.pan.z);
    this.viewports.side.camera.up.set(0, 1, 0);

    // Perspective camera
    this.viewports.perspective.camera.position.set(0, 15, 20);
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    this.renderer.setSize(rect.width, rect.height, false);

    // Update cameras aspect ratios
    Object.keys(this.viewports).forEach(key => {
      const vp = this.viewports[key];
      const vpRect = vp.domWrapper.getBoundingClientRect();
      const aspect = vpRect.width / vpRect.height;

      if (vp.camera.isOrthographicCamera) {
        const size = 15 / vp.zoom;
        vp.camera.left = -size * aspect;
        vp.camera.right = size * aspect;
        vp.camera.top = size;
        vp.camera.bottom = -size;
        vp.camera.updateProjectionMatrix();
      } else {
        vp.camera.aspect = aspect;
        vp.camera.updateProjectionMatrix();
      }
    });
  }

  /**
   * Panning and zooming in 2D views.
   */
  setupOrthogonalInteractions() {
    const vpNames = ['top', 'front', 'side'];
    
    vpNames.forEach(name => {
      const vp = this.viewports[name];
      const wrapper = vp.domWrapper;
      let isPanning = false;
      let startMouse = { x: 0, y: 0 };
      let startPan = new THREE.Vector3();

      wrapper.addEventListener('mousedown', (e) => {
        // Active focus outline
        document.querySelectorAll('.viewport-box').forEach(el => el.classList.remove('active-focus'));
        wrapper.closest('.viewport-box').classList.add('active-focus');

        // Right button or middle button or Shift+Left to pan
        if (e.button === 2 || e.button === 1 || (e.button === 0 && e.shiftKey)) {
          isPanning = true;
          startMouse.x = e.clientX;
          startMouse.y = e.clientY;
          startPan.copy(vp.pan);
          wrapper.style.cursor = 'grabbing';
          e.preventDefault();
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        
        const rect = wrapper.getBoundingClientRect();
        const deltaX = e.clientX - startMouse.x;
        const deltaY = e.clientY - startMouse.y;
        
        const frustumHeight = 30 / vp.zoom;
        const scaleX = (frustumHeight * (rect.width / rect.height)) / rect.width;
        const scaleY = frustumHeight / rect.height;

        if (name === 'top') {
          vp.pan.x = startPan.x - deltaX * scaleX;
          vp.pan.z = startPan.z - deltaY * scaleY; // Top view uses Z vertical
          vp.camera.position.set(vp.pan.x, 50, vp.pan.z);
          vp.camera.lookAt(vp.pan.x, 0, vp.pan.z);
        } else if (name === 'front') {
          vp.pan.x = startPan.x - deltaX * scaleX;
          vp.pan.y = startPan.y + deltaY * scaleY; // Y is positive up
          vp.camera.position.set(vp.pan.x, vp.pan.y, 50);
          vp.camera.lookAt(vp.pan.x, vp.pan.y, 0);
        } else if (name === 'side') {
          vp.pan.z = startPan.z + deltaX * scaleX; // Side view Z goes left
          vp.pan.y = startPan.y + deltaY * scaleY;
          vp.camera.position.set(50, vp.pan.y, vp.pan.z);
          vp.camera.lookAt(0, vp.pan.y, vp.pan.z);
        }
        
        this.rebuildHelperGrid();
      });

      window.addEventListener('mouseup', () => {
        if (isPanning) {
          isPanning = false;
          wrapper.style.cursor = 'crosshair';
        }
      });

      // Zoom
      wrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        vp.zoom = Math.max(0.1, Math.min(20, vp.zoom * factor));
        
        const aspect = wrapper.clientWidth / wrapper.clientHeight;
        const size = 15 / vp.zoom;
        
        vp.camera.left = -size * aspect;
        vp.camera.right = size * aspect;
        vp.camera.top = size;
        vp.camera.bottom = -size;
        vp.camera.updateProjectionMatrix();
      }, { passive: false });
    });
  }

  /**
   * Helper grid boundaries and rules overlays.
   */
  rebuildHelperGrid() {
    // Clear helper group
    while (this.helperGroup.children.length > 0) {
      this.helperGroup.remove(this.helperGroup.children[0]);
    }

    const gridColor = 0x22284c;
    const ruleColor = 0x00ffff;
    const maxRows = this.state.level.rows.length;
    const maxZ = -maxRows * TILE_LENGTH;

    const activeHeight = this.state.ui.activePlaneHeight * 1.0;
    const activeRow = this.state.ui.activePlaneRow;
    const activeLane = this.state.ui.activePlaneLane;
    const activeZ = -activeRow * TILE_LENGTH - TILE_LENGTH / 2;
    const activeX = (activeLane - 3) * TILE_WIDTH;

    if (this.showGrid) {
      // 1. Z grid lines (run along road lanes)
      for (let c = 0; c <= ROAD_WIDTH_LANES; c++) {
        const x = (c - 3.5) * TILE_WIDTH;
        const points = [
          new THREE.Vector3(x, 0, 0),
          new THREE.Vector3(x, 0, maxZ)
        ];
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: gridColor });
        const line = new THREE.Line(geom, mat);
        this.helperGroup.add(line);
      }

      // 2. X grid lines (run across road lanes)
      for (let r = 0; r <= maxRows; r++) {
        const z = -r * TILE_LENGTH;
        const points = [
          new THREE.Vector3(-TOTAL_ROAD_WIDTH/2, 0, z),
          new THREE.Vector3(TOTAL_ROAD_WIDTH/2, 0, z)
        ];
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ 
          color: r % 5 === 0 ? 0x445588 : gridColor,
          linewidth: r % 5 === 0 ? 2 : 1
        });
        const line = new THREE.Line(geom, mat);
        this.helperGroup.add(line);
      }

      // 3. Front View Gridlines (X-Y plane at active Z)
      // Horizontal lines (heights Y from 0 to 5)
      for (let h = 0; h <= 5; h++) {
        const y = h * 1.0;
        const points = [
          new THREE.Vector3(-TOTAL_ROAD_WIDTH/2, y, activeZ),
          new THREE.Vector3(TOTAL_ROAD_WIDTH/2, y, activeZ)
        ];
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: gridColor });
        const line = new THREE.Line(geom, mat);
        this.helperGroup.add(line);
      }
      // Vertical lines (lanes X from -3.5 to 3.5)
      for (let c = 0; c <= ROAD_WIDTH_LANES; c++) {
        const x = (c - 3.5) * TILE_WIDTH;
        const points = [
          new THREE.Vector3(x, 0, activeZ),
          new THREE.Vector3(x, 5.0, activeZ)
        ];
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: gridColor });
        const line = new THREE.Line(geom, mat);
        this.helperGroup.add(line);
      }

      // 4. Side View Gridlines (Z-Y plane at active X)
      // Horizontal lines (heights Y from 0 to 5)
      for (let h = 0; h <= 5; h++) {
        const y = h * 1.0;
        const points = [
          new THREE.Vector3(activeX, y, 0),
          new THREE.Vector3(activeX, y, maxZ)
        ];
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: gridColor });
        const line = new THREE.Line(geom, mat);
        this.helperGroup.add(line);
      }
      // Vertical lines (rows Z from 0 to maxRows)
      for (let r = 0; r <= maxRows; r++) {
        const z = -r * TILE_LENGTH;
        const points = [
          new THREE.Vector3(activeX, 0, z),
          new THREE.Vector3(activeX, 5.0, z)
        ];
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ 
          color: r % 5 === 0 ? 0x445588 : gridColor,
          linewidth: r % 5 === 0 ? 2 : 1
        });
        const line = new THREE.Line(geom, mat);
        this.helperGroup.add(line);
      }
    }

    // 5. Active plane visualizer line highlights
    // Top view active plane indicator (vertical height level slice indicator in orthogonal planes)
    // Draw vertical/horizontal planes in Front and Side views to mark active editing slices
    
    // Front View: Height line
    const fhPoints = [
      new THREE.Vector3(-20, activeHeight, 0),
      new THREE.Vector3(20, activeHeight, 0)
    ];
    const fhGeom = new THREE.BufferGeometry().setFromPoints(fhPoints);
    const fhMat = new THREE.LineBasicMaterial({ color: ruleColor, transparent: true, opacity: 0.6 });
    const fhLine = new THREE.Line(fhGeom, fhMat);
    this.helperGroup.add(fhLine);

    // Side View: Height line and Row vertical indicator
    const svhPoints = [
      new THREE.Vector3(0, activeHeight, 10),
      new THREE.Vector3(0, activeHeight, -500)
    ];
    const svhGeom = new THREE.BufferGeometry().setFromPoints(svhPoints);
    const svhLine = new THREE.Line(svhGeom, fhMat);
    this.helperGroup.add(svhLine);

    const svrPoints = [
      new THREE.Vector3(0, -2, activeZ),
      new THREE.Vector3(0, 8, activeZ)
    ];
    const svrGeom = new THREE.BufferGeometry().setFromPoints(svrPoints);
    const svrLine = new THREE.Line(svrGeom, fhMat);
    this.helperGroup.add(svrLine);

    // Top View: Active Row horizontal line
    const tvrPoints = [
      new THREE.Vector3(-TOTAL_ROAD_WIDTH/2, 0, activeZ),
      new THREE.Vector3(TOTAL_ROAD_WIDTH/2, 0, activeZ)
    ];
    const tvrGeom = new THREE.BufferGeometry().setFromPoints(tvrPoints);
    const tvrLine = new THREE.Line(tvrGeom, fhMat);
    this.helperGroup.add(tvrLine);

    // Active Selection bounding boxes
    const cellsToOutline = this.state.ui.selectedCells && this.state.ui.selectedCells.length > 0
      ? this.state.ui.selectedCells
      : (this.state.ui.selectedCell ? [this.state.ui.selectedCell] : []);

    cellsToOutline.forEach(coord => {
      const { lane, row } = coord;
      const x = (lane - 3) * TILE_WIDTH;
      const z = -row * TILE_LENGTH - TILE_LENGTH / 2;
      
      const boxGeom = new THREE.BoxGeometry(TILE_WIDTH + 0.1, 4.2, TILE_LENGTH + 0.1);
      const edge = new THREE.EdgesGeometry(boxGeom);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 });
      const selectBox = new THREE.LineSegments(edge, lineMat);
      selectBox.position.set(x, 1, z);
      this.helperGroup.add(selectBox);
    });

    // Marquee selection drag preview
    if (this.marqueeStartCell && this.marqueeEndCell) {
      const minLane = Math.min(this.marqueeStartCell.lane, this.marqueeEndCell.lane);
      const maxLane = Math.max(this.marqueeStartCell.lane, this.marqueeEndCell.lane);
      const minRow = Math.min(this.marqueeStartCell.row, this.marqueeEndCell.row);
      const maxRow = Math.max(this.marqueeStartCell.row, this.marqueeEndCell.row);

      const minX = (minLane - 3.5) * TILE_WIDTH;
      const maxX = (maxLane - 2.5) * TILE_WIDTH;
      const minZ = -(maxRow + 1) * TILE_LENGTH;
      const maxZ = -minRow * TILE_LENGTH;

      const w = maxX - minX;
      const l = maxZ - minZ;
      const x = (minX + maxX) / 2;
      const z = (minZ + maxZ) / 2;

      const boxGeom = new THREE.BoxGeometry(w + 0.15, 4.3, l + 0.15);
      const edge = new THREE.EdgesGeometry(boxGeom);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });
      const marqueeBox = new THREE.LineSegments(edge, lineMat);
      marqueeBox.position.set(x, 1, z);
      this.helperGroup.add(marqueeBox);
    }

    // Paste Mode ghost outline preview
    if (this.pasteHoverCell && this.state.clipboard && this.state.clipboard.length > 0) {
      const { lane, row } = this.pasteHoverCell;
      this.state.clipboard.forEach(item => {
        const targetLane = lane + item.dx;
        const targetRow = row + item.dr;

        if (targetLane >= 0 && targetLane <= 6 && targetRow >= 0 && targetRow < this.state.level.rows.length) {
          const x = (targetLane - 3) * TILE_WIDTH;
          const z = -targetRow * TILE_LENGTH - TILE_LENGTH / 2;

          const boxGeom = new THREE.BoxGeometry(TILE_WIDTH + 0.15, 4.25, TILE_LENGTH + 0.15);
          const edge = new THREE.EdgesGeometry(boxGeom);
          const lineMat = new THREE.LineBasicMaterial({ color: 0x00ff66, linewidth: 2 });
          const previewBox = new THREE.LineSegments(edge, lineMat);
          previewBox.position.set(x, 1, z);
          this.helperGroup.add(previewBox);
        }
      });
    }

    // Line preview cells
    if (this.linePreviewCells && this.linePreviewCells.length > 0) {
      this.linePreviewCells.forEach(coord => {
        const { lane, row } = coord;
        const x = (lane - 3) * TILE_WIDTH;
        const z = -row * TILE_LENGTH - TILE_LENGTH / 2;

        const boxGeom = new THREE.BoxGeometry(TILE_WIDTH + 0.05, 0.3, TILE_LENGTH + 0.05);
        const edge = new THREE.EdgesGeometry(boxGeom);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
        const previewBox = new THREE.LineSegments(edge, lineMat);
        previewBox.position.set(x, 0.15, z);
        this.helperGroup.add(previewBox);
      });
    }

    // Recursively apply Layer 2 to all helper meshes and lines
    this.helperGroup.traverse(child => {
      child.layers.set(2);
    });
    if (typeof window !== 'undefined' && window.__editorDebug) {
      window.__editorDebug.trigger('viewportRebuild', { step: 'rebuildHelperGrid' });
    }
  }

  /**
   * Rebuilds all block geometries from state.
   */
  rebuildMeshes() {
    // Clear groups
    while (this.perspectiveGroup.children.length > 0) {
      this.perspectiveGroup.remove(this.perspectiveGroup.children[0]);
    }
    while (this.orthogonalGroup.children.length > 0) {
      this.orthogonalGroup.remove(this.orthogonalGroup.children[0]);
    }

    const rows = this.state.level.rows;
    
    rows.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (!cell) return;
        
        const xPos = (c - 3) * TILE_WIDTH;
        const zPos = -r * TILE_LENGTH - TILE_LENGTH / 2;

        // Determine height and Y center based on cell type
        let height = 0.2;
        let yPos = -0.1;
        let color = '#00aa33'; // Default flat road (green)
        
        if (cell.type === 'obstacle-half') {
          height = 1.0;
          yPos = 0.5;
          color = '#cc8800';
        } else if (cell.type === 'obstacle-full') {
          height = 2.0;
          yPos = 1.0;
          color = '#ff5500';
        } else if (cell.type === 'tunnel') {
          height = 2.5; // Visual height of tunnel structure
          yPos = 1.25;
          color = '#3333aa';
        } else if (cell.type === 'ramp') {
          height = 1.0;
          yPos = 0.5;
          color = '#00aa88';
        }

        // Apply behaviors coloring fallback
        if (cell.colorIdx && PALETTE_HEX[cell.colorIdx]) {
          color = PALETTE_HEX[cell.colorIdx];
        }

        // --- 1. Construct 2D Orthogonal Blueprint Meshes (Layer 1) ---
        let orthoMesh;
        if (cell.type === 'tunnel') {
          // Tunnel arch schematic
          const boxGeom = new THREE.BoxGeometry(TILE_WIDTH, height, TILE_LENGTH);
          const mat = new THREE.MeshBasicMaterial({ color: color, wireframe: false });
          orthoMesh = new THREE.Mesh(boxGeom, mat);
        } else if (cell.type === 'ramp') {
          // Slope geometry simplified
          const rampGeom = this.createBasicRampGeometry(TILE_WIDTH, TILE_LENGTH, cell.ramp?.startY || 0, cell.ramp?.endY || 1);
          const mat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
          orthoMesh = new THREE.Mesh(rampGeom, mat);
        } else {
          // Regular box
          const boxGeom = new THREE.BoxGeometry(TILE_WIDTH - 0.05, height, TILE_LENGTH - 0.05);
          const mat = new THREE.MeshBasicMaterial({ color: color });
          orthoMesh = new THREE.Mesh(boxGeom, mat);
        }
        orthoMesh.position.set(xPos, yPos, zPos);
        
        // Add block outline
        const edge = new THREE.EdgesGeometry(new THREE.BoxGeometry(TILE_WIDTH, height, TILE_LENGTH));
        const line = new THREE.LineSegments(edge, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
        orthoMesh.add(line);

        this.orthogonalGroup.add(orthoMesh);

        // --- 2. Construct 3D Textured PBR Meshes (Layer 0) ---
        let pbrMesh;
        
        // Retrieve or generate PBR material
        const pbrMat = this.getOrCreateMaterial(cell);

        if (cell.type === 'ramp') {
          const startY = cell.ramp?.startY || 0;
          const endY = cell.ramp?.endY || 1;
          const geom = this.createBasicRampGeometry(TILE_WIDTH, TILE_LENGTH, startY, endY);
          pbrMesh = new THREE.Mesh(geom, pbrMat);
          pbrMesh.position.set(xPos, 0, zPos);
        } else if (cell.type === 'tunnel') {
          // Build arch segment
          const geom = new THREE.BoxGeometry(TILE_WIDTH, 0.2, TILE_LENGTH);
          pbrMesh = new THREE.Mesh(geom, pbrMat);
          pbrMesh.position.set(xPos, height, zPos); // Ceiling
          
          // Left pillar
          const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.2, height, TILE_LENGTH), pbrMat);
          leftPillar.position.set(-TILE_WIDTH/2 + 0.1, -height/2, 0);
          pbrMesh.add(leftPillar);
          
          // Right pillar
          const rightPillar = leftPillar.clone();
          rightPillar.position.x = TILE_WIDTH/2 - 0.1;
          pbrMesh.add(rightPillar);
        } else {
          const geom = new THREE.BoxGeometry(TILE_WIDTH, height, TILE_LENGTH);
          pbrMesh = new THREE.Mesh(geom, pbrMat);
          pbrMesh.position.set(xPos, yPos, zPos);
        }

        pbrMesh.receiveShadow = true;
        pbrMesh.castShadow = typeof cell.type === 'string' && cell.type.startsWith('obstacle');

        // Apply decals onto faces in 3D
        if (cell.decals) {
          Object.keys(cell.decals).forEach(face => {
            const decalId = cell.decals[face];
            if (decalId && decalId !== 'none') {
              this.applyDecalMesh(pbrMesh, face, decalId, height, cell.decalText);
            }
          });
        }

        this.perspectiveGroup.add(pbrMesh);
      });
    });

    // Recursively apply correct layers to orthogonal and perspective groups
    this.orthogonalGroup.traverse(child => {
      child.layers.set(1);
    });
    this.perspectiveGroup.traverse(child => {
      child.layers.set(0);
    });

    this.rebuildHelperGrid();
    if (typeof window !== 'undefined' && window.__editorDebug) {
      window.__editorDebug.trigger('viewportRebuild', { step: 'rebuildMeshes' });
    }
  }

  /**
   * Helper to create 3D ramp geometry.
   */
  createBasicRampGeometry(w, l, y1, y2) {
    const w2 = w / 2;
    const l2 = l / 2;
    const yBottom = -0.2; // base depth

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

  /**
   * Constructs decal overlays and attaches them to blocks.
   */
  applyDecalMesh(parentMesh, face, decalId, blockHeight, customText = '') {
    if (!this.showDecals || this.collisionView) return;
    const decalGeom = new THREE.PlaneGeometry(1.2, 1.2);
    
    // Default symbol representation for high performance/simplicity
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Background clear
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 128, 128);
    
    // Icon color based on type
    ctx.fillStyle = decalId === 'hazard-stripes' ? '#ffaa00' : '#00ffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (decalId === 'arrow-up') {
      ctx.font = 'bold 80px sans-serif';
      ctx.fillText('▲', 64, 64);
    } else if (decalId === 'hazard-stripes') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 12;
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(0, 0, 128, 128);
      for (let i = -100; i < 200; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i - 40, 128);
        ctx.stroke();
      }
    } else if (decalId === 'logo') {
      ctx.font = 'bold 70px sans-serif';
      ctx.fillText('❖', 64, 64);
    } else if (decalId === 'custom') {
      ctx.fillStyle = '#ff00ff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(customText || 'WARN', 64, 64);
    }

    const decalTex = new THREE.CanvasTexture(canvas);
    const decalMat = new THREE.MeshBasicMaterial({
      map: decalTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4
    });

    const decalMesh = new THREE.Mesh(decalGeom, decalMat);

    // Position and rotate based on block face orientation
    const w = TILE_WIDTH / 2;
    const h = blockHeight / 2;
    const l = TILE_LENGTH / 2;
    const eps = 0.005; // tiny offset

    if (face === 'top') {
      decalMesh.position.set(0, h + eps, 0);
      decalMesh.rotation.x = -Math.PI / 2;
    } else if (face === 'bottom') {
      decalMesh.position.set(0, -h - eps, 0);
      decalMesh.rotation.x = Math.PI / 2;
    } else if (face === 'left') {
      decalMesh.position.set(-w - eps, 0, 0);
      decalMesh.rotation.y = -Math.PI / 2;
    } else if (face === 'right') {
      decalMesh.position.set(w + eps, 0, 0);
      decalMesh.rotation.y = Math.PI / 2;
    } else if (face === 'front') {
      decalMesh.position.set(0, 0, l + eps);
    } else if (face === 'back') {
      decalMesh.position.set(0, 0, -l - eps);
      decalMesh.rotation.y = Math.PI;
    }

    parentMesh.add(decalMesh);
  }

  /**
   * Retrieves or builds dynamic Three.js materials matching custom settings.
   */
  getOrCreateMaterial(cell) {
    if (this.collisionView) {
      let color = 0x00ff00; // default: road (green)
      if (cell.type === 'obstacle-half') {
        color = 0xffff00; // Half Obstacle: yellow
      } else if (cell.type === 'obstacle-full') {
        color = 0xff5500; // Full Obstacle: orange
      } else if (cell.type === 'tunnel') {
        color = 0x0000ff; // Tunnel: blue
      } else if (cell.type === 'ramp') {
        color = 0x00ffff; // Ramp: cyan
      }
      
      const cacheKey = `collision_${cell.type || 'road'}`;
      if (this.materialsCache.has(cacheKey)) {
        return this.materialsCache.get(cacheKey);
      }
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        wireframe: true
      });
      this.materialsCache.set(cacheKey, mat);
      return mat;
    }

    const matId = cell.materialId || 'default';
    
    // Check if using slot material
    if (matId !== 'default' && this.state.level.materials?.[matId]) {
      const config = this.state.level.materials[matId];
      const cacheKey = `${matId}_${config.color}_${config.roughness}_${config.metalness}_${config.emissive}`;
      
      if (this.materialsCache.has(cacheKey)) {
        return this.materialsCache.get(cacheKey);
      }

      // Build material parameters
      const params = {
        color: new THREE.Color(config.color),
        roughness: parseFloat(config.roughness),
        metalness: parseFloat(config.metalness),
      };

      // Handle emissive glow
      const emissiveStrength = parseFloat(config.emissive);
      if (emissiveStrength > 0.01) {
        params.emissive = new THREE.Color(config.color);
        params.emissiveIntensity = emissiveStrength * 2.0;
      }

      const mat = new THREE.MeshStandardMaterial(params);
      this.materialsCache.set(cacheKey, mat);
      return mat;
    }

    // Default basic material fallback
    const key = `def_${cell.colorIdx || 0}`;
    if (this.materialsCache.has(key)) {
      return this.materialsCache.get(key);
    }

    const hex = PALETTE_HEX[cell.colorIdx] || '#00ff66';
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex),
      roughness: 0.5,
      metalness: 0.3
    });
    this.materialsCache.set(key, mat);
    return mat;
  }

  /**
   * Helper to map viewport click coordinates back to game grid space.
   * Calculates raycasting intersection or orthogonal plane projections.
   */
  getRaycastCoordinates(viewportName, clientX, clientY) {
    const vp = this.viewports[viewportName];
    const rect = vp.domWrapper.getBoundingClientRect();
    
    // Normalize coordinates (-1 to 1)
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(2); // raycast grid guide plane
    raycaster.setFromCamera(mouse, vp.camera);

    // Create a virtual projection plane at active slice height/lane
    const plane = new THREE.Plane();
    
    if (viewportName === 'top') {
      // Top view plane is horizontal at height level index
      const activeY = this.state.ui.activePlaneHeight * 1.0;
      plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, activeY, 0));
    } else if (viewportName === 'front') {
      // Front view plane is vertical at active row Z
      const activeZ = -this.state.ui.activePlaneRow * TILE_LENGTH - TILE_LENGTH / 2;
      plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, activeZ));
    } else if (viewportName === 'side') {
      // Side view plane is vertical at active lane X
      const activeX = (this.state.ui.activePlaneLane - 3) * TILE_WIDTH;
      plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(1, 0, 0), new THREE.Vector3(activeX, 0, 0));
    } else {
      // 3D perspective - raycast onto standard ground plane
      plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0));
    }

    const intersection = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersection)) {
      // Convert intersection coordinates to Lane (X) and Row (Z)
      const lane = Math.round(intersection.x / TILE_WIDTH) + 3;
      const row = Math.floor(-intersection.z / TILE_LENGTH);
      const height = Math.round(intersection.y);

      const coords = {
        lane: Math.max(0, Math.min(6, lane)),
        row: Math.max(0, Math.min(this.state.level.rows.length - 1, row)),
        height: Math.max(0, Math.min(5, height)),
        raw: intersection
      };
      if (typeof window !== 'undefined' && window.__editorDebug) {
        window.__editorDebug.trigger('raycast', { viewportName, coords });
      }
      return coords;
    }
    
    return null;
  }

  /**
   * Main rendering loop execution.
   */
  render() {
    this.controls3D.update();
    const rect = this.container.getBoundingClientRect();

    // Clear whole screen first
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.setScissorTest(true);

    // Render each viewport in its respective DOM position
    Object.keys(this.viewports).forEach(key => {
      const vp = this.viewports[key];
      const vpRect = vp.domWrapper.getBoundingClientRect();
      
      // Calculate coordinates relative to main container
      const left = vpRect.left - rect.left;
      const bottom = rect.bottom - vpRect.bottom; // WebGL uses bottom-left origin

      this.renderer.setViewport(left, bottom, vpRect.width, vpRect.height);
      this.renderer.setScissor(left, bottom, vpRect.width, vpRect.height);
      this.renderer.render(this.scene, vp.camera);
    });
  }
}
