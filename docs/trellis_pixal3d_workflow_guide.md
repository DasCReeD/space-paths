# Trellis & Pixal3D AAA 3D Asset Pipeline Guide

This guide details the complete pipeline for generating, optimizing, texturing, and integrating high-quality AAA-grade 3D assets (spaceships, tunnels, and level themes) into the Three.js-based modern Sky Roads WebGL engine using **TRELLIS** (image-to-3d) and **Pixal3D** (PBR texturing).

---

## 1. Local Trellis / Pixal3D ComfyUI Setup Guide (R1)

### 1.1 Step-by-Step Installation
To run the generation pipeline locally, you must integrate the custom nodes into your ComfyUI setup:

1. **Clone the Repositories**:
   Navigate to your ComfyUI `custom_nodes/` directory and run:
   ```bash
   git clone https://github.com/PozzettiAndrea/ComfyUI-TRELLIS2.git
   git clone https://github.com/Saganaki22/Pixal3D-ComfyUI.git
   ```
2. **Install Main Dependencies**:
   Open a terminal in your ComfyUI python environment and install the required base libraries:
   ```bash
   pip install trimesh scipy diffusers transformers accelerate einops omegaconf
   ```

### 1.2 Custom CUDA & Python Compilation Dependencies
TRELLIS relies on high-performance CUDA extensions (`nvdiffrast`, `flash-attn`, and `ninja`) for rasterization and fast attention:

1. **Install Ninja**:
   Ninja speed-up compilation of C++/CUDA extensions.
   ```bash
   pip install ninja
   ```
2. **Setup MSVC Compiler on Windows**:
   Compiling CUDA extensions on Windows requires Microsoft Visual C++ (MSVC):
   * Install **Visual Studio Community** (or Build Tools) from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/).
   * Select the **"Desktop development with C++"** workload during installation.
   * Add `cl.exe` to your system environment variables. Usually located at:
     `C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\<version>\bin\Hostx64\x64`
   * Open the **"x64 Native Tools Developer Command Prompt for VS 2022"** to run ComfyUI if compiler errors persist.
3. **Compile or Install Pre-built Wheels**:
   * **nvdiffrast**:
     ```bash
     pip install git+https://github.com/NVlabs/nvdiffrast.git
     ```
   * **flash-attn**:
     * Avoid compiling manually if possible. Download pre-compiled `.whl` files matching your PyTorch and CUDA versions from the [official FlashAttention releases page](https://github.com/Dao-AILab/flash-attention/releases).
     * Install via: `pip install flash_attn-2.x.x+cu121torch2.1-cp310-cp310-win_amd64.whl`

### 1.3 Weight Files & Checkpoints Download Paths
Download the following models and save them in the correct directories:

1. **TRELLIS Image-to-3D Checkpoints**:
   * Repository: [JeffreyXiang/TRELLIS-image-to-3d](https://huggingface.co/JeffreyXiang/TRELLIS-image-to-3d)
   * Weight files (sparse structure generator, flow matching transformer, image/mesh embedders) should be placed under:
     `ComfyUI/models/trellis/` or downloaded automatically via Hugging Face Hub (which caches to `~/.cache/huggingface/hub/`).
2. **Pixal3D Checkpoints**:
   * Download the base diffusion texturing weights (e.g. Stable Diffusion 1.5 or custom fine-tunes like Saganaki22's model weights) and place them in:
     `ComfyUI/models/checkpoints/`

### 1.4 Detailed Low-VRAM (6GB+) Optimization Configuration
To execute this heavy 3D generation pipeline on consumer GPUs with limited VRAM (6GB to 8GB), implement the following optimizations:

1. **Quantization**:
   * Use **GGUF** or **NF4 (NormalFloat4)** quantized checkpoints for the sparse structure generator and the flow matching transformer.
   * Enable FP8 precision parameters inside ComfyUI: `--fp8_e4m3fn` (or `--fp8_e5m2`) execution flags.
2. **ComfyUI Startup Flags**:
   Run ComfyUI with aggressive VRAM offloading arguments:
   ```bash
   python main.py --lowvram
   ```
   *(For 8GB cards, `--medvram` is recommended to maintain decent processing speeds).*
3. **Memory Offloading**:
   Inside the `TRELLIS Model Loader` node, enable **CPU Offload**. This unloads the massive structural latent flow matching model from VRAM to system RAM as soon as it completes, freeing up space for the mesh synthesis and voxelization models.
4. **Voxel Grid & Resolution Tuning**:
   * Reduce the Sparse Voxel Grid Resolution setting from 512 to **256** or **192**. This dramatically drops memory consumption during voxel structure generation.
   * Decrease **diffusion steps** for sparse structure sampling from 50 to **25** or **30**.
5. **Chunking Mesh Generation**:
   * Set mesh generation chunk sizes to small values in the exporter node config. This synthesizes the mesh surfaces iteratively, bypassing massive memory spikes.
   * Disable secondary mesh processing options (such as heavy mesh laplacian smoothing or automatic high-density subdivide) during export.

### 1.5 Troubleshooting Setup Issues
* **CUDA Out of Memory**: Reduce input image resolution to `512x512`. Toggle `--lowvram` flag and set `experimental_garbage_collector` to `true` in PyTorch.
* **PyTorch extension compile errors**: Ensure `cl.exe` is accessible via command-line. Set environment variable `DISTUTILS_USE_SDK=1` and run the compilation.
* **GGUF quantization failures**: Ensure `bitsandbytes` package is updated to version `>=0.41.1` and matches the PyTorch CUDA toolkit runtime version.

---

## 2. AAA 3D Geometry Workflow for Ships and Tunnels (R2)

AI-generated meshes are often messy, high-poly "triangular soups." To make them game-ready for WebGL (Three.js), apply this optimization pipeline:

```
[AI Shape (GLB)] ──> [Mesh Cleanup & Decimation] ──> [Retopology (Quads)] ──> [UV Mapping] ──> [Export]
```

### 2.1 Mesh Decimation, Retopology & UV Mapping Pipeline

To optimize raw generated shapes in Blender efficiently, use the following workflow and essential shortcuts:

#### Essential Blender Shortcuts & Hotkeys
* **`Tab`**: Toggle between **Object Mode** (for transform and modifiers) and **Edit Mode** (for geometry editing).
* **`1` / `2` / `3`** (in Edit Mode): Switch selection mode to **Vertex**, **Edge**, or **Face** respectively.
* **`A`** (in Edit Mode): Select all geometry.
* **`M` ➔ `By Distance`** (in Edit Mode): Merge duplicate/overlapping vertices to clean up the mesh.
* **`Alt+N` ➔ `Recalculate Outside`** (in Edit Mode): Recalculate face normals outward to resolve shading issues.
* **`U`** (in Edit Mode): Access the **UV Mapping** menu.
  * Select edges along panel seams ➔ **`U` ➔ `Mark Seam`** to set texture boundaries.
  * Select all faces ➔ **`U` ➔ `Unwrap`** to generate the UV layout.

#### Step-by-Step Optimization Workflow
1. **Cleanup**: Import the generated model into Blender. Delete loose components, internal triangles, and invisible geometries (such as internal cabin structures). Use **`A`** and **`M` ➔ `By Distance`** to merge duplicate vertices.
2. **Decimation**: Apply the **Decimate Modifier** (Collapse mode) to reduce polycount (see settings below).
   * Target **5,000 to 15,000 triangles** for spaceships.
   * Target **1,000 to 2,500 triangles** for tunnel archway segments.
3. **Retopology**: Use Blender's built-in **QuadriFlow** tool (or Instant Meshes) to create clean quad-based topologies. Quad-flow topology ensures lighting and normals calculate correctly.
4. **UV Unwrapping**: Unwrap the clean low-poly mesh. Avoid automatic smart UV projects which create hundreds of tiny islands. Mark manual seams along natural panel joints and lay out UVs with a margin of 16px to prevent mipmap bleeding.

---

### 2.2 Concrete Modifier Configurations

To ensure clean game-ready meshes, configure the following modifiers in Blender:

1. **Decimate Modifier**:
   * **Type**: `Collapse`
   * **Ratio**: Calculated programmatically based on the target count:
     $$\text{Ratio} = \frac{\text{Target Triangles}}{\text{Current Triangles}}$$
   * **Symmetry**: Enabled along the X-axis for symmetric ship models to maintain visual balance.
2. **Weighted Normal Modifier**:
   * **Weighting Mode**: `Face Area` (flat panels stay flat, while shading transitions happen only at the bevel boundaries).
   * **Keep Sharp**: Checked `True`.
   * **Requirement**: Ensure **Auto Smooth** is enabled in the Mesh Data Properties (under Normals, set to `30°` or `45°`).
3. **Triangulate Modifier**:
   * **Quad Method**: `Shortest Diagonal` or `Beauty` (prevents awkward geometry distortion on non-planar quads).
   * **N-gon Method**: `Beauty` (maintains shape fidelity for complex flat shapes).

---

### 2.3 Python Script for Batch-Processing (OBJ to Optimized GLB)

The following Python script automates the importing, pivot centering, coordinate alignment, modifier application, and GLB exporting for multiple ship models. Run it using Blender's headless mode (`blender --background --python batch_process.py`) or in Blender's Python Console:

```python
import bpy
import mathutils
import os
import math

def batch_process_objs(input_dir, output_dir, target_tris=10000):
    """
    Imports OBJs from input_dir, cleans up, centers pivots, aligns coordinate axes 
    (Y-Up, Negative Z-Forward), applies Decimate, Weighted Normal, and Triangulate 
    modifiers, and exports as optimized GLB.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for filename in os.listdir(input_dir):
        if not filename.lower().endswith(".obj"):
            continue

        input_path = os.path.join(input_dir, filename)
        output_path = os.path.join(output_dir, os.path.splitext(filename)[0] + ".glb")
        print(f"\nProcessing asset: {filename}...")

        # 1. Clear existing mesh objects
        bpy.ops.object.select_all(action='DESELECT')
        bpy.ops.object.select_by_type(type='MESH')
        bpy.ops.object.delete()

        # 2. Import Wavefront OBJ
        bpy.ops.wm.obj_import(filepath=input_path)
        
        # Get imported mesh object
        imported_objs = [o for o in bpy.context.selected_objects if o.type == 'MESH']
        if not imported_objs:
            print(f"[Warning] No mesh found in {filename}")
            continue
            
        # Target the primary mesh (or join if multiple parts)
        obj = imported_objs[0]
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        
        if len(imported_objs) > 1:
            bpy.ops.object.join()
            
        obj.name = os.path.splitext(filename)[0]

        # 3. Clean up vertices
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles(threshold=0.0001)  # Merge duplicate vertices
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')

        # 4. Align Coordinate Axes & Set Pivot to bottom-center
        # Calculate bounding box dimensions
        local_coords = [mathutils.Vector(corner) for corner in obj.bound_box]
        world_coords = [obj.matrix_world @ v for v in local_coords]
        
        min_x = min(v.x for v in world_coords)
        max_x = max(v.x for v in world_coords)
        min_y = min(v.y for v in world_coords)
        max_y = max(v.y for v in world_coords)
        min_z = min(v.z for v in world_coords)
        max_z = max(v.z for v in world_coords)

        # Center pivot horizontally, bottom-most vertically
        center_x = (min_x + max_x) / 2.0
        center_y = (min_y + max_y) / 2.0
        bottom_z = min_z

        # Position 3D cursor at bottom center and adjust origin
        bpy.context.scene.cursor.location = (center_x, center_y, bottom_z)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR', center='MEDIAN')
        
        # Move object to world origin
        obj.location = (0, 0, 0)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

        # 5. Apply Modifiers
        # Estimate triangle count
        current_tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        print(f"Original triangle count estimate: {current_tris}")

        # Decimate Modifier
        if current_tris > target_tris:
            dec_ratio = target_tris / current_tris
            dec_mod = obj.modifiers.new(name="Decimate", type='DECIMATE')
            dec_mod.decimate_type = 'COLLAPSE'
            dec_mod.ratio = dec_ratio
            print(f"Applying Decimate (ratio: {dec_ratio:.4f})")

        # Enable Auto Smooth (Blender <4.1) or add Smooth by Angle modifier (Blender >=4.1)
        try:
            obj.data.use_auto_smooth = True
            obj.data.auto_smooth_angle = math.radians(30.0)
        except AttributeError:
            # For Blender 4.1+, use the Smooth by Angle modifier
            smooth_mod = obj.modifiers.new(name="SmoothByAngle", type='SMOOTH_BY_ANGLE')
            smooth_mod.angle = math.radians(30.0)

        # Weighted Normal Modifier
        wn_mod = obj.modifiers.new(name="WeightedNormal", type='WEIGHTED_NORMAL')
        wn_mod.keep_sharp = True
        wn_mod.weight_mode = 'FACE_AREA'
        print("Applying Weighted Normal (Face Area)")

        # Triangulate Modifier
        tri_mod = obj.modifiers.new(name="Triangulate", type='TRIANGULATE')
        tri_mod.quad_method = 'SHORTEST_DIAGONAL'
        tri_mod.ngon_method = 'BEAUTY'
        print("Applying Triangulate (Shortest Diagonal / Beauty)")

        # Apply modifiers programmatically to finalize the geometry
        for mod in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)

        # 6. Export to GLB with axes alignment
        # Blender uses Z-Up. The GLTF/GLB exporter auto-converts to Three.js Y-Up.
        # Ensure 'export_yup=True' is set. We also apply all transforms.
        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            use_selection=True,
            export_yup=True
        )
        print(f"[Success] Optimized and saved: {output_path}")

# Run the batch process (customize paths as needed)
if __name__ == "__main__":
    # Example execution directories inside local project structure
    input_directory = "./assets/raw_ships"
    output_directory = "./assets/custom"
    
    # Create mock folders for demonstration if they don't exist
    if os.path.exists(input_directory):
        batch_process_objs(input_directory, output_directory, target_tris=8000)
```

---

### 2.4 Alignment and Coordinate Constraints

To eliminate the `rotation.y = -Math.PI / 2` or `Math.PI` hacks currently used during asset loading in `graphics.js`:
* **Export Axes**: Export your 3D models from Blender with:
  * **Up Axis**: `Y-Up`
  * **Forward Axis**: `Negative Z-Forward` (facing the camera by default).
* **Pivot Alignment**: The pivot point of the mesh must be placed at the **horizontal center** and **bottom-most vertex** of the ship (or tunnel). This aligns the physics collision box origin with the 3D model's visual origin.

### 2.5 Ship Bounds Discrepancy Resolution

* **The Discrepancy**: The ship's physical collision width is hardcoded at `0.6` (`SHIP_WIDTH = 0.6` in `physics.js`), but the visual asset loaded via `graphics.js` is scaled to a width of `1.4` (`targetWidth = 1.4`). This creates a buffer zone where players clip through obstacles visually without crashing, or crash when they look clear.
* **Resolution Plan**:
  1. **Option A (Highly Recommended)**: Scale down visual meshes during retopology/export to exactly `0.6` width. If using custom GLTF imports, adjust `targetWidth` in `graphics.js` to `0.6`.
  2. **Option B (Physically Accurate)**: Change `SHIP_WIDTH` in `physics.js` to `0.8` or `1.0` (widening collision parameters) and scale visual models to match. If this is done, road layouts and tunnels must be widened accordingly to prevent impossible passages.
  3. **Implementation Reference**:
     ```javascript
     // Aligning target width to physical box in graphics.js
     const targetWidth = SHIP_WIDTH; // 0.6 instead of 1.4
     ```

### 2.6 Tunnel Clipping Resolution

* **The Clipping Issue**: Standard 1-lane tunnels span 1 tile width (`TILE_WIDTH = 2.0`), giving the archway a radius of `1.0`. The ceiling height at the apex is therefore `1.0`. Since the visual ship has a height clearance of `1.1`, the ship stabilizer fins clip through the tunnel ceiling.
* **Resolution**:
  * Implement an elliptical tunnel archway rather than a perfect circle, or scale the 1-lane tunnel model with a height scale factor of **1.5x to 1.8x**. This ensures the apex clearance height is at least `1.5` to `1.8` units, preventing collision visual overlaps.

---

## 3. AAA Texturing, Coloring, & PBR Skin Pipeline (R3)

### 3.1 Baking Workflow using ComfyUI Texturing Tools
Using **Stable Projectorz** or **Modddif** nodes in ComfyUI, bake high-definition PBR maps onto your optimized low-poly UV layouts:

1. **Albedo/Diffuse Map**: Bake flat base colors, panel markings, and canopy outlines. Avoid baking directional lighting or shadows. Include ambient occlusion (AO) subtly in the color channel.
2. **Normal Map**: Bake high-poly bevels, panel lines, bolts, and rivets from a high-poly sculpt onto the low-poly normal layout.
3. **Roughness Map**: Grayscale map (black = glossy glass, white = matte rough plating).
   * Canopy glass: `0.05` roughness.
   * Sleek metal panels: `0.15` - `0.30`.
   * Carbon fiber/Composite details: `0.50` - `0.70`.
4. **Metallic Map**: Grayscale map (black = painted sections, composite materials, glass; white = bare titanium, alloy plating).

### 3.2 Thematic Baking Configurations
Implement these thematic parameters during ComfyUI PBR texturing:

| Theme | Diffuse (Albedo) | Normal Map Style | Roughness Range | Metallic Range | Emissive Maps |
|---|---|---|---|---|---|
| **Cyberpunk** | Dark violet, black, cyan panel trims | Microcircuit lines, sleek panels | `0.10` - `0.35` | `0.75` - `0.95` | Neon cyan & magenta grids, glowing decal indicators |
| **Industrial** | Steel grey, hazard yellow, rusted borders | Heavy bolts, overlapping plates | `0.40` - `0.70` | `0.60` - `0.85` | Red warnings, orange thruster glows |
| **Alien** | Iridescent purple, deep organic greens | Chitinous scales, ribbed biological veins | `0.15` - `0.45` | `0.40` - `0.75` | Biological bioluminescent channels |
| **Organic** | Bark wood grain, forest green moss | Wood knots, rough bark grain | `0.65` - `0.90` | `0.00` - `0.15` | Soft green fungal spores, glowing runes |

### 3.3 Three.js Material Integration
Map the baked textures directly to `THREE.MeshStandardMaterial`:
```javascript
const textureLoader = new THREE.TextureLoader();

const diffuseMap = textureLoader.load('assets/custom/ship_diffuse.png');
const normalMap = textureLoader.load('assets/custom/ship_normal.png');
const roughnessMap = textureLoader.load('assets/custom/ship_roughness.png');
const metalnessMap = textureLoader.load('assets/custom/ship_metallic.png');
const emissiveMap = textureLoader.load('assets/custom/ship_emissive.png');

// Configure wrapping and repeat
[diffuseMap, normalMap, roughnessMap, metalnessMap, emissiveMap].forEach(tex => {
  if (tex) {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 16;
  }
});

const shipMaterial = new THREE.MeshStandardMaterial({
  map: diffuseMap,
  normalMap: normalMap,
  normalScale: new THREE.Vector2(1.5, 1.5),
  roughnessMap: roughnessMap,
  metalnessMap: metalnessMap,
  emissiveMap: emissiveMap,
  emissive: new THREE.Color(0xffffff), // tinted by the emissive map
  emissiveIntensity: 3.0,
});
```

---

## 4. Highly Optimized Generation Prompts (R4)

To ensure the AI models generate optimal, high-fidelity geometry and texturing textures, use these structured prompt banks:

### 4.1 Spaceship Generation Prompts (TRELLIS)
TRELLIS requires crisp input images. Generate concept images using the following prompts before feeding them to the 3D pipeline:

* **Fighter Class**:
  * *Prompt*: `Concept art of a sleek sci-fi fighter spaceship, speed interceptor, sharp swept-forward wings, dual laser cannons mounted on wingtips, clear glass cockpit canopy, titanium hull panels, micro-greebles, engine thrusters, facing camera, orthographic isolated white background, photorealistic 8k, Unreal Engine 5 render.`
  * *Negative*: `background noise, distortion, shadow, humans, organic parts, low resolution, sketch.`
* **Hauler Class**:
  * *Prompt*: `Concept art of a heavy industrial cargo hauler spaceship, bulky blocky armored chassis, massive cargo shipping containers strapped to sides, heavy-duty engine cluster, warning hazard stripes, raw iron plating, rivets, greebles, isolated white background, 3D orthographic view, industrial sci-fi aesthetic.`
  * *Negative*: `sleek, aerodynamic, fighter jets, biological elements, smooth chrome.`
* **Scout Class**:
  * *Prompt*: `Concept art of a light scout reconnaissance spaceship, stealth radar dishes, thin sleek fuselage, needle-like sensors, matte black composite panels, minimal glowing engines, asymmetrical wing elements, isolated white background, high-tech stealth vehicle design, futuristic.`
  * *Negative*: `bulky, weapons, heavy armaments, rusty plates, cargo containers.`
* **Dreadnought Class**:
  * *Prompt*: `Concept art of a colossal dreadnought battleship spaceship, massive wedge-shaped armored design, multiple gun turrets, visible structural rib reinforcements, heavy launch bays, dark steel paneling, micro greebles, capital ship, command bridge, isolated white background.`
  * *Negative*: `small glider, curved biological shapes, light speed craft.`
* **Cruiser Class**:
  * *Prompt*: `Concept art of a multi-role cruiser military spaceship, balanced aerodynamic chassis, communication arrays, dual engine pods, glowing blue sensor strips, grey alloy plating, clean panel lines, military spaceship design, isolated white background.`
  * *Negative*: `organic structures, junk ships, single-seat gliders.`

### 4.2 Level Theme Texture Generation Prompts (Pixal3D)
Use these tiling prompts to generate high-fidelity textures for the road tiles, tunnels, and obstacles:

* **Cyberpunk Grid Theme**:
  * *Prompt*: `Seamless tiling cyberpunk metal plate texture, glowing neon cyan and magenta grid lines, dark polished chrome panels, high-tech circuit tracks, emissive light channels, futuristic sci-fi city road surface, PBR texture mapping, high resolution.`
* **Industrial Metal Theme**:
  * *Prompt*: `Seamless tiling industrial steel deck texture, overlapping steel plates, heavy circular rivets, dirty grease stains, yellow and black warning hazard stripes, rusted iron borders, non-slip tread plate pattern, PBR maps.`
* **Alien / Stained Glass Theme**:
  * *Prompt*: `Seamless tiling alien chitinous carapace texture, organic stained-glass mosaic panels, bio-luminescent emerald green veins, dark violet scales, iridescent biological shell plating, sci-fi alien temple floor, PBR.`
* **Organic Theme**:
  * *Prompt*: `Seamless tiling organic mossy wood plank texture, weathered bark, twisting roots, green moss growth, ancient forest wood, PBR texture.`
