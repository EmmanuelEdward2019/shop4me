import { describe, it, expect, vi } from "vitest";

// The edge function is unavailable in unit tests — force the resilient
// client-side fallback path so we can assert its fee tiers.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockRejectedValue(new Error("offline")),
    },
  },
}));

import { calculateOrderFees, haversineKm } from "./fee-calculator";

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm(4.8, 7.0, 4.8, 7.0)).toBe(0);
  });

  it("approximates ~111 km per degree of latitude", () => {
    const d = haversineKm(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it("is symmetric", () => {
    const a = haversineKm(4.81, 7.01, 4.85, 7.05);
    const b = haversineKm(4.85, 7.05, 4.81, 7.01);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe("calculateOrderFees (fallback)", () => {
  it("applies 10% service fee at/under ₦20,000", async () => {
    const r = await calculateOrderFees({ subtotal: 10000 });
    expect(r.service_fee_percentage).toBe(10);
    expect(r.service_fee).toBe(1000);
    expect(r.delivery_fee).toBe(1500);
    expect(r.total).toBe(12500);
  });

  it("applies 7% between ₦20,001 and ₦50,000", async () => {
    const r = await calculateOrderFees({ subtotal: 30000 });
    expect(r.service_fee_percentage).toBe(7);
    expect(r.service_fee).toBe(2100);
    expect(r.total).toBe(33600);
  });

  it("applies 5% above ₦50,000", async () => {
    const r = await calculateOrderFees({ subtotal: 60000 });
    expect(r.service_fee_percentage).toBe(5);
    expect(r.service_fee).toBe(3000);
    expect(r.total).toBe(64500);
  });
});
