"""
Upscale all generated diffuse textures from 512x512 → 1024x1024 using LANCZOS.
This smooths out SD1.5 hard-edge artifacts and reduces pixelation at close range.
Run after generate_comfy_textures.js and fix_texture_saturation.py.
"""
import os
from PIL import Image

ASSETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'custom')
TARGET_SIZE = (1024, 1024)

processed = 0
for filename in sorted(os.listdir(ASSETS_DIR)):
    # Only upscale diffuse textures — normal/roughness/metalness don't benefit as much
    if not filename.endswith('_diffuse.png'):
        continue
    filepath = os.path.join(ASSETS_DIR, filename)
    img = Image.open(filepath)
    if img.size == TARGET_SIZE:
        continue  # already upscaled
    upscaled = img.resize(TARGET_SIZE, Image.LANCZOS)
    upscaled.save(filepath, optimize=False)
    print(f'  {img.size} → {TARGET_SIZE}  {filename}')
    processed += 1

print(f'\nDone — upscaled {processed} diffuse textures to {TARGET_SIZE[0]}×{TARGET_SIZE[1]}.')
print('Run generate_pbr_maps.py again to regenerate PBR maps at the new resolution.')
