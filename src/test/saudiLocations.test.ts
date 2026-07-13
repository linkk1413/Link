import { describe, it, expect } from "vitest";
import {
  getRegionLabel,
  getCityLabel,
  getDistrictLabel,
  formatLocation,
} from "@/lib/saudiLocations";

// Locations are stored by their English value ("Riyadh"), which is why Arabic
// users were seeing English city names.
describe("location labels", () => {
  it("translates a stored city value to Arabic", () => {
    expect(getCityLabel("Riyadh", true)).toBe("الرياض");
    expect(getCityLabel("Jeddah", true)).toBe("جدة");
  });

  it("keeps English when the language is English", () => {
    expect(getCityLabel("Riyadh", false)).toBe("Riyadh");
  });

  it("translates regions", () => {
    expect(getRegionLabel("Riyadh", true)).toBe("الرياض");
  });

  it("translates legacy districts picked from the old dropdown", () => {
    expect(getDistrictLabel("Al Olaya", true)).toBe("العليا");
  });

  it("returns hand-typed districts exactly as written", () => {
    expect(getDistrictLabel("حي الورود", true)).toBe("حي الورود");
    expect(getDistrictLabel("My Custom Area", false)).toBe("My Custom Area");
  });

  it("returns an unknown city unchanged instead of blanking it", () => {
    expect(getCityLabel("Atlantis", true)).toBe("Atlantis");
  });

  it("is empty for empty input", () => {
    expect(getCityLabel("", true)).toBe("");
    expect(getDistrictLabel("", true)).toBe("");
  });

  it("formats district + city, skipping the missing half", () => {
    expect(formatLocation({ city: "Riyadh", area: "Al Olaya" }, true)).toBe(
      "العليا، الرياض",
    );
    expect(formatLocation({ city: "Riyadh" }, true)).toBe("الرياض");
    expect(formatLocation({ city: "Riyadh", area: "Al Olaya" }, false)).toBe(
      "Al Olaya, Riyadh",
    );
    expect(formatLocation({}, true)).toBe("");
  });
});
