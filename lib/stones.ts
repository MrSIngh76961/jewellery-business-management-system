export const DEFAULT_STONE_TYPES = ["Diamond", "Ruby", "Emerald", "Sapphire", "Pearl", "Other"] as const;
export const STONE_STATUSES = ["Available", "Reserved", "Assigned", "Sold", "Returned"] as const;
export type StoneStatus = (typeof STONE_STATUSES)[number];
export const STONE_STOCK_SOLD_EVENT = "reinsoft-gold:stone-stock-sold";
export const STONE_STOCK_RETURNED_EVENT = "reinsoft-gold:stone-stock-returned";
export const STONE_STOCK_RESTORED_EVENT = "reinsoft-gold:stone-stock-restored";

export function publishStoneStockSold(items: Array<{ id: string; tag: string }>) {
  if (typeof window !== "undefined" && items.length) window.dispatchEvent(new CustomEvent(STONE_STOCK_SOLD_EVENT, { detail: { items } }));
}

export function publishStoneStockReturned(input: { originalItem: string; returnId: string; returnedStock: { id: string; tag: string } }) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(STONE_STOCK_RETURNED_EVENT, { detail: input }));
}

export function publishStoneStockRestored(items: Array<{ id: string; tag: string }>, reference: string) {
  if (typeof window !== "undefined" && items.length) window.dispatchEvent(new CustomEvent(STONE_STOCK_RESTORED_EVENT, { detail: { items, reference } }));
}

export interface StoneItem {
  id: string;
  stoneId: string;
  type: string;
  shape: string;
  cut: string;
  carat: number;
  color: string;
  clarity: string;
  certificateNumber: string;
  certificateProvider: string;
  purchaseCost: number;
  sellingValue: number;
  supplierId: string;
  status: StoneStatus;
  photoUrl: string;
  notes: string;
  purchaseDate: string;
  linkedStockItemId: string;
  linkedStockTag: string;
}

export interface StoneMovement {
  id: string;
  stoneId: string;
  date: string;
  fromStatus: StoneStatus | "New";
  toStatus: StoneStatus;
  reference: string;
  actor: string;
  notes: string;
}

export interface StoneData {
  stones: StoneItem[];
  movements: StoneMovement[];
}

export const emptyStoneData: StoneData = { stones: [], movements: [] };
