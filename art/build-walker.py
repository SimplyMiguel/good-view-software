"""Build the hero walker frames from video frames.

Extracts frames from the hoodie walk video, keys out the magenta background,
registers/aligns them, and downscales to pixel art (35x47).

Frames:
  walk1-4  looping walk cycle
  turn     half-turn from side to front
  front    front-facing without phone
  raise    phone being raised
  phone    phone held up showing screen

    python3 art/build-walker.py   # needs Pillow, numpy; writes public/images/walker/*.png
"""

import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "images", "walker")
WORK = "/tmp/walker-work"

# Source video frames (extracted with ffmpeg)
# Walk cycle in first ~100 frames, turn ~100-120, front ~120, raise ~125-140, phone ~140+

# Frame selections (carefully chosen for distinct poses)
FRAME_MAP = {
    "walk1": "frame_0001.png",  # contact, legs apart
    "walk2": "frame_0010.png",  # passing, right foot lifting
    "walk3": "frame_0020.png",  # mid-stride forward
    "walk4": "frame_0030.png",  # other stride
    "turn": "frame_0115.png",   # 3/4 turn toward camera
    "front": "frame_0120.png",  # full front facing
    "raise": "frame_0130.png",  # phone being raised
    "phone": "frame_0160.png",  # phone held up to viewer
}

# Target size (match original Ryu frames)
TARGET_W, TARGET_H = 35, 47

# Magenta background color (RGB)
MAGENTA_R, MAGENTA_G, MAGENTA_B = 255, 0, 144
MAGENTA_TOLERANCE = 45


def rgb_to_hsv(r, g, b):
    """Convert RGB arrays to HSV."""
    r, g, b = r / 255.0, g / 255.0, b / 255.0
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    v = maxc
    s = np.where(maxc != 0, (maxc - minc) / maxc, 0)
    
    rc = np.where(maxc != minc, (maxc - r) / (maxc - minc), 0)
    gc = np.where(maxc != minc, (maxc - g) / (maxc - minc), 0)
    bc = np.where(maxc != minc, (maxc - b) / (maxc - minc), 0)
    
    h = np.where(r == maxc, bc - gc, np.where(g == maxc, 2.0 + rc - bc, 4.0 + gc - rc))
    h = (h / 6.0) % 1.0
    
    return h * 360, s * 100, v * 100


def key_magenta(img):
    """Remove magenta background using HSV-based chroma key."""
    arr = np.array(img.convert("RGB")).astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    
    # Convert to HSV
    h, s, v = rgb_to_hsv(r, g, b)
    
    # Magenta hue is around 300-330 degrees (pink/magenta range)
    # The background is approximately (255, 0, 144) which is ~326 degrees
    is_magenta_hue = ((h > 300) | (h < 20)) & (s > 50) & (v > 40)
    
    # Also catch very saturated pink/magenta regardless of exact hue
    is_saturated_pink = (r > 200) & (g < 120) & (b > 80) & (s > 40)
    
    # Combined mask
    bg_mask = is_magenta_hue | is_saturated_pink
    
    # Create RGBA
    rgba = np.zeros((arr.shape[0], arr.shape[1], 4), dtype=np.uint8)
    rgba[:, :, :3] = arr.astype(np.uint8)
    rgba[:, :, 3] = np.where(bg_mask, 0, 255).astype(np.uint8)
    
    # Erode slightly to remove edge artifacts (1px border removal)
    alpha = rgba[:, :, 3]
    eroded = np.zeros_like(alpha)
    for y in range(1, alpha.shape[0] - 1):
        for x in range(1, alpha.shape[1] - 1):
            # Keep pixel only if all 4-neighbors are also opaque
            if alpha[y, x] > 0:
                neighbors = [alpha[y-1, x], alpha[y+1, x], alpha[y, x-1], alpha[y, x+1]]
                if all(n > 0 for n in neighbors):
                    eroded[y, x] = 255
    
    # But this is too aggressive, so dilate back
    dilated = np.copy(eroded)
    for y in range(1, eroded.shape[0] - 1):
        for x in range(1, eroded.shape[1] - 1):
            if eroded[y, x] == 0:
                neighbors = [eroded[y-1, x], eroded[y+1, x], eroded[y, x-1], eroded[y, x+1]]
                if any(n > 0 for n in neighbors) and alpha[y, x] > 0:
                    # Re-add if it was originally opaque and has opaque neighbor
                    dilated[y, x] = 255
    
    rgba[:, :, 3] = dilated
    
    return Image.fromarray(rgba, "RGBA")


def get_bbox(img):
    """Get bounding box of non-transparent pixels."""
    arr = np.array(img)
    alpha = arr[:, :, 3]
    rows = np.any(alpha > 0, axis=1)
    cols = np.any(alpha > 0, axis=0)
    if not np.any(rows) or not np.any(cols):
        return (0, 0, img.width, img.height)
    y_min, y_max = np.where(rows)[0][[0, -1]]
    x_min, x_max = np.where(cols)[0][[0, -1]]
    return (x_min, y_min, x_max + 1, y_max + 1)


def crop_and_center(img, ref_bbox=None):
    """Crop to content and center on canvas."""
    bbox = get_bbox(img)
    cropped = img.crop(bbox)
    return cropped, bbox


def find_registration_point(img):
    """Find a stable registration point: bottom center of sprite feet."""
    arr = np.array(img)
    alpha = arr[:, :, 3]
    
    # Find bottom row with content
    rows = np.any(alpha > 0, axis=1)
    if not np.any(rows):
        return img.width // 2, img.height
    
    bottom_row = np.where(rows)[0][-1]
    
    # Find center of content in that row
    cols = np.where(alpha[bottom_row, :] > 0)[0]
    if len(cols) == 0:
        return img.width // 2, bottom_row
    
    center_x = (cols[0] + cols[-1]) // 2
    return center_x, bottom_row


def align_frames(frames_dict):
    """Align all frames by their registration points (feet)."""
    # Get registration points and bounding boxes
    reg_points = {}
    bboxes = {}
    
    for name, img in frames_dict.items():
        keyed = key_magenta(img)
        reg_points[name] = find_registration_point(keyed)
        bboxes[name] = get_bbox(keyed)
        frames_dict[name] = keyed
    
    # Find the maximum extent needed
    max_width = 0
    max_above_feet = 0
    max_below_feet = 0
    
    for name, (reg_x, reg_y) in reg_points.items():
        bbox = bboxes[name]
        sprite_w = bbox[2] - bbox[0]
        max_width = max(max_width, sprite_w)
        
        # Distance from top of sprite to feet
        above = reg_y - bbox[1]
        max_above_feet = max(max_above_feet, above)
        
        # Distance from feet to bottom of sprite (usually small)
        below = bbox[3] - reg_y
        max_below_feet = max(max_below_feet, below)
    
    canvas_height = max_above_feet + max_below_feet + 4
    canvas_width = max_width + 4
    
    # Center each sprite on canvas using registration point
    aligned = {}
    for name, img in frames_dict.items():
        bbox = bboxes[name]
        reg_x, reg_y = reg_points[name]
        
        canvas = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))
        
        # Place sprite so feet are at bottom center
        sprite = img.crop(bbox)
        sprite_reg_x = reg_x - bbox[0]
        sprite_reg_y = reg_y - bbox[1]
        
        paste_x = (canvas_width // 2) - sprite_reg_x
        paste_y = (canvas_height - max_below_feet - 2) - sprite_reg_y
        
        canvas.paste(sprite, (paste_x, paste_y), sprite)
        aligned[name] = canvas
    
    return aligned


def reduce_colors(img, num_colors=32):
    """Reduce to a limited palette for pixel art look."""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    
    # Separate alpha channel
    r, g, b, a = img.split()
    rgb = Image.merge("RGB", (r, g, b))
    
    # Quantize RGB
    quantized = rgb.quantize(colors=num_colors, method=Image.Quantize.MEDIANCUT)
    quantized = quantized.convert("RGB")
    
    # Restore alpha
    result = Image.merge("RGBA", (*quantized.split(), a))
    return result


def downscale_pixelart(img, target_w, target_h):
    """Downscale using nearest-neighbor for crisp pixel art."""
    # First, find actual content bounds
    bbox = get_bbox(img)
    content_w = bbox[2] - bbox[0]
    content_h = bbox[3] - bbox[1]
    
    # Calculate scale to fit in target while preserving aspect ratio
    # Leave a little padding
    usable_w = target_w - 2
    usable_h = target_h - 2
    
    scale = min(usable_w / content_w, usable_h / content_h)
    
    new_w = max(1, int(content_w * scale))
    new_h = max(1, int(content_h * scale))
    
    # Crop to content, downscale, then place on target canvas
    cropped = img.crop(bbox)
    scaled = cropped.resize((new_w, new_h), Image.Resampling.NEAREST)
    
    # Reduce colors
    scaled = reduce_colors(scaled, num_colors=24)
    
    # Center on target canvas
    result = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    paste_x = (target_w - new_w) // 2
    paste_y = target_h - new_h - 1  # Align to bottom
    result.paste(scaled, (paste_x, paste_y), scaled)
    
    return result


def main():
    os.makedirs(OUT, exist_ok=True)
    
    # Check if frame extraction has been done
    if not os.path.exists(WORK):
        print("Error: Run 'ffmpeg -i uploads/hoodie-walk-b_*.mp4 -vsync 0 /tmp/walker-work/frame_%04d.png' first")
        return
    
    # Load source frames
    print("Loading source frames...")
    source_frames = {}
    for name, filename in FRAME_MAP.items():
        path = os.path.join(WORK, filename)
        if os.path.exists(path):
            source_frames[name] = Image.open(path)
        else:
            print(f"Warning: {path} not found")
    
    # Key out magenta and align
    print("Keying and aligning frames...")
    aligned = align_frames(source_frames)
    
    # Downscale to pixel art
    print("Downscaling to pixel art...")
    final_frames = {}
    for name, img in aligned.items():
        final_frames[name] = downscale_pixelart(img, TARGET_W, TARGET_H)
    
    # Save frames
    for name, img in final_frames.items():
        path = os.path.join(OUT, f"{name}.png")
        img.save(path)
        print(f"  {name}.png")
    
    # Create contact sheet for preview
    order = ("walk1", "walk2", "walk3", "walk4", "turn", "front", "raise", "phone")
    w, h = TARGET_W, TARGET_H
    scale = 6
    sheet = Image.new("RGBA", (w * len(order) * scale, h * scale), (162, 200, 191, 255))
    for i, name in enumerate(order):
        if name in final_frames:
            scaled = final_frames[name].resize((w * scale, h * scale), Image.NEAREST)
            sheet.alpha_composite(scaled, (i * w * scale, 0))
    sheet.save("/tmp/walker-sheet.png")
    
    print(f"\nWrote {len(final_frames)} frames ({TARGET_W}x{TARGET_H}) to {os.path.normpath(OUT)}")
    print("Contact sheet saved to /tmp/walker-sheet.png")


if __name__ == "__main__":
    main()
