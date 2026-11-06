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

/** Every catalog dimension is in inches; the 3D scene works in metres. */
export const INCH = 0.0254;

export interface Variant {
  id: string;
  kind: PieceKind;
  name: string;
  price: number;
  color: string;
  colorHex: string;
  /** Inches. w and d are the floor footprint (everything the piece covers); h is overall height. */
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
  // One bed, five US mattress sizes. Frame is the mattress plus ~2 in each side.
  { id: "bed-twin", kind: "bed", name: "Twin bed, walnut", price: 690, color: "Walnut", colorHex: "#6b4b32", w: 42, h: 37, d: 79 },
  { id: "bed-twinxl", kind: "bed", name: "Twin XL bed, walnut", price: 790, color: "Walnut", colorHex: "#6b4b32", w: 42, h: 37, d: 84 },
  { id: "bed-full", kind: "bed", name: "Full bed, walnut", price: 940, color: "Walnut", colorHex: "#6b4b32", w: 58, h: 37, d: 79 },
  { id: "bed-queen", kind: "bed", name: "Queen bed, walnut", price: 1240, color: "Walnut", colorHex: "#6b4b32", w: 64, h: 37, d: 84 },
  { id: "bed-king", kind: "bed", name: "King bed, walnut", price: 1590, color: "Walnut", colorHex: "#6b4b32", w: 80, h: 37, d: 84 },

  { id: "nightstand-oak", kind: "nightstand", name: "Oak nightstand", price: 210, color: "Natural oak", colorHex: "#c6a878", w: 18, h: 20, d: 16 },
  { id: "nightstand-drawer", kind: "nightstand", name: "Two-drawer pedestal", price: 320, color: "Walnut", colorHex: "#6b4b32", w: 20, h: 22, d: 17 },

  { id: "rug-clay", kind: "rug", name: "Wool rug, clay", price: 340, color: "Clay", colorHex: "#b9724f", w: 102, h: 1, d: 75 },
  { id: "rug-oat", kind: "rug", name: "Wool rug, oat", price: 260, color: "Oat", colorHex: "#cfc4b2", w: 79, h: 1, d: 55 },

  { id: "sofa-two", kind: "sofa", name: "Two-seat sofa, oat", price: 1650, color: "Oat", colorHex: "#cfc4b2", w: 79, h: 31, d: 35 },
  { id: "sofa-three", kind: "sofa", name: "Three-seat sofa, clay", price: 2190, color: "Clay", colorHex: "#b9724f", w: 95, h: 31, d: 36 },

  { id: "coffee-round", kind: "coffee", name: "Round coffee table", price: 420, color: "Smoked oak", colorHex: "#4a3a2c", w: 35, h: 15, d: 35 },
  { id: "coffee-low", kind: "coffee", name: "Low bench table", price: 380, color: "Ash", colorHex: "#d7c9b0", w: 43, h: 13, d: 22 },

  { id: "counter-peninsula", kind: "counter", name: "Kitchen peninsula with sink", price: 3180, color: "Sage", colorHex: "#9aa78f", w: 35, h: 36, d: 126 },

  { id: "fridge-compact", kind: "fridge", name: "Compact fridge, cream", price: 899, color: "Cream", colorHex: "#e8e2d4", w: 24, h: 59, d: 24 },
  { id: "fridge-tall", kind: "fridge", name: "Tall fridge, steel", price: 1420, color: "Steel", colorHex: "#b7bbb8", w: 24, h: 73, d: 27 },

  { id: "shelf-tall", kind: "shelf", name: "Open bookshelf", price: 260, color: "White oak", colorHex: "#d7c9b0", w: 43, h: 67, d: 13 },
  { id: "shelf-low", kind: "shelf", name: "Low media shelf", price: 210, color: "White oak", colorHex: "#d7c9b0", w: 43, h: 31, d: 13 },

  { id: "lamp-arch", kind: "lamp", name: "Arched floor lamp", price: 180, color: "Brass", colorHex: "#b08a4a", w: 14, h: 63, d: 31 },
  { id: "lamp-globe", kind: "lamp", name: "Globe floor lamp", price: 240, color: "Brass", colorHex: "#b08a4a", w: 13, h: 61, d: 13 },

  { id: "plant-fig", kind: "plant", name: "Fiddle-leaf fig, 4.5 ft", price: 95, color: "Green", colorHex: "#5c7a4a", w: 22, h: 55, d: 22 },
  { id: "plant-small", kind: "plant", name: "Rubber plant, small", price: 48, color: "Green", colorHex: "#4f6b41", w: 16, h: 33, d: 16 },

  { id: "table-two", kind: "table", name: "Dining table for two", price: 740, color: "Ash", colorHex: "#d7c9b0", w: 35, h: 29, d: 35 },
  { id: "table-four", kind: "table", name: "Dining table for four", price: 1120, color: "Ash", colorHex: "#d7c9b0", w: 47, h: 29, d: 31 },

  { id: "desk-writing", kind: "desk", name: "Writing desk, three drawers", price: 690, color: "Oak", colorHex: "#c6a878", w: 47, h: 29, d: 24 },
  { id: "desk-corner", kind: "desk", name: "Corner desk, ash", price: 940, color: "Ash", colorHex: "#d7c9b0", w: 55, h: 29, d: 55 },
  { id: "desk-compact", kind: "desk", name: "Wall-mounted desk, white", price: 430, color: "Chalk", colorHex: "#efe9dd", w: 39, h: 29, d: 20 },

  { id: "chair-oak", kind: "chair", name: "Oak desk chair", price: 280, color: "Oak", colorHex: "#c6a878", w: 18, h: 33, d: 20 },
  { id: "chair-moulded", kind: "chair", name: "Moulded shell chair", price: 340, color: "Chalk", colorHex: "#efe9dd", w: 19, h: 32, d: 20 },
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

/** Starting room: eleven pieces, every one clear of the walls and of each other. */
export const initialPlacements: Placement[] = [
  { id: "bed", variantId: "bed-queen", x: -1.9, z: -1.55 },
  { id: "nightstand", variantId: "nightstand-oak", x: -0.75, z: -1.9 },
  { id: "rug", variantId: "rug-clay", x: 0.9, z: 0.9 },
  { id: "sofa", variantId: "sofa-two", x: 0.9, z: 1.85, rotationY: Math.PI },
  { id: "coffee", variantId: "coffee-round", x: 0.9, z: 0.55 },
  { id: "counter", variantId: "counter-peninsula", x: 2.58, z: -0.9 },
  { id: "fridge", variantId: "fridge-compact", x: 2.55, z: 1.15 },
  { id: "shelf", variantId: "shelf-tall", x: -2.87, z: 0.9, rotationY: Math.PI / 2 },
  { id: "lamp", variantId: "lamp-arch", x: -0.75, z: 1.35 },
  { id: "plant", variantId: "plant-fig", x: -2.72, z: -0.1 },
  { id: "table", variantId: "table-two", x: 1.5, z: -2.0 },
];

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/** 79 → 79″ */
export const formatInches = (inches: number) => `${inches}″`;

export const formatDims = (v: Variant) => `${v.w}″ W × ${v.d}″ D × ${v.h}″ H`;
