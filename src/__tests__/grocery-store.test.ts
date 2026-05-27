import { describe, it, expect, beforeEach, vi } from "vitest";

let groceryData: unknown[] = [];

vi.mock("@/lib/blob-store", () => ({
  blobGetGroceryItems: vi.fn(async () => [...groceryData]),
  blobSetGroceryItems: vi.fn(async (items: unknown[]) => { groceryData = [...items]; }),
}));

const { getItems, addItem, toggleItem, removeItem, clearChecked } = await import("@/lib/grocery-store");

describe("grocery-store", () => {
  beforeEach(() => {
    groceryData = [];
  });

  describe("addItem", () => {
    it("should add an item with correct properties", async () => {
      const item = await addItem("Milk", 1, "gal");
      expect(item.name).toBe("Milk");
      expect(item.quantity).toBe(1);
      expect(item.unit).toBe("gal");
      expect(item.checked).toBe(false);
      expect(item.id).toBeTruthy();
      expect(item.createdAt).toBeTruthy();
    });

    it("should look up prices when adding an item", async () => {
      const item = await addItem("eggs", 1, "dozen");
      expect(item.prices.length).toBeGreaterThan(0);
      expect(item.bestPrice).toBeDefined();
    });

    it("should add item to the list", async () => {
      await addItem("Bread", 1, "unit");
      const items = await getItems();
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.some((i) => i.name === "Bread")).toBe(true);
    });
  });

  describe("toggleItem", () => {
    it("should toggle checked state", async () => {
      const item = await addItem("Butter", 1, "unit");
      expect(item.checked).toBe(false);

      const toggled = await toggleItem(item.id);
      expect(toggled?.checked).toBe(true);

      const toggledBack = await toggleItem(item.id);
      expect(toggledBack?.checked).toBe(false);
    });

    it("should return null for non-existent item", async () => {
      expect(await toggleItem("nonexistent")).toBeNull();
    });
  });

  describe("removeItem", () => {
    it("should remove an existing item", async () => {
      const item = await addItem("Cheese", 1, "unit");
      expect(await removeItem(item.id)).toBe(true);
      const items = await getItems();
      expect(items.some((i) => i.id === item.id)).toBe(false);
    });

    it("should return false for non-existent item", async () => {
      expect(await removeItem("nonexistent")).toBe(false);
    });
  });

  describe("clearChecked", () => {
    it("should remove all checked items", async () => {
      const item1 = await addItem("Apple", 1, "unit");
      const item2 = await addItem("Banana", 1, "unit");
      await toggleItem(item1.id);

      const removed = await clearChecked();
      expect(removed).toBeGreaterThanOrEqual(1);
      const items = await getItems();
      expect(items.some((i) => i.id === item1.id)).toBe(false);
      expect(items.some((i) => i.id === item2.id)).toBe(true);
    });

    it("should return 0 when nothing is checked", async () => {
      await addItem("Rice", 1, "bag");
      expect(await clearChecked()).toBe(0);
    });
  });
});
