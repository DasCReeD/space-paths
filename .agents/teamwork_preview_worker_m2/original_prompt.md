## 2026-06-03T06:05:48Z

You are the Worker subagent. Your working directory is c:\dev\Sky roads\.agents\teamwork_preview_worker_m2.

Objective:
1. Fix the ReferenceError in `levelLoader.js` at line 910: change `cpPatternNormalUrl` to `customRoadNormalUrl` (which is imported at the top of the file but otherwise unused).
2. Create a comprehensive, production-grade guide at `docs/trellis_pixal3d_workflow_guide.md` addressing all the user's requirements (R1, R2, R3, R4) and the explorer's findings.
3. Create ComfyUI workflow JSON mapping templates in the workspace:
   - `docs/comfyui-workflows/trellis_pixal3d_mesh_workflow.json`
   - `docs/comfyui-workflows/trellis_pixal3d_pbr_workflow.json`
4. Run the project tests using `npm run test` to verify that all tests pass after your changes.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Detailed Requirements for the Guide (`docs/trellis_pixal3d_workflow_guide.md`):
- **Local Trellis / Pixal3D ComfyUI Setup Guide (R1)**:
  - Step-by-step local installation for PozzettiAndrea/ComfyUI-TRELLIS2 and Saganaki22/Pixal3D-ComfyUI.
  - Custom CUDA/Python dependencies (nvdiffrast, flash_attn, ninja) and how to resolve MSVC compiler setup issues on Windows.
  - Weight files and checkpoints download paths (JeffreyXiang/TRELLIS-image-to-3d, etc.).
  - Detailed low-VRAM (6GB+) optimization configuration: GGUF/NF4 quantization, FP8/FP16 mixed precision, --lowvram/--medvram ComfyUI execution flags, chunking mesh generation, offloading components, and disabling memory-intensive features.
  - Troubleshooting guide for CUDA Out of Memory, PyTorch extension compile errors, and GGUF quantization failures.
- **AAA 3D Geometry Workflow for Ships and Tunnels (R2)**:
  - Pipeline for converting raw AI-generated shapes into clean game-ready meshes (mesh cleanup, decimation, retopology, UV mapping).
  - Concrete mesh optimization rules: keeping polycount low for WebGL, using face-weighted normals for sharp metal bevels, and applying custom subdivisions.
  - Alignment constraints: Aligning coordinate axes (Y-up, Z-forward, facing Negative Z for standard Three.js loader) to prevent the 180-deg Y-rotation hack currently used.
  - Ship bounds discrepancy resolution: Strategy to address the 1.4w visual vs 0.6w physical collision box width discrepancy (e.g., resizing meshes to 0.6 width, or modifying SHIP_WIDTH in physics.js).
  - Tunnel clipping resolution: Recommend scaling 1-lane tunnels with a height scale factor of 1.5x-1.8x to prevent the 1.1h visual ship from clipping through the 1.0h tunnel ceiling.
- **AAA Texturing, Coloring, & PBR Skin Pipeline (R3)**:
  - Baking workflow using ComfyUI texture tools (e.g. Stable Projectorz or Modddif) to bake diffuse (albedo), normal, roughness, and metallic maps.
  - Thematic mappings: Baking configurations for Cyberpunk, Industrial, Alien, and Organic themes.
  - Three.js material system integration: mapping the baked maps to MeshStandardMaterial properties (map, normalMap, roughnessMap, metalnessMap) and configuring repeat/wrapping modes.
- **Highly Optimized Generation Prompts (R4)**:
  - Structured prompt bank for all 5 ship classes: Fighter, Hauler, Scout, Dreadnought, Cruiser. Include sci-fi paneling, panel lines, greebles, engine thrusters, and canopy glass.
  - Prompt bank for level themes: Tiling textures and tunnel archways matching Cyberpunk (neon grids), Industrial (riveted plates), Alien (stained glass, carapace), and Organic (wood/planks/moss) aesthetics.

Detailed Requirements for the JSON workflow files:
- Use structured JSON objects representing node-by-node maps of ComfyUI setups rather than empty or stubbed files. Include nodes for image loader, Trellis/Pixal3D model generation, mesh export, texturing, controlnet, and map outputs so the user can easily recreate the workflows.

Outputs:
- Save all requested files in their respective folders in the workspace.
- Create a `changes.md` in your working directory summarizing your changes, the files edited/written, and test verification output.
- Create `handoff.md` in your working directory following the Handoff Protocol.
- Send a message back to the orchestrator (conversation ID: a40a6ef8-9664-44cf-816c-7f6e8297356d) with the path to your handoff.md.
