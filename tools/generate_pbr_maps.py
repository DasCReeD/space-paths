"""
PBR map generator — derives roughness, metalness, and emissive maps from a diffuse texture.
Usage: python generate_pbr_maps.py <diffuse_path> <output_dir> <theme_name>
"""
import sys
import os
from PIL import Image
import numpy as np


# Per-theme PBR biases: (base_roughness, base_metalness, emissive_sat_threshold, emissive_val_threshold)
THEME_PBR = {
    "core":       (0.55, 0.45, 160, 180),
    "cyberpunk":  (0.25, 0.55, 150, 160),
    "industrial": (0.80, 0.70, 200, 200),
    "organic":    (0.70, 0.10, 140, 160),
    "alien":      (0.35, 0.40, 120, 140),
    "furnace":    (0.85, 0.60, 110, 150),
    "glitch":     (0.30, 0.35, 130, 150),
    "pulse":      (0.40, 0.50, 140, 160),
    "ridge":      (0.65, 0.30, 160, 180),
    "shallows":   (0.50, 0.20, 150, 160),
    "spire":      (0.15, 0.55, 170, 190),
    "thrill":     (0.45, 0.50, 180, 200),
    "tundra":     (0.45, 0.20, 180, 200),
    "void":       (0.30, 0.60, 130, 140),
}
DEFAULT_PBR = (0.60, 0.35, 160, 170)


def generate_normal_map(img_gray: np.ndarray, strength: float = 3.0) -> Image.Image:
    arr = img_gray.astype(np.float32)
    dy, dx = np.gradient(arr)
    dx_s = dx * strength
    dy_s = dy * strength
    mag = np.sqrt(dx_s ** 2 + dy_s ** 2 + 128.0 ** 2)
    r = ((-dx_s / mag + 1.0) * 127.5).astype(np.uint8)
    g = ((-dy_s / mag + 1.0) * 127.5).astype(np.uint8)
    b = ((128.0 / mag + 1.0) * 127.5).astype(np.uint8)
    return Image.fromarray(np.stack([r, g, b], axis=-1))


def generate_roughness_map(img_rgb: np.ndarray, base_roughness: float) -> Image.Image:
    luminance = (
        0.2126 * img_rgb[:, :, 0] +
        0.7152 * img_rgb[:, :, 1] +
        0.0722 * img_rgb[:, :, 2]
    ).astype(np.float32)
    # Brighter/glossy areas → less rough; darker → rougher
    variation = 0.35
    rough = base_roughness - (luminance / 255.0 - 0.5) * variation
    rough = np.clip(rough, 0.0, 1.0)
    return Image.fromarray((rough * 255).astype(np.uint8), mode='L')


def generate_metalness_map(img_rgb: np.ndarray, base_metalness: float) -> Image.Image:
    r = img_rgb[:, :, 0].astype(np.float32)
    g = img_rgb[:, :, 1].astype(np.float32)
    b = img_rgb[:, :, 2].astype(np.float32)
    cmax = np.max(img_rgb, axis=2).astype(np.float32)
    cmin = np.min(img_rgb, axis=2).astype(np.float32)
    # Saturation in HSV space
    sat = np.where(cmax > 0, (cmax - cmin) / cmax, 0.0)
    # Low saturation (grey/silver) → more metallic
    metal = base_metalness + (1.0 - sat) * 0.3 - sat * 0.3
    metal = np.clip(metal, 0.0, 1.0)
    return Image.fromarray((metal * 255).astype(np.uint8), mode='L')


def generate_emissive_map(img_rgb: np.ndarray, sat_threshold: int, val_threshold: int) -> Image.Image:
    r = img_rgb[:, :, 0].astype(np.float32)
    g = img_rgb[:, :, 1].astype(np.float32)
    b = img_rgb[:, :, 2].astype(np.float32)
    cmax = np.max(img_rgb, axis=2).astype(np.float32)
    cmin = np.min(img_rgb, axis=2).astype(np.float32)
    sat = np.where(cmax > 0, (cmax - cmin) / cmax, 0.0)  # 0-1
    val = cmax  # 0-255

    # Pixels that are high saturation AND high value = neon/emissive
    emissive_mask = (sat >= sat_threshold / 255.0) & (val >= val_threshold)

    # Emissive map = original color where emissive, black elsewhere, slightly boosted
    em_r = np.where(emissive_mask, np.minimum(r * 1.4, 255), 0).astype(np.uint8)
    em_g = np.where(emissive_mask, np.minimum(g * 1.4, 255), 0).astype(np.uint8)
    em_b = np.where(emissive_mask, np.minimum(b * 1.4, 255), 0).astype(np.uint8)
    return Image.fromarray(np.stack([em_r, em_g, em_b], axis=-1))


def process(diffuse_path: str, output_dir: str, theme: str) -> None:
    if not os.path.exists(diffuse_path):
        print(f"Error: {diffuse_path} not found")
        sys.exit(1)
    os.makedirs(output_dir, exist_ok=True)

    img = Image.open(diffuse_path).convert("RGB")
    rgb = np.array(img)
    gray = np.array(img.convert("L"))

    base_r, base_m, sat_t, val_t = THEME_PBR.get(theme, DEFAULT_PBR)

    base = os.path.splitext(os.path.basename(diffuse_path))[0]
    # Replace _diffuse suffix with map type suffixes
    stem = base.replace("_diffuse", "")

    normal = generate_normal_map(gray, strength=3.5)
    roughness = generate_roughness_map(rgb, base_r)
    metalness = generate_metalness_map(rgb, base_m)
    emissive = generate_emissive_map(rgb, sat_t, val_t)

    normal.save(os.path.join(output_dir, f"{stem}_normal.png"))
    roughness.save(os.path.join(output_dir, f"{stem}_roughness.png"))
    metalness.save(os.path.join(output_dir, f"{stem}_metalness.png"))
    emissive.save(os.path.join(output_dir, f"{stem}_emissive.png"))
    print(f"[PBR] Generated normal/roughness/metalness/emissive for {stem} (theme={theme})")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python generate_pbr_maps.py <diffuse_path> <output_dir> <theme_name>")
        sys.exit(1)
    process(sys.argv[1], sys.argv[2], sys.argv[3])
