// SkyRoads Three.js Visual & Rendering Pipeline
import * as THREE from 'three';
import { SHIP_WIDTH, SHIP_HEIGHT, SHIP_LENGTH } from './physics.js';

export class GraphicsEngine {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.shipMesh = null;
    this.particles = [];
    this.starField = null;
    
    // Chase camera offsets
    this.camOffset = new THREE.Vector3(0, 1.8, 5.0); // Smooth chase camera behind ship
    this.camTargetOffset = new THREE.Vector3(0, 0.4, -3.0); // Target slightly ahead of ship
  }

  init(container) {
    // 1. Create Scene & Renderer
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0519, 0.007); // Mysterious retro fog

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    // 2. Setup Camera
    this.camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 3, 8);

    // 3. Add Premium Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15); // soft base ambient
    this.scene.add(ambientLight);

    // Dynamic neon pink directional light (simulating sun/moon shadow)
    this.sunLight = new THREE.DirectionalLight(0xff007f, 1.5);
    this.sunLight.position.set(50, 100, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 300;
    const d = 30;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // Neon blue secondary fill light
    const fillLight = new THREE.DirectionalLight(0x00ffff, 0.8);
    fillLight.position.set(-50, 50, -50);
    this.scene.add(fillLight);

    // 4. Create Background Skybox
    this.createSkybox();

    // 5. Create Player Spaceship
    this.createShipMesh();

    // Handle resize
    window.addEventListener('resize', () => this.handleResize(container));
  }

  createSkybox() {
    // A beautiful 3D starry skybox using a particle system
    const starCount = 2000;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Random points on a massive sphere of radius 400
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 400.0;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 100; // slightly shifted upwards
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Star colors: mixture of cyan, magenta, and white stars
      const rand = Math.random();
      if (rand < 0.3) {
        colors[i * 3] = 0.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0; // Cyan
      } else if (rand < 0.6) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.0; colors[i * 3 + 2] = 1.0; // Magenta
      } else {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0; // White
      }
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Star texture
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    
    const starTex = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      size: 2.0,
      map: starTex,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starField = new THREE.Points(geom, mat);
    this.scene.add(this.starField);

    // Render a gorgeous Synthwave Grid Horizon Plane
    const gridHelper = new THREE.GridHelper(800, 100, 0xff00ff, 0x00ffff);
    gridHelper.position.y = -8;
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);

    // Glowing Neon Synthwave Sun at the distant horizon
    const sunGeom = new THREE.CircleGeometry(50, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
    this.sunMesh.position.set(0, 20, -350);
    this.scene.add(this.sunMesh);
  }

  createShipMesh() {
    // Let's build a highly refined sleek modern 3D spaceship mesh!
    this.shipMesh = new THREE.Group();

    // Metallic premium materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x221144, // sleek deep indigo/purple
      roughness: 0.1,
      metalness: 0.9,
      bumpScale: 0.05
    });

    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc, // glowing turquoise neon highlights
      roughness: 0.1,
      metalness: 0.8
    });

    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      emissive: 0xff00ff,
      emissiveIntensity: 2.5
    });

    // 1. Center Body (sleek wedge)
    const bodyGeom = new THREE.ConeGeometry(0.3, SHIP_LENGTH, 4);
    bodyGeom.rotateX(Math.PI / 2); // Cone pointing forward (along negative Z)
    bodyGeom.scale(1.5, 0.7, 1.0);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    this.shipMesh.add(body);

    // 2. Sleek Wings
    const wingGeom = new THREE.BoxGeometry(SHIP_WIDTH, 0.06, 0.8);
    const leftWing = new THREE.Mesh(wingGeom, wingMat);
    leftWing.position.set(-0.45, -0.05, 0.2);
    leftWing.rotation.z = -0.15; // angled down slightly
    leftWing.castShadow = true;
    this.shipMesh.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeom, wingMat);
    rightWing.position.set(0.45, -0.05, 0.2);
    rightWing.rotation.z = 0.15;
    rightWing.castShadow = true;
    this.shipMesh.add(rightWing);

    // 3. Cockpit canopy (semi-transparent neon blue glass)
    const canopyGeom = new THREE.SphereGeometry(0.18, 16, 16);
    canopyGeom.scale(1.0, 1.0, 3.5);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      roughness: 0.0,
      metalness: 0.9,
      transparent: true,
      opacity: 0.7
    });
    const canopy = new THREE.Mesh(canopyGeom, canopyMat);
    canopy.position.set(0, 0.12, -0.15);
    this.shipMesh.add(canopy);

    // 4. Dual Jet Engines & Glowing Thrusters at the back
    const engineGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 8);
    engineGeom.rotateX(Math.PI / 2);

    const engineL = new THREE.Mesh(engineGeom, bodyMat);
    engineL.position.set(-0.16, -0.08, SHIP_LENGTH / 2 - 0.2);
    this.shipMesh.add(engineL);

    const engineR = new THREE.Mesh(engineGeom, bodyMat);
    engineR.position.set(0.16, -0.08, SHIP_LENGTH / 2 - 0.2);
    this.shipMesh.add(engineR);

    // Thruster neon nozzles
    const nozzleGeom = new THREE.CylinderGeometry(0.06, 0.05, 0.08, 8);
    nozzleGeom.rotateX(Math.PI / 2);

    this.nozzleL = new THREE.Mesh(nozzleGeom, glowMat);
    this.nozzleL.position.set(-0.16, -0.08, SHIP_LENGTH / 2 - 0.02);
    this.shipMesh.add(this.nozzleL);

    this.nozzleR = new THREE.Mesh(nozzleGeom, glowMat);
    this.nozzleR.position.set(0.16, -0.08, SHIP_LENGTH / 2 - 0.02);
    this.shipMesh.add(this.nozzleR);

    this.scene.add(this.shipMesh);
  }

  // Smoothly trail chase camera and update rendering
  update(physics, dt) {
    if (!this.shipMesh) return;

    // 1. Position the spaceship
    this.shipMesh.position.copy(physics.position);

    // Gentle banking (tilt) while steering left/right
    const targetRoll = -physics.velocity.x * 0.05; // banking angle
    this.shipMesh.rotation.z += (targetRoll - this.shipMesh.rotation.z) * 0.15;
    
    // Slight pitch up/down while jumping/falling
    const targetPitch = physics.velocity.y * 0.025;
    this.shipMesh.rotation.x += (targetPitch - this.shipMesh.rotation.x) * 0.15;

    // 2. Smooth Chase Camera
    const idealCamPos = physics.position.clone().add(this.camOffset);
    const idealCamTarget = physics.position.clone().add(this.camTargetOffset);

    // Interpolate camera position for buttery-smooth movements
    this.camera.position.lerp(idealCamPos, 0.1);
    
    // Look at target slightly ahead of the ship
    const currentTarget = new THREE.Vector3();
    this.camera.getWorldDirection(currentTarget);
    currentTarget.add(this.camera.position);
    currentTarget.lerp(idealCamTarget, 0.1);
    this.camera.lookAt(currentTarget);

    // Keep the directional sunlight aligned near the ship for optimal shadows
    this.sunLight.position.set(physics.position.x + 30, 80, physics.position.z + 40);
    this.sunLight.target = this.shipMesh;

    // Shift Starfield slightly to create parallax/infinite distance illusion
    if (this.starField) {
      this.starField.position.copy(physics.position);
    }
    if (this.sunMesh) {
      this.sunMesh.position.x = physics.position.x;
      this.sunMesh.position.z = physics.position.z - 350;
    }

    // 3. Update active particles (thrusters and explosions)
    this.updateParticles(physics, dt);
  }

  // Manage thrusters and crash explosions
  updateParticles(physics, dt) {
    // 1. Spawning thruster flames
    if (Math.abs(physics.velocity.z) > 0.5 && !physics.isDead) {
      const isBoosting = physics.activeEffects.boost;
      const isSticky = physics.activeEffects.sticky;
      
      const spawnCount = isBoosting ? 4 : 2;
      const sizeScale = isBoosting ? 1.5 : (isSticky ? 0.4 : 1.0);
      const color = isBoosting ? 0x00ff00 : 0xff00ff; // green thrusters on boost!

      for (let i = 0; i < spawnCount; i++) {
        // Spawn from engines
        const engineOffset = Math.random() < 0.5 ? -0.16 : 0.16;
        const pGeom = new THREE.SphereGeometry(0.04 * sizeScale * (Math.random() * 0.5 + 0.75), 8, 8);
        const pMat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.8
        });
        const pMesh = new THREE.Mesh(pGeom, pMat);
        
        // Spawn slightly behind engine nozzles
        pMesh.position.set(
          physics.position.x + engineOffset + (Math.random() * 0.05 - 0.025),
          physics.position.y - 0.08 + (Math.random() * 0.05 - 0.025),
          physics.position.z + SHIP_LENGTH / 2 + 0.1
        );

        this.scene.add(pMesh);

        this.particles.push({
          mesh: pMesh,
          velocity: new THREE.Vector3(
            Math.random() * 0.4 - 0.2,
            Math.random() * 0.4 - 0.2,
            5.0 + Math.random() * 5.0 // shoot particles backward (positive Z)
          ),
          life: 0.35, // short life
          maxLife: 0.35
        });
      }
    }

    // 2. Update existing particles (size decay & fading)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      } else {
        p.mesh.position.addScaledVector(p.velocity, dt);
        p.mesh.scale.setScalar(p.life / p.maxLife);
        p.mesh.material.opacity = p.life / p.maxLife;
      }
    }
  }

  // Spawn 150+ particles shooting out in all directions
  triggerExplosion(position) {
    const particleCount = 180;
    const colors = [0xff0055, 0x00ffff, 0xffaa00, 0xff00ff]; // vibrant neon explosion

    for (let i = 0; i < particleCount; i++) {
      const size = Math.random() * 0.15 + 0.05;
      const geom = new THREE.SphereGeometry(size, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(position);
      this.scene.add(mesh);

      // Random spherical velocity
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 4.0 + Math.random() * 12.0;

      const velocity = new THREE.Vector3(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta) + 4.0, // slight upward bias
        speed * Math.cos(phi)
      );

      this.particles.push({
        mesh: mesh,
        velocity: velocity,
        life: 1.5, // longer explosion life
        maxLife: 1.5
      });
    }

    // Hide the ship mesh when exploded
    if (this.shipMesh) {
      this.shipMesh.visible = false;
    }
  }

  clearLevel() {
    if (this.shipMesh) {
      this.shipMesh.visible = true;
    }
    // Clean up particles
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    this.particles = [];
  }

  handleResize(container) {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
