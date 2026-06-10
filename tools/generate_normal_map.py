import sys
import os
from PIL import Image
import numpy as np

def generate_normal_map(input_path, output_path, strength=2.5):
    if not os.path.exists(input_path):
        print(f"Error: Input path does not exist: {input_path}")
        return False
    
    try:
        # Load image and convert to grayscale (representing height)
        img = Image.open(input_path)
        img_gray = img.convert("L")
        
        # Convert to numpy float array
        arr = np.array(img_gray, dtype=np.float32)
        
        # Calculate gradients using central differences (highly efficient)
        dy, dx = np.gradient(arr)
        
        # Scale gradients by strength factor
        dx_scaled = dx * strength
        dy_scaled = dy * strength
        
        # Compute magnitude to normalize vectors (standardizing length to 1)
        magnitude = np.sqrt(dx_scaled**2 + dy_scaled**2 + 128.0**2)
        
        nx = -dx_scaled / magnitude
        ny = -dy_scaled / magnitude
        nz = 128.0 / magnitude
        
        # Map normal range [-1.0, 1.0] to pixel range [0, 255]
        r = ((nx + 1.0) * 127.5).astype(np.uint8)
        g = ((ny + 1.0) * 127.5).astype(np.uint8)
        b = ((nz + 1.0) * 127.5).astype(np.uint8)
        
        # Combine channels into RGB image
        normal_arr = np.stack([r, g, b], axis=-1)
        normal_img = Image.fromarray(normal_arr)
        
        normal_img.save(output_path, "PNG")
        print(f"Successfully generated normal map: {output_path}")
        return True
    except Exception as e:
        print(f"Error generating normal map: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_normal_map.py <input_path> <output_path> [strength]")
        sys.exit(1)
        
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    strength = 2.5
    if len(sys.argv) >= 4:
        strength = float(sys.argv[3])
        
    success = generate_normal_map(input_path, output_path, strength)
    if not success:
        sys.exit(1)
