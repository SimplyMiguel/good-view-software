export type PieceKind =
  | "bed"
  | "nightstand"
  | "rug"
  | "sofa"
  | "coffee"
  | "counter"
  | "fridge"
  | "shelf"
  | "lamp"
  | "plant"
  | "table"
  | "desk"
  | "chair";

export interface Variant {
  id: string;
  kind: PieceKind;
  name: string;
  price: number;
  color: string;
  colorHex: string;
  /** Centimetres, widest footprint first. h is the overall height. */
  w: number;
  h: number;
  d: number;
}

export const kinds: { kind: PieceKind; label: string }[] = [
  { kind: "bed", label: "Sleeping" },
  { kind: "nightstand", label: "Sleeping" },
  { kind: "sofa", label: "Living" },
  { kind: "coffee", label: "Living" },
  { kind: "table", label: "Living" },
  { kind: "rug", label: "Living" },
  { kind: "counter", label: "Kitchen" },
  { kind: "fridge", label: "Kitchen" },
  { kind: "desk", label: "Work" },
  { kind: "chair", label: "Work" },
  { kind: "shelf", label: "Storage" },
  { kind: "lamp", label: "Lighting" },
  { kind: "plant", label: "Plants" },
];

export const variants: Variant[] = [
  { id: "bed-platform", kind: "bed", name: "Platform bed, walnut", price: 1240, color: "Walnut", colorHex: "#6b4b32", w: 160, h: 95, d: 200 },
  { id: "bed-storage", kind: "bed", name: "Storage bed, pale oak", price: 1680, color: "Pale oak", colorHex: "#b99a72", w: 160, h: 100, d: 205 },

  { id: "nightstand-oak", kind: "nightstand", name: "Oak nightstand", price: 210, color: "Natural oak", colorHex: "#c6a878", w: 45, h: 50, d: 40 },
  { id: "nightstand-drawer", kind: "nightstand", name: "Two-drawer pedestal", price: 320, color: "Walnut", colorHex: "#6b4b32", w: 50, h: 55, d: 42 },

  { id: "rug-clay", kind: "rug", name: "Wool rug, clay", price: 340, color: "Clay", colorHex: "#b9724f", w: 260, h: 2, d: 190 },
  { id: "rug-oat", kind: "rug", name: "Wool rug, oat", price: 260, color: "Oat", colorHex: "#cfc4b2", w: 200, h: 2, d: 140 },

  { id: "sofa-two", kind: "sofa", name: "Two-seat sofa, oat", price: 1650, color: "Oat", colorHex: "#cfc4b2", w: 200, h: 78, d: 90 },
  { id: "sofa-three", kind: "sofa", name: "Three-seat sofa, clay", price: 2190, color: "Clay", colorHex: "#b9724f", w: 240, h: 78, d: 92 },

  { id: "coffee-round", kind: "coffee", name: "Round coffee table", price: 420, color: "Smoked oak", colorHex: "#4a3a2c", w: 90, h: 38, d: 90 },
  { id: "coffee-low", kind: "coffee", name: "Low bench table", price: 380, color: "Ash", colorHex: "#d7c9b0", w: 110, h: 32, d: 55 },

  { id: "counter-peninsula", kind: "counter", name: "Kitchen peninsula with sink", price: 3180, color: "Sage", colorHex: "#9aa78f", w: 90, h: 92, d: 320 },

  { id: "fridge-compact", kind: "fridge", name: "Compact fridge, cream", price: 899, color: "Cream", colorHex: "#e8e2d4", w: 60, h: 150, d: 62 },
  { id: "fridge-tall", kind: "fridge", name: "Tall fridge, steel", price: 1420, color: "Steel", colorHex: "#b7bbb8", w: 62, h: 185, d: 68 },

  { id: "shelf-tall", kind: "shelf", name: "Open bookshelf", price: 260, color: "White oak", colorHex: "#d7c9b0", w: 110, h: 170, d: 32 },
  { id: "shelf-low", kind: "shelf", name: "Low media shelf", price: 210, color: "White oak", colorHex: "#d7c9b0", w: 110, h: 80, d: 32 },

  { id: "lamp-arch", kind: "lamp", name: "Arched floor lamp", price: 180, color: "Brass", colorHex: "#b08a4a", w: 35, h: 160, d: 35 },
  { id: "lamp-globe", kind: "lamp", name: "Globe floor lamp", price: 240, color: "Brass", colorHex: "#b08a4a", w: 32, h: 155, d: 32 },

  { id: "plant-fig", kind: "plant", name: "Fiddle-leaf fig, 1.4 m", price: 95, color: "Green", colorHex: "#5c7a4a", w: 55, h: 140, d: 55 },
  { id: "plant-small", kind: "plant", name: "Rubber plant, small", price: 48, color: "Green", colorHex: "#4f6b41", w: 40, h: 85, d: 40 },

  { id: "table-two", kind: "table", name: "Dining table for two", price: 740, color: "Ash", colorHex: "#d7c9b0", w: 90, h: 74, d: 90 },
  { id: "table-four", kind: "table", name: "Dining table for four", price: 1120, color: "Ash", colorHex: "#d7c9b0", w: 120, h: 74, d: 80 },

  { id: "desk-writing", kind: "desk", name: "Writing desk, three drawers", price: 690, color: "Oak", colorHex: "#c6a878", w: 120, h: 74, d: 60 },
  { id: "desk-corner", kind: "desk", name: "Corner desk, ash", price: 940, color: "Ash", colorHex: "#d7c9b0", w: 140, h: 74, d: 140 },
  { id: "desk-compact", kind: "desk", name: "Wall-mounted desk, white", price: 430, color: "Chalk", colorHex: "#efe9dd", w: 100, h: 74, d: 50 },

  { id: "chair-oak", kind: "chair", name: "Oak desk chair", price: 280, color: "Oak", colorHex: "#c6a878", w: 46, h: 85, d: 50 },
  { id: "chair-moulded", kind: "chair", name: "Moulded shell chair", price: 340, color: "Chalk", colorHex: "#efe9dd", w: 48, h: 82, d: 52 },
];

export const variantsById = new Map(variants.map((v) => [v.id, v]));
export const variantsByKind = new Map<PieceKind, Variant[]>();
for (const variant of variants) {
  const list = variantsByKind.get(variant.kind) ?? [];
  list.push(variant);
  variantsByKind.set(variant.kind, list);
}

export interface Placement {
  id: string;
  variantId: string;
  x: number;
  z: number;
  rotationY?: number;
}

/** Starting room: eleven pieces, matched to the original Studio 01 layout. */
export const initialPlacements: Placement[] = [
  { id: "bed", variantId: "bed-platform", x: -1.9, z: -1.55 },
  { id: "nightstand", variantId: "nightstand-oak", x: -0.75, z: -1.9 },
  { id: "rug", variantId: "rug-clay", x: 0.9, z: 0.9 },
  { id: "sofa", variantId: "sofa-two", x: 0.9, z: 1.85, rotationY: Math.PI },
  { id: "coffee", variantId: "coffee-round", x: 0.9, z: 0.55 },
  { id: "counter", variantId: "counter-peninsula", x: 2.6, z: -0.9 },
  { id: "fridge", variantId: "fridge-compact", x: 2.55, z: 1.15 },
  { id: "shelf", variantId: "shelf-tall", x: -2.95, z: 0.9 },
  { id: "lamp", variantId: "lamp-arch", x: -0.75, z: 1.35 },
  { id: "plant", variantId: "plant-fig", x: -2.75, z: -0.35 },
  { id: "table", variantId: "table-two", x: 1.5, z: -2.0 },
];

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/** 160 → "1.60 m". Keeps dimensions readable without a unit toggle. */
export const formatDim = (cm: number) => `${(cm / 100).toFixed(2)} m`;

export const formatDims = (v: Variant) => `${v.w} × ${v.h} × ${v.d} cm`;