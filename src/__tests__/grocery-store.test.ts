import { describe, it, expect, beforeEach } from "vitest";
import { getItems, addItem, toggleItem, removeItem, clearChecked } from "@/lib/grocery-store";

describe("grocery-store", () => {
  beforeEach(() => {
    const items = getItems();
    items.forEach((i) => removeItem(i.id));
  });

  describe("addItem", () => {
    it("should add an item with correct properties", () => {
      const item = addItem("Milk", 1, "gal");
      expect(item.name).toBe("Milk");
      expect(item.quantity).toBe(1);
      expect(item.unit).toBe("gal");
      expect(item.checked).toBe(false);
      expect(item.id).toBeTruthy();
      expect(item.createdAt).toBeTruthy();
    });

    it("should look up prices when adding an item", () => {
      const item = addItem("eggs", 1, "dozen");
      expect(item.prices.length).toBeGreaterThan(0);
      expect(item.bestPrice).toBeDefined();
    });

    it("should add item to the list", () => {
      addItem("Bread", 1, "unit");
      const items = getItems();
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.some((i) => i.name === "Bread")).toBe(true);
    });
  });

  describe("toggleItem", () => {
    it("should toggle checked state", () => {
      const item = addItem("Butter", 1, "unit");
      expect(item.checked).toBe(false);

      const toggled = toggleItem(item.id);
      expect(toggled?.checked).toBe(true);

      const toggledBack = toggleItem(item.id);
      expect(toggledBack?.checked).toBe(false);
    });

    it("should return null for non-existent item", () => {
      expect(toggleItem("nonexistent")).toBeNull();
    });
  });

  describe("removeItem", () => {
    it("should remove an existing item", () => {
      const item = addItem("Cheese", 1, "unit");
      expect(removeItem(item.id)).toBe(true);
      const items = getItems();
      expect(items.some((i) => i.id === item.id)).toBe(false);
    });

    it("should return false for non-existent item", () => {
      expect(removeItem("nonexistent")).toBe(false);
    });
  });

  describe("clearChecked", () => {
    it("should remove all checked items", () => {
      const item1 = addItem("Apple", 1, "unit");
      const item2 = addItem("Banana", 1, "unit");
      toggleItem(item1.id);

      const removed = clearChecked();
      expect(removed).toBeGreaterThanOrEqual(1);
      const items = getItems();
      expect(items.some((i) => i.id === item1.id)).toBe(false);
      expect(items.some((i) => i.id === item2.id)).toBe(true);
    });

    it("should return 0 when nothing is checked", () => {
      addItem("Rice", 1, "bag");
      expect(clearChecked()).toBe(0);
    });
  });
});
