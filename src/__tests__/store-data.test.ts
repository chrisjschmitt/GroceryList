import { describe, it, expect } from "vitest";
import { lookupPrices, findBestPrice, LOCAL_STORES } from "@/lib/store-data";

describe("store-data", () => {
  describe("LOCAL_STORES", () => {
    it("should have 4 stores", () => {
      expect(LOCAL_STORES).toHaveLength(4);
    });

    it("should have unique store IDs", () => {
      const ids = LOCAL_STORES.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("lookupPrices", () => {
    it("should return prices for a known item", () => {
      const prices = lookupPrices("milk");
      expect(prices.length).toBeGreaterThan(0);
      prices.forEach((p) => {
        expect(p.price).toBeGreaterThan(0);
        expect(p.storeName).toBeTruthy();
      });
    });

    it("should return prices from multiple stores", () => {
      const prices = lookupPrices("eggs");
      expect(prices.length).toBe(4);
    });

    it("should handle case-insensitive lookup", () => {
      const lower = lookupPrices("milk");
      const upper = lookupPrices("MILK");
      expect(lower.length).toBe(upper.length);
    });

    it("should return empty for unknown items", () => {
      const prices = lookupPrices("xyznonexistent");
      expect(prices).toHaveLength(0);
    });

    it("should handle whitespace in item names", () => {
      const prices = lookupPrices("  milk  ");
      expect(prices.length).toBeGreaterThan(0);
    });
  });

  describe("findBestPrice", () => {
    it("should find the lowest price", () => {
      const prices = lookupPrices("milk");
      const best = findBestPrice(prices);
      expect(best).toBeDefined();
      const minPrice = Math.min(...prices.map((p) => p.price));
      expect(best!.price).toBe(minPrice);
    });

    it("should return undefined for empty array", () => {
      expect(findBestPrice([])).toBeUndefined();
    });

    it("should return the only price when array has one element", () => {
      const single = [{ storeId: "s1", storeName: "Test", price: 5.0, onSale: false }];
      expect(findBestPrice(single)?.price).toBe(5.0);
    });
  });
});
