"""Build the hero walker frames from video frames.

Extracts frames from the hoodie walk video at native pixel art resolution.
The video is already pixel art upscaled 4x, so we downsample by 4 to get
the true pixel art, then key out magenta and align on a shared baseline.

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
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "images", "walker")
WORK = "/tmp/walker-work"

# Native pixel art is 4x upscaled in the video
PIXEL_FACTOR = 4

# Magenta background (RGB)
MAGENTA = (255, 0, 144)
MAGENTA_THRESHOLD = 60

# Frame selections from video (24fps, 193 frames total)
# Walk cycle: first ~96 frames (4 seconds), ~24 frames per loop
# Turn/front: ~96-120
# Phone raise: ~120-140
# Phone show: ~140+
FRAME_MAP = {
    "walk1": "frame_0001.png",   # contact, legs spread
    "walk2": "frame_0008.png",   # passing, legs together
    "walk3": "frame_0016.png",   # opposite contact, wide stride
    "walk4": "frame_0024.png",   # other passing
    "turn": "frame_0108.png",    # turning toward camera
    "front": "frame_0118.png",   # facing front, no phone visible
    "raise": "frame_0130.png",   # phone being raised (arm up)
    "phone": "frame_0160.png",   # phone held up to viewer
}


def majority_color(block):
    """Get the most common color in a block."""
    pixels = [tuple(block[y, x]) for y in range(block.shape[0]) for x in range(block.shape[1])]
    return Counter(pixels).most_common(1)[0][0]


def downsample_pixelart(arr, factor):
    """Downsample by taking majority color in each block."""
    h, w = arr.shape[:2]
    h_trim = (h // factor) * factor
    w_trim = (w // factor) * factor
    arr = arr[:h_trim, :w_trim]
    
    new_h, new_w = h_trim // factor, w_trim // factor
    result = np.zeros((new_h, new_w, 3), dtype=np.uint8)
    
    for by in range(new_h):
        for bx in range(new_w):
            block = arr[by*factor:(by+1)*factor, bx*factor:(bx+1)*factor, :3]
            result[by, bx] = majority_color(block)
    
    return result


def key_magenta(arr):
    """Remove magenta background with binary alpha."""
    r, g, b = arr[:, :, 0].astype(int), arr[:, :, 1].astype(int), arr[:, :, 2].astype(int)
    mg_r, mg_g, mg_b = MAGENTA
    
    # Distance from magenta color
    dist = np.sqrt((r - mg_r)**2 + (g - mg_g)**2 + (b - mg_b)**2)
    
    # Binary alpha: transparent if close to magenta
    is_magenta = dist < MAGENTA_THRESHOLD
    
    # Create RGBA
    rgba = np.zeros((arr.shape[0], arr.shape[1], 4), dtype=np.uint8)
    rgba[:, :, :3] = arr
    rgba[:, :, 3] = np.where(is_magenta, 0, 255).astype(np.uint8)
    
    return rgba


def get_content_bbox(rgba):
    """Get bounding box of non-transparent pixels."""
    alpha = rgba[:, :, 3]
    rows = np.any(alpha > 0, axis=1)
    cols = np.any(alpha > 0, axis=0)
    if not np.any(rows) or not np.any(cols):
        return (0, 0, rgba.shape[1], rgba.shape[0])
    y_min, y_max = np.where(rows)[0][[0, -1]]
    x_min, x_max = np.where(cols)[0][[0, -1]]
    return (x_min, y_min, x_max + 1, y_max + 1)


def get_feet_baseline(rgba):
    """Find the bottom row with content (feet baseline)."""
    alpha = rgba[:, :, 3]
    rows = np.any(alpha > 0, axis=1)
    if not np.any(rows):
        return rgba.shape[0]
    return np.where(rows)[0][-1]


def process_frame(path):
    """Load, downsample, and key a single frame."""
    img = Image.open(path).convert("RGB")
    arr = np.array(img)
    
    # Downsample to native pixel art resolution
    down = downsample_pixelart(arr, PIXEL_FACTOR)
    
    # Key out magenta
    rgba = key_magenta(down)
    
    return Image.fromarray(rgba, "RGBA")


def main():
    os.makedirs(OUT, exist_ok=True)
    
    if not os.path.exists(WORK):
        print("Error: Run ffmpeg extraction first")
        return
    
    # Process all frames
    print("Processing frames...")
    frames = {}
    for name, filename in FRAME_MAP.items():
        path = os.path.join(WORK, filename)
        if os.path.exists(path):
            frames[name] = process_frame(path)
            print(f"  {name}: {frames[name].size}")
        else:
            print(f"  Warning: {filename} not found")
    
    if not frames:
        print("No frames processed")
        return
    
    # Find unified bounding box and baseline
    print("\nAligning frames...")
    bboxes = {name: get_content_bbox(np.array(img)) for name, img in frames.items()}
    baselines = {name: get_feet_baseline(np.array(img)) for name, img in frames.items()}
    
    # Calculate shared canvas size
    # Width: max content width
    # Height: max distance from top of content to baseline, plus padding below baseline
    max_content_width = max(bbox[2] - bbox[0] for bbox in bboxes.values())
    max_height_above = max(baselines[name] - bboxes[name][1] for name in frames)
    max_height_below = max(bboxes[name][3] - baselines[name] for name in frames)
    
    canvas_width = max_content_width + 2  # 1px padding each side
    canvas_height = max_height_above + max_height_below + 2  # padding
    baseline_y = max_height_above + 1  # where feet go on canvas
    
    print(f"Canvas size: {canvas_width}x{canvas_height}")
    print(f"Baseline at y={baseline_y}")
    
    # Align each frame
    aligned = {}
    for name, img in frames.items():
        arr = np.array(img)
        bbox = bboxes[name]
        feet_y = baselines[name]
        
        # Crop to content
        content = arr[bbox[1]:bbox[3], bbox[0]:bbox[2]]
        content_feet_y = feet_y - bbox[1]  # feet position within content
        
        # Create canvas and place content
        canvas = np.zeros((canvas_height, canvas_width, 4), dtype=np.uint8)
        
        # Center horizontally
        paste_x = (canvas_width - content.shape[1]) // 2
        # Align feet to baseline
        paste_y = baseline_y - content_feet_y
        
        # Clamp to canvas bounds
        src_y_start = max(0, -paste_y)
        src_y_end = min(content.shape[0], canvas_height - paste_y)
        src_x_start = max(0, -paste_x)
        src_x_end = min(content.shape[1], canvas_width - paste_x)
        
        dst_y_start = max(0, paste_y)
        dst_x_start = max(0, paste_x)
        
        h = src_y_end - src_y_start
        w = src_x_end - src_x_start
        
        canvas[dst_y_start:dst_y_start+h, dst_x_start:dst_x_start+w] = \
            content[src_y_start:src_y_start+h, src_x_start:src_x_start+w]
        
        aligned[name] = Image.fromarray(canvas, "RGBA")
    
    # Save frames
    print("\nSaving frames...")
    for name, img in aligned.items():
        path = os.path.join(OUT, f"{name}.png")
        img.save(path)
        print(f"  {name}.png ({img.size[0]}x{img.size[1]})")
    
    # Create comparison sheet for PR
    print("\nCreating comparison sheet...")
    order = ("walk1", "walk2", "walk3", "walk4", "turn", "front", "raise", "phone")
    scale = 4  # Show at 4x for comparison
    
    # Load original video frames for comparison
    originals = {}
    for name, filename in FRAME_MAP.items():
        path = os.path.join(WORK, filename)
        if os.path.exists(path):
            originals[name] = Image.open(path).convert("RGBA")
    
    # Calculate sheet dimensions
    # Each column: original (scaled to match) + processed (scaled up)
    orig_h = 544  # video frame height
    proc_w, proc_h = aligned["walk1"].size
    target_h = proc_h * scale  # processed at 4x scale
    
    col_width = max(544, proc_w * scale) + 20
    sheet_w = col_width * len(order)
    sheet_h = orig_h + target_h + 40  # original + gap + processed
    
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (40, 40, 45, 255))
    
    for i, name in enumerate(order):
        x_offset = i * col_width + 10
        
        # Original video frame (top)
        if name in originals:
            orig = originals[name]
            # Scale to fit
            orig_scale = min(col_width - 20, orig.width) / orig.width
            orig_scaled = orig.resize(
                (int(orig.width * orig_scale), int(orig.height * orig_scale)),
                Image.NEAREST
            )
            sheet.paste(orig_scaled, (x_offset, 5), orig_scaled if orig_scaled.mode == 'RGBA' else None)
        
        # Processed frame (bottom, scaled up)
        if name in aligned:
            proc = aligned[name].resize((proc_w * scale, proc_h * scale), Image.NEAREST)
            sheet.paste(proc, (x_offset, orig_h + 20), proc)
    
    sheet.save("/tmp/walker-comparison.png")
    
    # Also save a simple contact sheet
    simple_w = proc_w * len(order) * scale
    simple_h = proc_h * scale
    simple = Image.new("RGBA", (simple_w, simple_h), (162, 200, 191, 255))
    for i, name in enumerate(order):
        if name in aligned:
            scaled = aligned[name].resize((proc_w * scale, proc_h * scale), Image.NEAREST)
            simple.alpha_composite(scaled, (i * proc_w * scale, 0))
    simple.save("/tmp/walker-sheet.png")
    
    print(f"\nDone! Wrote {len(aligned)} frames ({canvas_width}x{canvas_height}) to {os.path.normpath(OUT)}")
    print("Comparison sheet: /tmp/walker-comparison.png")
    print("Contact sheet: /tmp/walker-sheet.png")


if __name__ == "__main__":
    main()
