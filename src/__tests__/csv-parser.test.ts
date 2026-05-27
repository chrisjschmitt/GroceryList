import { describe, it, expect } from "vitest";
import { parseCsv } from "@/lib/csv-parser";

describe("csv-parser", () => {
  describe("parseCsv", () => {
    it("should parse basic CSV with category and item columns", () => {
      const csv = `Dairy,Milk
Dairy,Cheese
Produce,Apples
Produce,Bananas`;

      const { items, errors } = parseCsv(csv);
      expect(errors).toHaveLength(0);
      expect(items).toHaveLength(4);
      expect(items[0].category).toBe("Dairy");
      expect(items[0].name).toBe("Milk");
      expect(items[1].name).toBe("Cheese");
      expect(items[2].category).toBe("Produce");
      expect(items[3].name).toBe("Bananas");
    });

    it("should skip header row if it contains 'category' or 'item'", () => {
      const csv = `Category,Item
Dairy,Milk
Meat,Chicken`;

      const { items, errors } = parseCsv(csv);
      expect(errors).toHaveLength(0);
      expect(items).toHaveLength(2);
      expect(items[0].name).toBe("Milk");
    });

    it("should handle Windows line endings (CRLF)", () => {
      const csv = "Dairy,Milk\r\nProduce,Apples\r\nMeat,Chicken";

      const { items } = parseCsv(csv);
      expect(items).toHaveLength(3);
    });

    it("should handle quoted fields with commas", () => {
      const csv = `"Dairy, Refrigerated",Milk
Produce,"Apples, Organic"`;

      const { items, errors } = parseCsv(csv);
      expect(errors).toHaveLength(0);
      expect(items).toHaveLength(2);
      expect(items[0].category).toBe("Dairy, Refrigerated");
      expect(items[1].name).toBe("Apples, Organic");
    });

    it("should handle quoted fields with escaped quotes", () => {
      const csv = `Dairy,"2"" Block Cheese"`;

      const { items } = parseCsv(csv);
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('2" Block Cheese');
    });

    it("should skip empty lines", () => {
      const csv = `Dairy,Milk

Produce,Apples

Meat,Chicken`;

      const { items } = parseCsv(csv);
      expect(items).toHaveLength(3);
    });

    it("should report error for lines with less than 2 columns", () => {
      const csv = `Dairy,Milk
JustOneColumn
Produce,Apples`;

      const { items, errors } = parseCsv(csv);
      expect(items).toHaveLength(2);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("Line 2");
    });

    it("should report error for empty category or item name", () => {
      const csv = `,Milk
Dairy,`;

      const { items, errors } = parseCsv(csv);
      expect(items).toHaveLength(0);
      expect(errors).toHaveLength(2);
    });

    it("should return error for completely empty file", () => {
      const { items, errors } = parseCsv("");
      expect(items).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("empty");
    });

    it("should set selected to false for all parsed items", () => {
      const csv = `Dairy,Milk
Produce,Apples`;

      const { items } = parseCsv(csv);
      items.forEach((item) => {
        expect(item.selected).toBe(false);
      });
    });

    it("should generate unique IDs for each item", () => {
      const csv = `Dairy,Milk
Dairy,Cheese
Produce,Apples`;

      const { items } = parseCsv(csv);
      const ids = items.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("should trim whitespace from category and name", () => {
      const csv = `  Dairy  ,  Milk  
 Produce , Apples `;

      const { items } = parseCsv(csv);
      expect(items[0].category).toBe("Dairy");
      expect(items[0].name).toBe("Milk");
      expect(items[1].category).toBe("Produce");
      expect(items[1].name).toBe("Apples");
    });

    it("should handle extra columns gracefully (ignore them)", () => {
      const csv = `Dairy,Milk,extra,columns
Produce,Apples,more,stuff`;

      const { items, errors } = parseCsv(csv);
      expect(errors).toHaveLength(0);
      expect(items).toHaveLength(2);
      expect(items[0].category).toBe("Dairy");
      expect(items[0].name).toBe("Milk");
    });
  });
});
