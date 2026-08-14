import { describe, it, expect } from "vitest";
import { isIOS, isIOSSafari, isStandalone } from "./pwa";

const setUA = (ua: string) =>
  Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1";
const DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

describe("pwa detection", () => {
  it("detects iOS from an iPhone user agent", () => {
    setUA(IPHONE_SAFARI);
    expect(isIOS()).toBe(true);
  });

  it("is not iOS on desktop", () => {
    setUA(DESKTOP);
    expect(isIOS()).toBe(false);
    expect(isIOSSafari()).toBe(false);
  });

  it("isIOSSafari is true in Safari but false in Chrome-on-iOS", () => {
    setUA(IPHONE_SAFARI);
    expect(isIOSSafari()).toBe(true);
    setUA(IPHONE_CHROME);
    expect(isIOSSafari()).toBe(false);
  });

  it("isStandalone is false in a normal browser context", () => {
    expect(isStandalone()).toBe(false);
  });
});
