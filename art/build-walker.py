"""Build the hero walker frames from video at full resolution.

Extracts frames from the hoodie walk video at native video resolution (544px),
keys out magenta, crops to shared bounding box, and aligns on baseline.
No downscaling - preserves all facial detail.

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

# Magenta background (RGB)
MAGENTA = (255, 0, 144)
MAGENTA_THRESHOLD = 50

# Frame selections from video (24fps, 193 frames total)
FRAME_MAP = {
    "walk1": "frame_0001.png",   # contact, legs spread
    "walk2": "frame_0008.png",   # passing, legs together
    "walk3": "frame_0016.png",   # opposite contact, wide stride
    "walk4": "frame_0024.png",   # other passing
    "turn": "frame_0108.png",    # turning toward camera
    "front": "frame_0118.png",   # facing front, no phone visible
    "raise": "frame_0130.png",   # phone being raised
    "phone": "frame_0160.png",   # phone held up to viewer
}


def key_magenta(arr):
    """Remove magenta background with clean binary alpha and edge cleanup."""
    r, g, b = arr[:, :, 0].astype(float), arr[:, :, 1].astype(float), arr[:, :, 2].astype(float)
    mg_r, mg_g, mg_b = float(MAGENTA[0]), float(MAGENTA[1]), float(MAGENTA[2])
    
    # Distance from magenta
    dist = np.sqrt((r - mg_r)**2 + (g - mg_g)**2 + (b - mg_b)**2)
    
    # Binary alpha for pure magenta
    is_magenta = dist < MAGENTA_THRESHOLD
    
    # Catch anti-aliased edge pixels (magenta-tinted)
    # High red, low green, moderate-to-high blue = magenta bias
    magenta_bias = (r - g) + (b - g)  # positive for magenta
    is_edge_magenta = (magenta_bias > 150) & (g < 120) & (r > 150)
    
    # Combine masks
    is_bg = is_magenta | is_edge_magenta
    
    # Create RGBA
    rgba = np.zeros((arr.shape[0], arr.shape[1], 4), dtype=np.uint8)
    rgba[:, :, :3] = arr[:, :, :3].astype(np.uint8)
    rgba[:, :, 3] = np.where(is_bg, 0, 255).astype(np.uint8)
    
    # Clean up remaining edge pixels by checking neighbors
    # If a pixel has magenta tint and is next to transparent, make it transparent
    alpha = rgba[:, :, 3]
    h, w = alpha.shape
    
    for _ in range(2):  # Two passes for thorough cleanup
        new_alpha = alpha.copy()
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                if alpha[y, x] > 0:
                    # Check if this pixel has a magenta tint
                    pixel_r, pixel_g, pixel_b = rgba[y, x, 0], rgba[y, x, 1], rgba[y, x, 2]
                    pixel_bias = (int(pixel_r) - int(pixel_g)) + (int(pixel_b) - int(pixel_g))
                    
                    # Check if adjacent to transparent
                    neighbors = [alpha[y-1,x], alpha[y+1,x], alpha[y,x-1], alpha[y,x+1]]
                    transparent_neighbors = sum(1 for n in neighbors if n == 0)
                    
                    # If magenta-tinted and on edge, remove
                    if pixel_bias > 80 and pixel_g < 100 and transparent_neighbors >= 1:
                        new_alpha[y, x] = 0
        alpha = new_alpha
    
    rgba[:, :, 3] = alpha
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
    """Load and key a single frame at full resolution."""
    img = Image.open(path).convert("RGB")
    arr = np.array(img)
    rgba = key_magenta(arr)
    return Image.fromarray(rgba, "RGBA")


def main():
    os.makedirs(OUT, exist_ok=True)
    
    if not os.path.exists(WORK):
        print("Error: Run ffmpeg extraction first")
        return
    
    # Process all frames at full resolution
    print("Processing frames at full video resolution...")
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
    
    # Find unified bounding box across ALL frames
    print("\nFinding shared bounding box...")
    all_bboxes = []
    all_baselines = []
    
    for name, img in frames.items():
        arr = np.array(img)
        bbox = get_content_bbox(arr)
        baseline = get_feet_baseline(arr)
        all_bboxes.append(bbox)
        all_baselines.append(baseline)
        print(f"  {name}: bbox={bbox}, baseline={baseline}")
    
    # Compute shared bounding box (union of all)
    x_min = min(b[0] for b in all_bboxes)
    y_min = min(b[1] for b in all_bboxes)
    x_max = max(b[2] for b in all_bboxes)
    y_max = max(b[3] for b in all_bboxes)
    
    # Use max baseline for alignment
    max_baseline = max(all_baselines)
    
    # Calculate canvas: enough room for all content aligned by baseline
    # Height above baseline (from top of tallest content to baseline)
    heights_above = [all_baselines[i] - all_bboxes[i][1] for i in range(len(frames))]
    max_above = max(heights_above)
    
    # Height below baseline (from baseline to bottom of content)
    heights_below = [all_bboxes[i][3] - all_baselines[i] for i in range(len(frames))]
    max_below = max(heights_below)
    
    # Canvas dimensions with small padding
    canvas_width = x_max - x_min + 8  # 4px padding each side
    canvas_height = max_above + max_below + 8
    baseline_y = max_above + 4  # baseline position on canvas
    
    print(f"\nShared canvas: {canvas_width}x{canvas_height}, baseline at y={baseline_y}")
    
    # Align each frame on the shared canvas
    aligned = {}
    frame_names = list(frames.keys())
    
    for i, (name, img) in enumerate(frames.items()):
        arr = np.array(img)
        bbox = all_bboxes[i]
        feet_y = all_baselines[i]
        
        # Create canvas
        canvas = np.zeros((canvas_height, canvas_width, 4), dtype=np.uint8)
        
        # Calculate paste position
        # Horizontal: center the content
        content_width = bbox[2] - bbox[0]
        paste_x = (canvas_width - content_width) // 2
        
        # Vertical: align feet to baseline
        content_feet_offset = feet_y - bbox[1]  # distance from content top to feet
        paste_y = baseline_y - content_feet_offset
        
        # Copy content to canvas
        content = arr[bbox[1]:bbox[3], bbox[0]:bbox[2]]
        
        # Clamp to canvas bounds
        src_y_start = max(0, -paste_y)
        src_y_end = min(content.shape[0], canvas_height - paste_y)
        src_x_start = max(0, -paste_x)
        src_x_end = min(content.shape[1], canvas_width - paste_x)
        
        dst_y = max(0, paste_y)
        dst_x = max(0, paste_x)
        
        h = src_y_end - src_y_start
        w = src_x_end - src_x_start
        
        if h > 0 and w > 0:
            canvas[dst_y:dst_y+h, dst_x:dst_x+w] = content[src_y_start:src_y_start+h, src_x_start:src_x_start+w]
        
        aligned[name] = Image.fromarray(canvas, "RGBA")
    
    # Save frames as PNG
    print("\nSaving frames...")
    for name, img in aligned.items():
        path = os.path.join(OUT, f"{name}.png")
        img.save(path, "PNG", optimize=True)
        size_kb = os.path.getsize(path) / 1024
        print(f"  {name}.png: {img.size[0]}x{img.size[1]}, {size_kb:.1f}KB")
    
    # Create comparison sheet
    print("\nCreating comparison sheet...")
    order = ("walk1", "walk2", "walk3", "walk4", "turn", "front", "raise", "phone")
    
    # Simple contact sheet
    w, h = aligned["walk1"].size
    sheet = Image.new("RGBA", (w * len(order), h), (162, 200, 191, 255))
    for i, name in enumerate(order):
        if name in aligned:
            sheet.alpha_composite(aligned[name], (i * w, 0))
    sheet.save("/tmp/walker-sheet.png")
    
    # Side-by-side comparison with source
    print("Creating source comparison...")
    comparison_h = 544 + h + 20
    comparison_w = 200 * len(order)
    comparison = Image.new("RGBA", (comparison_w, comparison_h), (40, 40, 45, 255))
    
    for i, name in enumerate(order):
        x_off = i * 200
        
        # Original video frame (top)
        src_path = os.path.join(WORK, FRAME_MAP[name])
        if os.path.exists(src_path):
            src = Image.open(src_path).convert("RGBA")
            # Scale to fit in 190px width
            scale = 190 / src.width
            src_scaled = src.resize((int(src.width * scale), int(src.height * scale)), Image.LANCZOS)
            comparison.paste(src_scaled, (x_off + 5, 5), src_scaled)
        
        # Processed frame (bottom)
        if name in aligned:
            proc = aligned[name]
            # Scale to fit
            scale = min(190 / proc.width, (comparison_h - 544 - 30) / proc.height)
            proc_scaled = proc.resize((int(proc.width * scale), int(proc.height * scale)), Image.LANCZOS)
            comparison.paste(proc_scaled, (x_off + 5, 544 + 15), proc_scaled)
    
    comparison.save("/tmp/walker-comparison.png")
    
    print(f"\nDone! Wrote {len(aligned)} frames ({canvas_width}x{canvas_height}) to {os.path.normpath(OUT)}")
    print("Contact sheet: /tmp/walker-sheet.png")
    print("Comparison: /tmp/walker-comparison.png")


if __name__ == "__main__":
    main()
