"""
Post-process generated diffuse textures to reduce oversaturation.
Per-theme saturation/hue adjustments to fix pinkish SD1.5 artifacts.
Only modifies *_diffuse.png files.
"""
import os
from PIL import Image, ImageEnhance
import colorsys

ASSETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'custom')

# Per-theme adjustments: (saturation_factor, value_factor, hue_shift_deg)
# saturation_factor < 1.0 reduces saturation, > 1.0 increases
# value_factor < 1.0 darkens, > 1.0 brightens
# hue_shift_deg rotates hue (degrees, -180 to 180)
THEME_ADJUSTMENTS = {
    'shallows': (0.65, 0.85, -15),   # very pink → shift toward blue-purple, desaturate
    'spire':    (0.80, 1.05, 0),     # slightly over-bright white
    'tundra':   (0.75, 0.95, 0),     # keep cool but less saturated
    'pulse':    (0.85, 0.90, 0),     # tone down
    'void':     (0.80, 0.90, 0),     # darken a bit
    'glitch':   (0.85, 0.90, 5),     # slight green shift away from pink
    'furnace':  (0.90, 0.88, 0),     # tone down orange/red intensity
    'ridge':    (0.85, 0.92, 0),
    'thrill':   (0.85, 0.92, 0),
    'core':     (0.85, 0.92, 0),
    'cyberpunk':(0.85, 0.92, 0),
    'industrial':(0.85, 0.92, 0),
    'alien':    (0.80, 0.90, 0),
    'organic':  (0.85, 0.92, 0),
}

def adjust_image(img, sat_factor, val_factor, hue_shift_deg):
    img = img.convert('RGB')
    pixels = list(img.getdata())
    adjusted = []
    hue_shift = hue_shift_deg / 360.0
    for r, g, b in pixels:
        h, s, v = colorsys.rgb_to_hsv(r/255.0, g/255.0, b/255.0)
        h = (h + hue_shift) % 1.0
        s = min(1.0, s * sat_factor)
        v = min(1.0, v * val_factor)
        nr, ng, nb = colorsys.hsv_to_rgb(h, s, v)
        adjusted.append((int(nr*255), int(ng*255), int(nb*255)))
    result = Image.new('RGB', img.size)
    result.putdata(adjusted)
    return result

processed = 0
for filename in os.listdir(ASSETS_DIR):
    if not filename.endswith('_diffuse.png'):
        continue
    # Match theme key as first part before first underscore
    parts = filename.split('_')
    if len(parts) < 2:
        continue
    theme_key = parts[0]
    if theme_key not in THEME_ADJUSTMENTS:
        continue
    sat, val, hue = THEME_ADJUSTMENTS[theme_key]
    filepath = os.path.join(ASSETS_DIR, filename)
    img = Image.open(filepath)
    adjusted = adjust_image(img, sat, val, hue)
    adjusted.save(filepath)
    print(f'  adjusted {filename} (sat={sat}, val={val}, hue={hue:+d}°)')
    processed += 1

print(f'\nDone — processed {processed} diffuse textures.')
