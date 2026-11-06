export interface ApartmentItem {
  id: string;
  name: string;
  price: number;
  color: string;
  colorHex: string;
  category: string;
}

export const items: ApartmentItem[] = [
  { id: "bed", name: "Platform bed, walnut", price: 1240, color: "Walnut", colorHex: "#6b4b32", category: "Sleeping" },
  { id: "nightstand", name: "Oak nightstand", price: 210, color: "Natural oak", colorHex: "#c6a878", category: "Sleeping" },
  { id: "rug", name: "Wool rug, clay", price: 340, color: "Clay", colorHex: "#b9724f", category: "Living" },
  { id: "sofa", name: "Two-seat sofa, oat", price: 1650, color: "Oat", colorHex: "#cfc4b2", category: "Living" },
  { id: "coffee", name: "Round coffee table", price: 420, color: "Smoked oak", colorHex: "#4a3a2c", category: "Living" },
  { id: "counter", name: "Kitchen peninsula with sink", price: 3180, color: "Sage", colorHex: "#9aa78f", category: "Kitchen" },
  { id: "fridge", name: "Compact fridge, cream", price: 899, color: "Cream", colorHex: "#e8e2d4", category: "Kitchen" },
  { id: "shelf", name: "Open bookshelf", price: 260, color: "White oak", colorHex: "#d7c9b0", category: "Storage" },
  { id: "lamp", name: "Arched floor lamp", price: 180, color: "Brass", colorHex: "#b08a4a", category: "Lighting" },
  { id: "plant", name: "Fiddle-leaf fig, 1.4 m", price: 95, color: "Green", colorHex: "#5c7a4a", category: "Plants" },
  { id: "table", name: "Dining table for two", price: 740, color: "Ash", colorHex: "#d7c9b0", category: "Dining" },
];

export const totalPrice: number = items.reduce((sum, item) => sum + item.price, 0);

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);