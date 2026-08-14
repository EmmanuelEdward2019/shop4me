import { describe, it, expect } from "vitest";
import {
  normalizeInvoiceItem,
  normalizeInvoiceMetadata,
  normalizeInvoiceResponseMetadata,
} from "./invoiceMetadata";

describe("normalizeInvoiceItem", () => {
  it("reads canonical camelCase fields", () => {
    const item = normalizeInvoiceItem({
      id: "1",
      name: "Rice",
      quantity: 2,
      actualPrice: 5000,
      estimatedPrice: 4800,
      photoUrl: "http://x/p.jpg",
      status: "found",
    });
    expect(item).toMatchObject({
      id: "1",
      name: "Rice",
      quantity: 2,
      actualPrice: 5000,
      estimatedPrice: 4800,
      photoUrl: "http://x/p.jpg",
      status: "found",
    });
  });

  it("reads RN snake_case fields and coerces numeric strings", () => {
    const item = normalizeInvoiceItem({
      name: "Beans",
      quantity: "3",
      actual_price: "3000",
      photo_url: "p",
    });
    expect(item.quantity).toBe(3);
    expect(item.actualPrice).toBe(3000);
    expect(item.photoUrl).toBe("p");
  });

  it("defaults missing price/quantity/status", () => {
    const item = normalizeInvoiceItem({ name: "Salt" });
    expect(item.actualPrice).toBe(0);
    expect(item.quantity).toBe(1);
    expect(item.status).toBe("found");
  });
});

describe("normalizeInvoiceMetadata", () => {
  it("derives itemsTotal + finalTotal from snake_case items when totals are absent", () => {
    const meta = normalizeInvoiceMetadata({
      items: [
        { name: "A", actual_price: 1000, quantity: 2, status: "found" },
        { name: "B", actual_price: 500, quantity: 1, status: "not_found" },
      ],
      service_fee: 100,
      delivery_fee: 200,
    });
    // not_found item is excluded from the derived items total.
    expect(meta.itemsTotal).toBe(2000);
    expect(meta.serviceFee).toBe(100);
    expect(meta.deliveryFee).toBe(200);
    expect(meta.finalTotal).toBe(2300);
  });

  it("prefers explicit totals when provided", () => {
    const meta = normalizeInvoiceMetadata({
      items: [{ name: "A", actualPrice: 100, quantity: 1 }],
      itemsTotal: 5000,
      serviceFee: 0,
      deliveryFee: 0,
      finalTotal: 6000,
    });
    expect(meta.itemsTotal).toBe(5000);
    expect(meta.finalTotal).toBe(6000);
  });

  it("handles empty / missing payloads without throwing", () => {
    const meta = normalizeInvoiceMetadata(undefined);
    expect(meta.items).toEqual([]);
    expect(meta.itemsTotal).toBe(0);
    expect(meta.finalTotal).toBe(0);
  });
});

describe("normalizeInvoiceResponseMetadata", () => {
  it("normalizes snake_case ids/totals and filters incomplete changes", () => {
    const resp = normalizeInvoiceResponseMetadata({
      invoice_id: "abc",
      action: "approved",
      approved_total: "7000",
      changes: [
        { item_id: "1", action: "remove" },
        { item_id: "", action: "remove" }, // dropped (no itemId)
        { item_id: "2", action: "" }, // dropped (no action)
      ],
      edited_items: [{ name: "X", actual_price: 900 }],
    });
    expect(resp.invoiceId).toBe("abc");
    expect(resp.action).toBe("approved");
    expect(resp.approvedTotal).toBe(7000);
    expect(resp.changes).toHaveLength(1);
    expect(resp.editedItems?.[0].actualPrice).toBe(900);
  });
});
