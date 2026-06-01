# Established Industry Guidelines — Game Cockpit & Interface Design
**Lead UI/UX Architect Directive — Version 1.0**

Futuristic Anti-Gravity and Space Racing interfaces (e.g. *WipEout*, *Redout*, *Elite Dangerous*, *Distance*) require balancing high-speed cognitive processing with deep spatial immersion. The interface is not merely decorative; it is a critical instrument panel that supports split-second decision-making. 

The following guidelines are the mandatory rules and design standards for our Cockpit visual and functional layout.

---

## 🏎️ 1. Cognitive Ergonomics & Spatial Layout

### A. The Primary Sightline Rule (Obstruct-Free Core)
*   **The Golden Rule**: The central 40% of the viewport (the player's direct line of sight) must remain **100% unobstructed**. High-speed stellar navigation requires the player to spot block alignments, gaps, and obstacle boundaries instantly.
*   **Low-Profile Casing**: Casing bezels must be sloped downwards towards the center (e.g., trapezoidal or dipped arcs) to keep the vertical profile minimal.
*   **Vibration Dampening**: Any UI mounted to the physical dashboard must have a translation multiplier of exactly zero relative to camera jitter to prevent motion sickness and text blurring.

### B. Visor Projection Parallax
*   Gauges should feel like they are **holographically projected** onto a curved glass viewport rather than glued as a flat sticker.
*   Position gauges slightly forward in the 3D depth field (`z = -0.8`) with `transparent: true` to let the game world pass behind them, creating a natural parallax effect.

---

## 🎨 2. Color Hierarchy & Semantic Mapping

Color is the most potent communication channel. Adhere strictly to this semantic color palette to prevent cognitive confusion:

| Color Code | Hex Code | Visual Meaning | Active HUD State |
|:---:|:---:|---|---|
| **Primary Cyan** | `#00FFCC` | Normal operation, speed gauges, stable flight | Speed needle, default casing edge, LCD text |
| **Warning Yellow** | `#FFAA00` | Cautionary state, low oxygen, unstable steering | Oxygen tank under 25%, gravity spikes |
| **Critical Red** | `#FF003C` | Immediate threat, death zones, out of fuel | Fuel tank under 20%, burning terrain ahead |
| **Positive Green** | `#39FF14` | Power boost, speed refills, thruster active | Active speed boost state, recovery tiles |

---

## 💎 3. Specular Contrast & Material Refraction

To elevate the visual polish to AAA standard:
*   **Refractive Lens Glass**: Dials and LCD screens must be overlaid with a glossy, semi-transparent dome (`THREE.TorusGeometry` or `THREE.SphereGeometry` caps) utilizing a physical material with:
    *   `transmission: 0.85` (high refraction)
    *   `roughness: 0.05`
    *   `metalness: 0.1`
    *   `clearcoat: 1.0`
    This catches highlight reflections from track neon lights as the ship navigates.
*   **Polycarbonate Glassmorphic Bezel**: The dashboard plate is a tinted polycarbonate shard with:
    *   `opacity: 0.55`
    *   `transparent: true`
    *   `roughness: 0.15`
    *   `metalness: 0.9`

---

## 📺 4. Telemetry Readout & CRT Scanlines

The diagnostics LCD panel must resemble high-precision hardware:
*   **CRT Scanline Shader**: Draw subtle horizontal grid scanlines (`rgba(0, 255, 204, 0.06)`) spaced exactly 4px apart.
*   **Holographic Text Shadow**: Layer a second, blurred copy of the text (`ctx.shadowColor = '#00ffcc'`, `ctx.shadowBlur = 4`) slightly offset to mimic CRT phosphor bleed.

---

## ⚠️ 5. Reactive Game Loop Alerts (Redundancy Rule)

Never rely on a single visual source to convey critical state changes:
*   **Low Fuel Feedback Loop**:
    1.  *Fuel Dial*: Scale transitions to red and pulses in size.
    2.  *LCD Panel*: The word `FUEL` flashes `WARNING` in red.
    3.  *Border*: Outer neon outline of the cockpit console flashes red.
*   **Low Oxygen Feedback Loop**:
    1.  *Oxygen Dial*: Scale transitions to yellow.
    2.  *LCD Panel*: Text flashes `OXY LEVEL CRITICAL` in yellow.

---

## 🗺️ 6. Corner Minimap Guidelines
*   The minimap must occupy the **far peripheral corner** (recommended right corner, `x = 0.44`).
*   **Dynamic Lane Mapping**: The track lanes must be color-coded using the level's actual color palette so the player can scan the coming lane blocks dynamically.
*   **Obstacle Bounds**: Obstacles are drawn in stark high-contrast white with a subtle red outline.
