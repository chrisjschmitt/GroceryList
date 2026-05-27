import { describe, it, expect, beforeEach, vi } from "vitest";

let regularData: unknown[] = [];

vi.mock("@/lib/blob-store", () => ({
  blobGetRegularItems: vi.fn(async () => [...regularData]),
  blobSetRegularItems: vi.fn(async (items: unknown[]) => { regularData = [...items]; }),
}));

const {
  getRegularItems,
  setRegularItems,
  addRegularItems,
  toggleRegularItem,
  clearRegularItems,
  getSelectedItems,
  deselectAll,
} = await import("@/lib/regular-items-store");

describe("regular-items-store", () => {
  beforeEach(() => {
    regularData = [];
  });

  describe("setRegularItems / getRegularItems", () => {
    it("should store and retrieve items", async () => {
      const items = [
        { id: "1", category: "Dairy", name: "Milk", selected: false },
        { id: "2", category: "Produce", name: "Apples", selected: false },
      ];

      await setRegularItems(items);
      expect(await getRegularItems()).toHaveLength(2);
    });

    it("should replace existing items", async () => {
      await setRegularItems([{ id: "1", category: "Dairy", name: "Milk", selected: false }]);
      await setRegularItems([{ id: "2", category: "Meat", name: "Chicken", selected: false }]);

      const items = await getRegularItems();
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe("Chicken");
    });
  });

  describe("addRegularItems", () => {
    it("should append items to existing list", async () => {
      await setRegularItems([{ id: "1", category: "Dairy", name: "Milk", selected: false }]);
      await addRegularItems([{ id: "2", category: "Produce", name: "Apples", selected: false }]);

      expect(await getRegularItems()).toHaveLength(2);
    });
  });

  describe("toggleRegularItem", () => {
    it("should toggle selected state", async () => {
      await setRegularItems([{ id: "1", category: "Dairy", name: "Milk", selected: false }]);

      const toggled = await toggleRegularItem("1");
      expect(toggled?.selected).toBe(true);

      const toggledBack = await toggleRegularItem("1");
      expect(toggledBack?.selected).toBe(false);
    });

    it("should return null for non-existent item", async () => {
      expect(await toggleRegularItem("nonexistent")).toBeNull();
    });
  });

  describe("getSelectedItems", () => {
    it("should return only selected items", async () => {
      await setRegularItems([
        { id: "1", category: "Dairy", name: "Milk", selected: true },
        { id: "2", category: "Produce", name: "Apples", selected: false },
        { id: "3", category: "Meat", name: "Chicken", selected: true },
      ]);

      const selected = await getSelectedItems();
      expect(selected).toHaveLength(2);
    });
  });

  describe("deselectAll", () => {
    it("should set all items to not selected", async () => {
      await setRegularItems([
        { id: "1", category: "Dairy", name: "Milk", selected: true },
        { id: "2", category: "Produce", name: "Apples", selected: true },
      ]);

      await deselectAll();
      const items = await getRegularItems();
      expect(items.every((i) => !i.selected)).toBe(true);
    });
  });

  describe("clearRegularItems", () => {
    it("should remove all items", async () => {
      await setRegularItems([
        { id: "1", category: "Dairy", name: "Milk", selected: false },
        { id: "2", category: "Produce", name: "Apples", selected: false },
      ]);

      await clearRegularItems();
      expect(await getRegularItems()).toHaveLength(0);
    });
  });
});
