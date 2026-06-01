Milestone 2: Branching and Decoupling
1. Create and switch to a new git branch named `feature/nextgen-graphics` (if it does not exist yet; if it does, switch to it).
2. Completely remove, decouple imports, loading configurations, and usage of the large static `skybox_space_nebula.png` file in the codebase (e.g. in `graphics.js` lines 5, 424-450).
3. Delete the file `skybox_space_nebula.png` (or ensure it is completely unused/decoupled and removed from git tracking).
4. In `graphics.js:createSkybox()`, replace the sphere's material with a simple placeholder `THREE.MeshBasicMaterial` of a solid deep space color (e.g. `color: 0x0a0210`) so the game compiles and runs successfully without the static texture.
5. Verification: Propose / run a build or check that the server still starts/compiles cleanly. Stage and commit your changes directly to the `feature/nextgen-graphics` branch.
6. Write a report of your changes in `c:\dev\Sky roads\.agents\worker_m2\changes.md` and a handoff report in `c:\dev\Sky roads\.agents\worker_m2\handoff.md`.
