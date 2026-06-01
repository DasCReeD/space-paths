## 2026-06-01T14:36:15Z
You are Worker M4, working under directory: c:\dev\Sky roads\.agents\teamwork_preview_worker_m4\

Your mission is to implement the 3D Cockpit Console & Top-Down 2D Path Scanner Minimap in the codebase:
1. Review the analysis and proposals in:
   - Explorer 2 report: `c:\dev\Sky roads\.agents\teamwork_preview_explorer_m1_2\handoff.md` (for geometries, materials, and positioning math).
   - Explorer 3 report & files: `c:\dev\Sky roads\.agents\teamwork_preview_explorer_m1_3\handoff.md` and `proposed_minimap.js` (for path scanning, coordinate extraction, colors, and canvas scrolling rendering).
2. Replace the Flat DOM gameplay HUD overlay (speed, fuel, oxygen rings, and terrain status highlights) with a gorgeous, native 3D Cockpit Console rendered directly inside the Three.js viewport when in cockpit view mode. 
3. Build the 3D Cockpit Console using Three.js built-in geometries (such as `CylinderGeometry` or `BoxGeometry` for the dashboard bezel frame, `TorusGeometry` for speedometer/oxygen/fuel gauges, `OctahedronGeometry` or small capsules for status LEDs, and a `PlaneGeometry` dashboard slot for text/LCD readout). Make gauges and status lights read state dynamically from player velocity, fuel, oxygen, and terrain effects.
4. Integrate the Top-Down 2D Path Scanner Minimap into the dashboard cockpit console. Use the exact logic and drawing math in `proposed_minimap.js`:
   - Canvas-based scrolling path grid looking ahead 30 blocks and behind 2 blocks.
   - Smooth Y scrolling via row fractions (`(-position.z / TILE_LENGTH) % 1.0`).
   - Behavior color coding matching special terrain types (boost green, refill cyan, sticky dark green, slippery grey, burning red).
   - Dynamic player triangle indicator showing active position.
   - Render the canvas as a `CanvasTexture` mapped onto a dashboard `PlaneGeometry` slot inside the 3D cockpit console.
5. Setup robust responsive scaling and viewport auto-positioning: dynamically calculate local camera frustum bounds on window resize and reposition the cockpit group at the bottom edge, scaling it down on narrow/portrait aspects to prevent layout breaking or horizontal clipping.
6. Graceful fallbacks: if JSDOM testing, WebGL, or Canvas textures are absent or fail, fall back to basic material styling and legacy mock updates to ensure that:
   - JSDOM does not crash.
   - All existing tests pass perfectly (maintain legacy DOM HUD elements as hidden/mocked elements so existing tests checking `#hud-speed-text`, `#gauge-speed-ring`, etc. continue to pass).
7. Verify your implementation by running existing tests (`npm run test`) and implementing new unit tests in `tests/` verifying cockpit scene init, minimap coordinates extraction, responsive positioning, and fallbacks.
8. Deliver your findings and modified files in a handoff report at `c:\dev\Sky roads\.agents\teamwork_preview_worker_m4\handoff.md` and send a completion message.
