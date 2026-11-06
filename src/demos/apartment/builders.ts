import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Variant } from "./catalog";
import { mottle, weave, woodGrain } from "./textures";

export interface BuiltPiece {
  group: THREE.Group;
  meshes: THREE.Mesh[];
}

type Finish = "wood" | "fabric" | "paint" | "metal" | "steel" | "stone" | "dark" | "plain";

const m = (cm: number) => cm / 100;

/** One fresh material per mesh, so highlighting one piece never tints another. */
function material(finish: Finish, color: string): THREE.MeshStandardMaterial {
  const base = { color: new THREE.Color(color), envMapIntensity: 0.8 };
  switch (finish) {
    case "wood":
      return new THREE.MeshStandardMaterial({ ...base, roughness: 0.6, metalness: 0.02, map: woodGrain() });
    case "fabric":
      return new THREE.MeshStandardMaterial({ ...base, roughness: 0.96, metalness: 0, map: weave(8, 8) });
    case "paint":
      return new THREE.MeshStandardMaterial({ ...base, roughness: 0.78, metalness: 0.02, map: mottle(2, 2, 0.03) });
    case "stone":
      return new THREE.MeshStandardMaterial({ ...base, roughness: 0.32, metalness: 0.02, map: mottle(2, 2, 0.06) });
    case "metal":
      return new THREE.MeshStandardMaterial({ ...base, roughness: 0.3, metalness: 0.85 });
    case "steel":
      return new THREE.MeshStandardMaterial({ ...base, roughness: 0.34, metalness: 0.5 });
    case "dark":
      return new THREE.MeshStandardMaterial({ ...base, roughness: 0.18, metalness: 0.1 });
    default:
      return new THREE.MeshStandardMaterial({ ...base, roughness: 0.8, metalness: 0.02 });
  }
}

function slab(w: number, h: number, d: number, radius = 0.02) {
  const safe = Math.max(0.002, Math.min(radius, Math.min(w, h, d) / 2.2));
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, safe));
}

function post(radius: number, height: number, sides = 12) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.9, height, sides));
}

export function buildPiece(variant: Variant): BuiltPiece {
  const meshes: THREE.Mesh[] = [];
  const group = new THREE.Group();
  const W = m(variant.w);
  const H = m(variant.h);
  const D = m(variant.d);
  const tone = variant.colorHex;

  const put = (mesh: THREE.Mesh, finish: Finish = "wood", color: string = tone, shadow = true) => {
    mesh.material = material(finish, color);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    meshes.push(mesh);
    group.add(mesh);
    return mesh;
  };

  const legs = (w: number, d: number, height: number, radius: number, finish: Finish = "wood", color: string = tone) => {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        put(post(radius, height), finish, color).position.set(
          sx * (w / 2 - radius * 2.2),
          height / 2,
          sz * (d / 2 - radius * 2.2),
        );
      }
    }
  };

  switch (variant.kind) {
    case "bed": {
      const frameH = 0.24;
      put(slab(W, frameH, D, 0.03)).position.y = frameH / 2;
      put(slab(W - 0.05, 0.22, D - 0.06, 0.07), "fabric", "#f1ece0").position.y = frameH + 0.11;
      put(slab(W - 0.03, 0.09, D * 0.62, 0.05), "fabric", "#c9b9a1").position.set(0, frameH + 0.255, D * 0.16);
      for (const sx of [-1, 1]) {
        put(slab(W * 0.4, 0.13, D * 0.17, 0.06), "fabric", "#f7f3e9").position.set(sx * W * 0.23, frameH + 0.29, -D / 2 + D * 0.15);
      }
      const headH = variant.id === "bed-storage" ? 0.98 : 0.95;
      put(slab(W, headH - 0.1, 0.07, 0.03)).position.set(0, 0.1 + (headH - 0.1) / 2, -D / 2 + 0.035);
      if (variant.id === "bed-storage") {
        for (const sx of [-1, 1]) {
          put(slab(W * 0.46, 0.17, 0.03, 0.01), "wood", "#8a6a45").position.set(sx * W * 0.25, 0.13, D / 2 + 0.012);
          put(slab(0.14, 0.012, 0.014, 0.005), "metal", "#b08a4a").position.set(sx * W * 0.25, 0.17, D / 2 + 0.03);
        }
      } else {
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) put(post(0.03, 0.1)).position.set(sx * (W / 2 - 0.08), 0.05, sz * (D / 2 - 0.12));
        }
      }
      break;
    }

    case "nightstand": {
      const bodyH = H - 0.07;
      put(slab(W, bodyH, D, 0.015)).position.y = 0.07 + bodyH / 2;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) put(post(0.017, 0.08)).position.set(sx * (W / 2 - 0.05), 0.04, sz * (D / 2 - 0.05));
      }
      const count = variant.id === "nightstand-drawer" ? 2 : 1;
      const rowH = (bodyH - 0.04) / count;
      for (let i = 0; i < count; i += 1) {
        const y = 0.09 + rowH * (i + 0.5);
        put(slab(W - 0.04, rowH - 0.02, 0.02, 0.008), "wood", "#8a6a45").position.set(0, y, D / 2 + 0.006);
        put(slab(0.1, 0.012, 0.014, 0.005), "metal", "#b08a4a").position.set(0, y + rowH * 0.2, D / 2 + 0.026);
      }
      break;
    }

    case "rug": {
      put(slab(W, 0.018, D, 0.007), "fabric").position.y = 0.011;
      put(slab(W - 0.16, 0.012, D - 0.16, 0.005), "fabric", "#ca8d66").position.y = 0.02;
      break;
    }

    case "sofa": {
      // Base sits on short legs: body Y values are offset by `up`.
      const up = 0.09;
      const armW = 0.16;
      const seatH = 0.3;
      const innerW = W - armW * 2;
      const cushions = variant.w > 210 ? 3 : 2;
      put(slab(W, seatH, D, 0.06), "fabric").position.y = up + seatH / 2;
      for (let i = 0; i < cushions; i += 1) {
        const x = -innerW / 2 + (innerW / cushions) * (i + 0.5);
        put(slab(innerW / cushions - 0.012, 0.16, D - 0.24, 0.07), "fabric").position.set(x, up + seatH + 0.08, 0.06);
        put(slab(innerW / cushions - 0.02, 0.4, 0.17, 0.07), "fabric").position.set(x, up + seatH + 0.28, -D / 2 + 0.17);
      }
      for (const sx of [-1, 1]) {
        put(slab(armW, 0.44, D, 0.06), "fabric").position.set(sx * (W / 2 - armW / 2), up + 0.22 + 0.11, 0);
      }
      put(slab(W, 0.46, 0.1, 0.05), "fabric").position.set(0, up + 0.23 + 0.1, -D / 2 + 0.05);
      legs(W - 0.06, D - 0.06, up, 0.02, "wood", "#6b4b32");
      break;
    }

    case "coffee": {
      if (variant.id === "coffee-low") {
        put(slab(W, 0.05, D, 0.015)).position.y = H - 0.025;
        put(slab(W - 0.1, 0.03, D - 0.1, 0.01)).position.y = 0.1;
        legs(W, D, H - 0.05, 0.016);
        break;
      }
      put(post(W / 2, 0.045, 48)).position.y = H - 0.022;
      put(post(W / 2 - 0.03, 0.03, 48)).position.y = H - 0.06;
      for (let i = 0; i < 3; i += 1) {
        const angle = (i / 3) * Math.PI * 2 + 0.4;
        const leg = put(post(0.02, H - 0.06));
        leg.position.set(Math.cos(angle) * (W / 2 - 0.09), (H - 0.06) / 2, Math.sin(angle) * (W / 2 - 0.09));
        leg.rotation.set(-Math.sin(angle) * 0.07, 0, Math.cos(angle) * 0.07);
      }
      break;
    }

    case "counter": {
      const bodyH = H - 0.06;
      put(slab(W, bodyH, D, 0.015), "paint").position.y = 0.06 + bodyH / 2;
      put(slab(W - 0.1, 0.06, D - 0.1, 0.005), "dark", "#2b2926").position.y = 0.03;
      put(slab(W + 0.08, 0.06, D + 0.08, 0.02), "stone", "#e9e4d8").position.y = H - 0.03;
      for (let i = 0; i < 4; i += 1) {
        const z = -D / 2 + (D / 4) * (i + 0.5);
        put(slab(0.014, 0.14, 0.014, 0.005), "metal", "#b08a4a").position.set(-W / 2 - 0.012, H - 0.3, z);
        if (i) put(slab(0.004, bodyH - 0.1, 0.004, 0.001), "dark", "#555a50", false).position.set(-W / 2 - 0.002, 0.06 + bodyH / 2, -D / 2 + (D / 4) * i);
      }
      put(slab(W * 0.56, 0.02, D * 0.17, 0.008), "steel", "#b9bcbd").position.set(0, H + 0.002, D * 0.3);
      put(post(0.016, 0.3, 10), "metal", "#b9bcbd").position.set(0, H + 0.15, D * 0.3 + 0.07);
      const spout = put(post(0.013, 0.16, 10), "metal", "#b9bcbd");
      spout.position.set(0, H + 0.29, D * 0.3 + 0.0);
      spout.rotation.x = Math.PI / 2;
      put(slab(W * 0.62, 0.012, D * 0.2, 0.005), "dark", "#26241f").position.set(0, H + 0.006, -D * 0.16);
      for (const dz of [-0.07, 0.07]) {
        for (const dx of [-0.14, 0.14]) {
          const ring = put(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.004, 6, 24)), "metal", "#6d6a63", false);
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(dx, H + 0.014, -D * 0.16 + dz);
        }
      }
      break;
    }

    case "fridge": {
      put(slab(W, H - 0.05, D, 0.02), "steel").position.y = 0.04 + (H - 0.05) / 2;
      put(slab(W - 0.06, 0.04, D - 0.06, 0.008), "dark", "#2b2926").position.y = 0.02;
      put(slab(W + 0.004, 0.01, D + 0.004, 0.003), "dark", "#555a50", false).position.y = 0.04 + (H - 0.05) * 0.66;
      put(slab(0.022, Math.min(0.5, H * 0.28), 0.026, 0.008), "metal", "#aaa49a").position.set(-W / 2 + 0.06, 0.04 + (H - 0.05) * 0.82, D / 2 + 0.02);
      put(slab(0.022, Math.min(0.35, H * 0.2), 0.026, 0.008), "metal", "#aaa49a").position.set(-W / 2 + 0.06, 0.04 + (H - 0.05) * 0.4, D / 2 + 0.02);
      break;
    }

    case "shelf": {
      const t = 0.028;
      for (const sx of [-1, 1]) put(slab(t, H, D, 0.008)).position.set(sx * (W / 2 - t / 2), H / 2, 0);
      const tiers = variant.h > 120 ? 5 : 3;
      for (let i = 0; i < tiers; i += 1) {
        const y = 0.013 + ((H - 0.026) / (tiers - 1)) * i;
        put(slab(W - t * 2, 0.026, D, 0.006)).position.set(0, y, 0);
      }
      put(slab(W - t * 2, H - 0.02, 0.012, 0.003), "wood", "#b9a789").position.set(0, H / 2, -D / 2 + 0.006);
      const spines = ["#7a5c46", "#3f4a52", "#a5764f", "#4d5a4a", "#8b6f5c", "#c9b79b"];
      const row = (tier: number) => 0.013 + ((H - 0.026) / (tiers - 1)) * tier + 0.013;
      const tierGap = (H - 0.026) / (tiers - 1);
      for (let i = 0; i < 9; i += 1) {
        const bookH = Math.min(tierGap - 0.06, 0.2 + (i % 3) * 0.03);
        const book = put(slab(0.028, bookH, D * 0.55, 0.003), "paint", spines[i % spines.length]);
        book.position.set(-W / 2 + 0.1 + i * 0.032, row(1) + bookH / 2, 0.01);
        if (i === 8) book.rotation.z = 0.16;
      }
      put(post(0.1, 0.06, 20), "paint", "#c9b79b").position.set(W / 2 - 0.22, row(tiers > 3 ? 3 : 2) + 0.03, 0);
      break;
    }

    case "lamp": {
      put(post(0.16, 0.025, 28), "metal", tone).position.y = 0.013;
      if (variant.id === "lamp-globe") {
        put(post(0.018, H - 0.22, 10), "metal", tone).position.y = (H - 0.22) / 2;
        const globe = put(new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14)), "plain", "#f6e7c4", false);
        globe.position.y = H - 0.13;
        const mat = globe.material as THREE.MeshStandardMaterial;
        mat.emissive = new THREE.Color("#ffd9a0");
        mat.emissiveIntensity = 0.55;
      } else {
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, 0.02, 0),
          new THREE.Vector3(0, H * 1.02, 0),
          new THREE.Vector3(0.0, H * 0.96, 0.4),
        );
        put(new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.017, 8, false)), "metal", tone);
        const shade = put(new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.2, 22, 1, true)), "plain", "#f1e7d3", false);
        shade.position.set(0, H * 0.96 - 0.08, 0.4);
        const mat = shade.material as THREE.MeshStandardMaterial;
        mat.side = THREE.DoubleSide;
        mat.emissive = new THREE.Color("#ffd9a0");
        mat.emissiveIntensity = 0.25;
      }
      break;
    }

    case "plant": {
      put(post(W * 0.36, 0.32, 22), "paint", "#a8a094").position.y = 0.16;
      put(post(W * 0.33, 0.02, 20), "plain", "#3d3227").position.y = 0.31;
      put(post(0.02, H * 0.5, 8), "wood", "#6b4b32").position.y = H * 0.27;
      const count = variant.h > 100 ? 5 : 3;
      for (let i = 0; i < count; i += 1) {
        const r = (variant.h > 100 ? 0.27 : 0.21) * (1 - i * 0.1);
        const blob = put(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1)), "plain", i % 2 ? "#4f6b41" : "#5c7a4a");
        (blob.material as THREE.MeshStandardMaterial).flatShading = true;
        (blob.material as THREE.MeshStandardMaterial).roughness = 0.85;
        const angle = i * 2.1;
        blob.position.set(Math.cos(angle) * 0.1 * (i % 2 ? 1 : -1), 0.42 + ((H - 0.62) / Math.max(count - 1, 1)) * i, Math.sin(angle) * 0.09);
      }
      break;
    }

    case "table": {
      put(slab(W, 0.045, D, 0.012)).position.y = H - 0.022;
      put(slab(W - 0.16, 0.07, D - 0.16, 0.01)).position.y = H - 0.08;
      legs(W, D, H - 0.045, 0.024);
      break;
    }

    case "desk": {
      if (variant.id === "desk-corner") {
        put(slab(W, 0.04, D * 0.5, 0.01)).position.set(0, H - 0.02, -D * 0.25);
        put(slab(W * 0.5, 0.04, D * 0.5, 0.01)).position.set(-W * 0.25, H - 0.02, D * 0.25);
        for (const sx of [-1, 1]) put(post(0.022, H - 0.04)).position.set(sx * (W / 2 - 0.05), (H - 0.04) / 2, -D * 0.45);
        put(post(0.022, H - 0.04)).position.set(-W / 2 + 0.05, (H - 0.04) / 2, D * 0.45);
        break;
      }
      put(slab(W, 0.04, D, 0.01)).position.y = H - 0.02;
      if (variant.id === "desk-writing") {
        put(slab(W * 0.36, H - 0.06, D - 0.02, 0.01)).position.set(W * 0.3, (H - 0.04) / 2, 0);
        const rowH = (H - 0.14) / 3;
        for (let i = 0; i < 3; i += 1) {
          const y = 0.04 + rowH * (i + 0.5);
          put(slab(W * 0.32, rowH - 0.02, 0.018, 0.006), "wood", "#a98a63").position.set(W * 0.3, y, D / 2 + 0.004);
          put(slab(0.1, 0.01, 0.012, 0.004), "metal", "#b08a4a").position.set(W * 0.3, y + 0.02, D / 2 + 0.02);
        }
        for (const sz of [-1, 1]) put(post(0.02, H - 0.04)).position.set(-W / 2 + 0.06, (H - 0.04) / 2, sz * (D / 2 - 0.05));
      } else {
        // Wall-mounted: bracket + under-shelf rail instead of legs.
        for (const sx of [-1, 1]) put(slab(0.03, H - 0.08, 0.03, 0.006), "metal", "#efe9dd").position.set(sx * (W / 2 - 0.08), (H - 0.08) / 2 + 0.02, -D / 2 + 0.05);
        put(slab(W * 0.8, 0.03, 0.03, 0.006), "metal", "#efe9dd").position.set(0, H - 0.1, -D / 2 + 0.05);
      }
      break;
    }

    case "chair": {
      const seatY = H * 0.52;
      put(slab(W, 0.05, D, 0.02), "fabric", variant.id === "chair-moulded" ? tone : "#a98a63").position.y = seatY;
      const back = put(slab(W - 0.02, H - seatY - 0.02, 0.04, 0.02), "wood");
      back.position.set(0, seatY + (H - seatY) / 2, -D / 2 + 0.03);
      back.rotation.x = -0.08;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) put(post(0.016, seatY, 10)).position.set(sx * (W / 2 - 0.05), seatY / 2, sz * (D / 2 - 0.05));
      }
      break;
    }
  }

  return { group, meshes };
}