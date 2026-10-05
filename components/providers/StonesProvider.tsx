"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { useShop } from "@/components/providers/ShopProvider";
import { useToast } from "@/components/ui/Toast";
import { DEMO_TODAY } from "@/lib/config";
import { getSession } from "@/lib/services/auth";
import { emptyStoneData, STONE_STOCK_RESTORED_EVENT, STONE_STOCK_RETURNED_EVENT, STONE_STOCK_SOLD_EVENT, type StoneData, type StoneItem, type StoneMovement, type StoneStatus } from "@/lib/stones";
import { uid } from "@/lib/utils";

const STORAGE_KEY = "reinsoft-gold-stones-v1";

interface StonesState extends StoneData {
  saveStone: (stone: Omit<StoneItem, "id"> & { id?: string }) => StoneItem;
  setStoneStatus: (id: string, status: StoneStatus, reference?: string) => void;
}

const Context = createContext<StonesState | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function StonesProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const { logAudit } = useApp();
  const { stock } = useShop();
  const [data, setData] = useState<StoneData>(emptyStoneData);
  const [loaded, setLoaded] = useState(false);
  const dataRef = useRef(data);

  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved: unknown = JSON.parse(raw);
          if (!isRecord(saved)) throw new Error("Saved stone inventory has an invalid format.");
          setData({
            stones: Array.isArray(saved.stones) ? saved.stones as StoneItem[] : [],
            movements: Array.isArray(saved.movements) ? saved.movements as StoneMovement[] : [],
          });
        }
      } catch (error) {
        toast(error instanceof Error ? `Could not load stone inventory: ${error.message}` : "Could not load stone inventory.", "error");
      } finally {
        setLoaded(true);
      }
    });
  }, [toast]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      toast(error instanceof Error ? `Could not save stone inventory: ${error.message}` : "Could not save stone inventory.", "error");
    }
  }, [data, loaded, toast]);

  useEffect(() => {
    if (!loaded) return;
    const onSold = (rawEvent: Event) => {
      const detail: unknown = (rawEvent as CustomEvent<unknown>).detail;
      if (!isRecord(detail) || !Array.isArray(detail.items)) return;
      const soldItems = detail.items.filter((item): item is { id: string; tag: string } => isRecord(item) && typeof item.id === "string" && typeof item.tag === "string");
      const current = dataRef.current;
      const changed = current.stones.filter((stone) => stone.status !== "Sold" && soldItems.some((item) => stone.linkedStockItemId === item.id || stone.linkedStockTag === item.tag));
      if (!changed.length) return;
      const movements = changed.map((stone) => {
        const item = soldItems.find((linked) => stone.linkedStockItemId === linked.id || stone.linkedStockTag === linked.tag);
        return {
          id: uid("STMOVE"),
          stoneId: stone.id,
          date: DEMO_TODAY,
          fromStatus: stone.status,
          toStatus: "Sold" as const,
          reference: item?.tag ?? stone.linkedStockTag,
          actor: getSession()?.name ?? "System",
          notes: "Linked jewellery item sold.",
        };
      });
      const next = {
        ...current,
        stones: current.stones.map((stone) => changed.some((item) => item.id === stone.id) ? { ...stone, status: "Sold" as const } : stone),
        movements: [...movements, ...current.movements],
      };
      dataRef.current = next;
      setData(next);
      changed.forEach((stone) => logAudit(`Stone ${stone.stoneId} sold with ${stone.linkedStockTag}`, { module: "Stone Inventory", referenceId: stone.id, previousValue: stone.status, newValue: "Sold" }));
    };
    const onReturned = (rawEvent: Event) => {
      const detail: unknown = (rawEvent as CustomEvent<unknown>).detail;
      if (!isRecord(detail) || typeof detail.originalItem !== "string" || typeof detail.returnId !== "string" || !isRecord(detail.returnedStock) || typeof detail.returnedStock.id !== "string" || typeof detail.returnedStock.tag !== "string") return;
      const originalTag = detail.originalItem.match(/RG-T\d+/)?.[0];
      if (!originalTag) return;
      const current = dataRef.current;
      const changed = current.stones.filter((stone) => stone.linkedStockTag === originalTag && stone.status === "Sold");
      if (!changed.length) return;
      const returnId = detail.returnId;
      const returnedStockId = detail.returnedStock.id;
      const returnedStockTag = detail.returnedStock.tag;
      const movements = changed.map((stone) => ({
        id: uid("STMOVE"),
        stoneId: stone.id,
        date: DEMO_TODAY,
        fromStatus: "Sold" as const,
        toStatus: "Returned" as const,
        reference: returnId,
        actor: getSession()?.name ?? "System",
        notes: `Relinked to returned stock ${returnedStockTag}.`,
      }));
      const next = {
        ...current,
        stones: current.stones.map((stone) => changed.some((item) => item.id === stone.id)
          ? { ...stone, status: "Returned" as const, linkedStockItemId: returnedStockId, linkedStockTag: returnedStockTag }
          : stone),
        movements: [...movements, ...current.movements],
      };
      dataRef.current = next;
      setData(next);
      changed.forEach((stone) => logAudit(`Returned stone ${stone.stoneId} linked to ${returnedStockTag}`, { module: "Stone Inventory", referenceId: returnId, previousValue: "Sold", newValue: "Returned" }));
    };
    const onRestored = (rawEvent: Event) => {
      const detail: unknown = (rawEvent as CustomEvent<unknown>).detail;
      if (!isRecord(detail) || !Array.isArray(detail.items) || typeof detail.reference !== "string") return;
      const tags = detail.items.flatMap((item) => isRecord(item) && typeof item.tag === "string" ? [item.tag] : []);
      if (!tags.length) return;
      const current = dataRef.current;
      const changed = current.stones.filter((stone) => tags.includes(stone.linkedStockTag) && stone.status === "Sold");
      if (!changed.length) return;
      const movements = changed.map((stone) => ({
        id: uid("STMOVE"),
        stoneId: stone.id,
        date: DEMO_TODAY,
        fromStatus: "Sold" as const,
        toStatus: "Assigned" as const,
        reference: detail.reference as string,
        actor: getSession()?.name ?? "System",
        notes: "Sale reversal restored the linked jewellery stock item.",
      }));
      const next = {
        ...current,
        stones: current.stones.map((stone) => changed.some((item) => item.id === stone.id) ? { ...stone, status: "Assigned" as const } : stone),
        movements: [...movements, ...current.movements],
      };
      dataRef.current = next;
      setData(next);
      changed.forEach((stone) => logAudit(`Restored stone ${stone.stoneId} after sale reversal`, { module: "Stone Inventory", referenceId: detail.reference as string, previousValue: "Sold", newValue: "Assigned" }));
    };
    window.addEventListener(STONE_STOCK_SOLD_EVENT, onSold);
    window.addEventListener(STONE_STOCK_RETURNED_EVENT, onReturned);
    window.addEventListener(STONE_STOCK_RESTORED_EVENT, onRestored);
    return () => {
      window.removeEventListener(STONE_STOCK_SOLD_EVENT, onSold);
      window.removeEventListener(STONE_STOCK_RETURNED_EVENT, onReturned);
      window.removeEventListener(STONE_STOCK_RESTORED_EVENT, onRestored);
    };
  }, [loaded, logAudit]);

  const saveStone = useCallback((draft: Omit<StoneItem, "id"> & { id?: string }) => {
    if (getSession()?.role === "Staff") throw new Error("Only Owners and Accountants can manage stone inventory.");
    if (!draft.stoneId.trim() || !draft.type.trim() || !validDate(draft.purchaseDate) || !Number.isFinite(draft.carat) || draft.carat <= 0) throw new Error("Stone ID, type, valid purchase date and positive carat are required.");
    if (![draft.purchaseCost, draft.sellingValue].every((value) => Number.isFinite(value) && value >= 0)) throw new Error("Stone purchase cost and selling value must be non-negative.");
    if (data.stones.some((stone) => stone.stoneId.toLocaleLowerCase() === draft.stoneId.trim().toLocaleLowerCase() && stone.id !== draft.id)) throw new Error("Stone ID must be unique.");
    if (draft.photoUrl && !/^https?:\/\//i.test(draft.photoUrl)) throw new Error("Photo reference must be an http(s) URL.");
    const linked = draft.linkedStockItemId ? stock.find((item) => item.id === draft.linkedStockItemId) : undefined;
    if (draft.linkedStockItemId && !linked) throw new Error("The linked jewellery stock item could not be found.");
    if (draft.supplierId && !/^[A-Z0-9-]+$/i.test(draft.supplierId)) throw new Error("Invalid supplier reference.");
    const existing = draft.id ? data.stones.find((stone) => stone.id === draft.id) : undefined;
    if (existing?.status === "Sold" && draft.linkedStockItemId !== existing.linkedStockItemId) throw new Error("Unlinking a sold stone requires the linked jewellery return workflow.");
    const targetStatus: StoneStatus = linked?.status === "Sold" ? "Sold" : linked ? "Assigned" : draft.status;
    if (existing && existing.status !== targetStatus && (
      targetStatus === "Returned" ||
      (targetStatus === "Sold" && linked?.status !== "Sold") ||
      existing.status === "Sold"
    )) {
      throw new Error("Use the status workflow to record stone movements.");
    }
    const id = draft.id ?? uid("STONE");
    const status = targetStatus;
    const stone: StoneItem = { ...draft, id, stoneId: draft.stoneId.trim(), type: draft.type.trim(), status, linkedStockTag: linked?.tag ?? "" };
    const movement: StoneMovement | undefined = !existing
      ? { id: uid("STMOVE"), stoneId: id, date: draft.purchaseDate, fromStatus: "New", toStatus: status, reference: draft.certificateNumber || draft.supplierId || id, actor: getSession()?.name ?? "Unknown user", notes: "Stone received into inventory." }
      : existing.status !== status
        ? { id: uid("STMOVE"), stoneId: id, date: DEMO_TODAY, fromStatus: existing.status, toStatus: status, reference: linked?.tag ?? id, actor: getSession()?.name ?? "Unknown user", notes: "Stone status updated." }
        : undefined;
    setData((current) => ({
      ...current,
      stones: current.stones.some((stoneItem) => stoneItem.id === id) ? current.stones.map((stoneItem) => stoneItem.id === id ? stone : stoneItem) : [stone, ...current.stones],
      ...(movement ? { movements: [movement, ...current.movements] } : {}),
    }));
    logAudit(`${existing ? "Updated" : "Purchased"} stone ${stone.stoneId}`, { module: "Stone Inventory", referenceId: id, previousValue: existing ? JSON.stringify(existing) : undefined, newValue: JSON.stringify(stone) });
    return stone;
  }, [data.stones, logAudit, stock]);

  const setStoneStatus = useCallback((id: string, status: StoneStatus, reference = "") => {
    if (getSession()?.role === "Staff") throw new Error("Only Owners and Accountants can change stone status.");
    const stone = data.stones.find((item) => item.id === id);
    if (!stone) throw new Error("Stone record was not found.");
    if (status === "Returned") throw new Error("Returned status is set from the linked jewellery return workflow.");
    if (stone.linkedStockItemId && status === "Sold") throw new Error("Sell the linked jewellery through billing so stock and stone status stay in sync.");
    if (stone.status === "Sold") throw new Error("Sold stones can only change through a linked jewellery return.");
    if (status === "Assigned" && !stone.linkedStockItemId) throw new Error("Link a jewellery stock item before assigning this stone.");
    if (status === "Available" && stone.linkedStockItemId) throw new Error("Unlink the jewellery item before making this stone available.");
    if (status === "Sold" && !reference.trim() && !stone.linkedStockItemId) throw new Error("Enter the sale reference for a standalone stone.");
    const movement: StoneMovement = { id: uid("STMOVE"), stoneId: id, date: DEMO_TODAY, fromStatus: stone.status, toStatus: status, reference: reference.trim() || stone.linkedStockTag || id, actor: getSession()?.name ?? "Unknown user", notes: status === "Sold" ? "Standalone stone sale recorded." : "Stone status changed." };
    setData((current) => ({
      ...current,
      stones: current.stones.map((item) => item.id === id ? { ...item, status } : item),
      movements: [movement, ...current.movements],
    }));
    logAudit(`Stone ${stone.stoneId} status ${stone.status} → ${status}`, { module: "Stone Inventory", referenceId: id, previousValue: stone.status, newValue: `${status}; ${movement.reference}` });
  }, [data.stones, logAudit]);

  const value = useMemo<StonesState>(() => ({ ...data, saveStone, setStoneStatus }), [data, saveStone, setStoneStatus]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useStones() {
  const context = useContext(Context);
  if (!context) throw new Error("useStones must be used inside StonesProvider");
  return context;
}
