// Defensive normalizers for chat invoice payloads.
//
// Canonical chat metadata uses camelCase (see `shared/types`: `actualPrice`,
// `estimatedPrice`, `itemsTotal`, `serviceFee`, `deliveryFee`, `finalTotal`,
// `photoUrl`, `editedItems`, `approvedTotal`). The React Native client sends
// some of these in snake_case (`actual_price`, `items_total`, `service_fee`,
// `delivery_fee`, `final_total`, `photo_url`, `edited_items`,
// `approved_total`), which made invoices forwarded from RN render with ₦0
// item prices and zero totals on the web — service / delivery fees came
// through but item prices and totals were dropped.
//
// These helpers normalize whatever the chat row contains into the canonical
// camelCase shape so the rest of the UI doesn't need to care which platform
// produced the message.

import type {
  InvoiceItem,
  InvoiceMetadata,
  InvoiceResponseMetadata,
} from "@/types/chat";

type AnyRecord = Record<string, unknown>;

const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const pick = <T = unknown>(obj: AnyRecord, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    const v = obj[key];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
};

export const normalizeInvoiceItem = (raw: unknown): InvoiceItem => {
  const r = (raw ?? {}) as AnyRecord;
  const actual =
    num(pick(r, "actualPrice", "actual_price", "price", "unit_price", "unitPrice")) ?? 0;
  const estimated = num(pick(r, "estimatedPrice", "estimated_price"));
  const quantity = num(pick(r, "quantity", "qty")) ?? 1;
  const photoUrl = pick<string>(r, "photoUrl", "photo_url");
  const status = (pick<string>(r, "status") ?? "found") as InvoiceItem["status"];
  const id = pick<string>(r, "id") ?? "";
  const name = pick<string>(r, "name") ?? "";
  const substituteNote = pick<string>(r, "substituteNote", "substitute_note");
  return {
    id,
    name,
    quantity,
    actualPrice: actual,
    estimatedPrice: estimated,
    photoUrl,
    status,
    substituteNote,
  };
};

export const normalizeInvoiceMetadata = (raw: unknown): InvoiceMetadata => {
  const r = (raw ?? {}) as AnyRecord;
  const rawItems = (pick<unknown[]>(r, "items") ?? []) as unknown[];
  const items = rawItems.map(normalizeInvoiceItem);
  // Derived items total from the actual line items as a safety net so an
  // RN sender that forgot to set itemsTotal still renders a real number.
  const derivedItemsTotal = items
    .filter((i) => i.status !== "not_found")
    .reduce((sum, i) => sum + (i.actualPrice || 0) * (i.quantity || 1), 0);
  const itemsTotal =
    num(pick(r, "itemsTotal", "items_total", "subtotal")) ?? derivedItemsTotal;
  const serviceFee = num(pick(r, "serviceFee", "service_fee")) ?? 0;
  const deliveryFee = num(pick(r, "deliveryFee", "delivery_fee")) ?? 0;
  const derivedTotal = itemsTotal + serviceFee + deliveryFee;
  const finalTotal =
    num(pick(r, "finalTotal", "final_total", "total")) ??
    (derivedTotal > 0 ? derivedTotal : 0);
  const notes = pick<string>(r, "notes");
  return {
    items,
    itemsTotal,
    serviceFee,
    deliveryFee,
    finalTotal,
    notes,
  };
};

type InvoiceChange =
  | { itemId: string; action: "remove" }
  | { itemId: string; action: "quantity_change"; newQuantity?: number }
  | { itemId: string; action: "price_change"; newPrice?: number }
  | {
      itemId: string;
      action: "substitute_request";
      substituteRequest?: string;
    };

export const normalizeInvoiceResponseMetadata = (
  raw: unknown,
): InvoiceResponseMetadata & {
  editedItems?: InvoiceItem[];
} => {
  const r = (raw ?? {}) as AnyRecord;
  const invoiceId = pick<string>(r, "invoiceId", "invoice_id") ?? "";
  const action = (pick<string>(r, "action") ?? "edited") as
    | "approved"
    | "edited";
  const approvedTotal = num(
    pick(r, "approvedTotal", "approved_total", "total", "finalTotal"),
  );
  const rawChanges = pick<unknown[]>(r, "changes") ?? [];
  const changes = rawChanges
    .map((c) => {
      const ch = (c ?? {}) as AnyRecord;
      return {
        itemId: pick<string>(ch, "itemId", "item_id") ?? "",
        action: pick<string>(ch, "action") ?? "",
        newQuantity: num(pick(ch, "newQuantity", "new_quantity")),
        newPrice: num(pick(ch, "newPrice", "new_price")),
        substituteRequest: pick<string>(
          ch,
          "substituteRequest",
          "substitute_request",
        ),
      } as InvoiceChange;
    })
    .filter((c) => c.itemId && c.action);
  const rawEdited = pick<unknown[]>(r, "editedItems", "edited_items") ?? [];
  const editedItems = rawEdited.map(normalizeInvoiceItem);
  return {
    invoiceId,
    action,
    approvedTotal,
    // Cast — InvoiceResponseMetadata's `changes` is a narrower union, but
    // our normalizer keeps the discriminator + payload as the consumer
    // expects.
    changes: changes as unknown as InvoiceResponseMetadata["changes"],
    editedItems,
  };
};
