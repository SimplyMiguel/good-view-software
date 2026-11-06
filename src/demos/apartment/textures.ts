import * as THREE from "three";

/**
 * Procedural, neutral-grey texture maps. Materials keep their own `color`, so a
 * single cached map serves every wood tone without doubling the tint.
 */
const cache = new Map<string, THREE.Texture>();

function surface(
  key: string,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  repeatX: number,
  repeatY: number,
): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  draw(ctx, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}

let seed = 1337;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/** Long, slightly wavy grain lines — reads as veneer at product-shot distance. */
export function woodGrain(repeatX = 2, repeatY = 2): THREE.Texture {
  return surface(
    `wood-${repeatX}-${repeatY}`,
    (ctx, size) => {
      for (let i = 0; i < 140; i += 1) {
        const x = rnd() * size;
        ctx.strokeStyle = `rgba(0,0,0,${0.02 + rnd() * 0.07})`;
        ctx.lineWidth = 0.6 + rnd() * 2.2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        for (let y = 0; y <= size; y += 16) {
          ctx.lineTo(x + Math.sin((y + i * 7) / 42) * 2.2, y);
        }
        ctx.stroke();
      }
      for (let i = 0; i < 40; i += 1) {
        ctx.fillStyle = `rgba(0,0,0,${0.015 + rnd() * 0.03})`;
        ctx.fillRect(rnd() * size, rnd() * size, 40 + rnd() * 90, 1 + rnd() * 2);
      }
    },
    repeatX,
    repeatY,
  );
}

/** Tight weave for upholstery: subtle enough not to shimmer when orbiting. */
export function weave(repeatX = 6, repeatY = 6): THREE.Texture {
  return surface(
    `weave-${repeatX}-${repeatY}`,
    (ctx, size) => {
      for (let y = 0; y < size; y += 3) {
        ctx.fillStyle = y % 6 === 0 ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.02)";
        ctx.fillRect(0, y, size, 1.5);
      }
      for (let x = 0; x < size; x += 3) {
        ctx.fillStyle = "rgba(0,0,0,0.025)";
        ctx.fillRect(x, 0, 1, size);
      }
    },
    repeatX,
    repeatY,
  );
}

/** Broad, low-contrast mottling for plaster walls and stone worktops. */
export function mottle(repeatX = 3, repeatY = 3, strength = 0.05): THREE.Texture {
  return surface(
    `mottle-${repeatX}-${repeatY}-${strength}`,
    (ctx, size) => {
      for (let i = 0; i < 900; i += 1) {
        const r = 2 + rnd() * 14;
        ctx.fillStyle = `rgba(0,0,0,${rnd() * strength})`;
        ctx.beginPath();
        ctx.arc(rnd() * size, rnd() * size, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    repeatX,
    repeatY,
  );
}

/** Pale oak floorboards: staggered plank seams plus grain. */
export function floorboards(repeatX = 4, repeatY = 3.5): THREE.Texture {
  return surface(
    `floor-${repeatX}-${repeatY}`,
    (ctx, size) => {
      const rows = 5;
      const rowH = size / rows;
      for (let row = 0; row < rows; row += 1) {
        for (let i = 0; i < 26; i += 1) {
          const x = rnd() * size;
          ctx.strokeStyle = `rgba(0,0,0,${0.015 + rnd() * 0.05})`;
          ctx.lineWidth = 0.5 + rnd() * 1.6;
          ctx.beginPath();
          ctx.moveTo(x, row * rowH);
          ctx.lineTo(x + (rnd() - 0.5) * 6, (row + 1) * rowH);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(0,0,0,0.16)";
        ctx.fillRect(0, row * rowH, size, 1);
        ctx.fillStyle = "rgba(0,0,0,0.10)";
        ctx.fillRect((row * 97) % size, row * rowH, 1, rowH);
      }
    },
    repeatX,
    repeatY,
  );
}
