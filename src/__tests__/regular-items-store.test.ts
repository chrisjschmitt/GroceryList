import { describe, it, expect, beforeEach } from "vitest";
import {
  getRegularItems,
  setRegularItems,
  addRegularItems,
  toggleRegularItem,
  clearRegularItems,
  getSelectedItems,
  deselectAll,
} from "@/lib/regular-items-store";

describe("regular-items-store", () => {
  beforeEach(() => {
    clearRegularItems();
  });

  describe("setRegularItems / getRegularItems", () => {
    it("should store and retrieve items", () => {
      const items = [
        { id: "1", category: "Dairy", name: "Milk", selected: false },
        { id: "2", category: "Produce", name: "Apples", selected: false },
      ];

      setRegularItems(items);
      expect(getRegularItems()).toHaveLength(2);
      expect(getRegularItems()[0].name).toBe("Milk");
    });

    it("should replace existing items", () => {
      setRegularItems([{ id: "1", category: "Dairy", name: "Milk", selected: false }]);
      setRegularItems([{ id: "2", category: "Meat", name: "Chicken", selected: false }]);

      const items = getRegularItems();
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe("Chicken");
    });
  });

  describe("addRegularItems", () => {
    it("should append items to existing list", () => {
      setRegularItems([{ id: "1", category: "Dairy", name: "Milk", selected: false }]);
      addRegularItems([{ id: "2", category: "Produce", name: "Apples", selected: false }]);

      expect(getRegularItems()).toHaveLength(2);
    });
  });

  describe("toggleRegularItem", () => {
    it("should toggle selected state", () => {
      setRegularItems([{ id: "1", category: "Dairy", name: "Milk", selected: false }]);

      const toggled = toggleRegularItem("1");
      expect(toggled?.selected).toBe(true);

      const toggledBack = toggleRegularItem("1");
      expect(toggledBack?.selected).toBe(false);
    });

    it("should return null for non-existent item", () => {
      expect(toggleRegularItem("nonexistent")).toBeNull();
    });
  });

  describe("getSelectedItems", () => {
    it("should return only selected items", () => {
      setRegularItems([
        { id: "1", category: "Dairy", name: "Milk", selected: true },
        { id: "2", category: "Produce", name: "Apples", selected: false },
        { id: "3", category: "Meat", name: "Chicken", selected: true },
      ]);

      const selected = getSelectedItems();
      expect(selected).toHaveLength(2);
      expect(selected.map((i) => i.name)).toEqual(["Milk", "Chicken"]);
    });
  });

  describe("deselectAll", () => {
    it("should set all items to not selected", () => {
      setRegularItems([
        { id: "1", category: "Dairy", name: "Milk", selected: true },
        { id: "2", category: "Produce", name: "Apples", selected: true },
      ]);

      deselectAll();
      const items = getRegularItems();
      expect(items.every((i) => !i.selected)).toBe(true);
    });
  });

  describe("clearRegularItems", () => {
    it("should remove all items", () => {
      setRegularItems([
        { id: "1", category: "Dairy", name: "Milk", selected: false },
        { id: "2", category: "Produce", name: "Apples", selected: false },
      ]);

      clearRegularItems();
      expect(getRegularItems()).toHaveLength(0);
    });
  });
});
