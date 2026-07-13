import { describe, it, expect } from "vitest";
import {
  parseDurationToMinutes,
  formatServiceDuration,
  DEFAULT_DURATION_MIN,
} from "@/lib/duration";

describe("parseDurationToMinutes", () => {
  it("reads a bare number as hours", () => {
    expect(parseDurationToMinutes("2")).toBe(120);
    expect(parseDurationToMinutes("1.5")).toBe(90);
    expect(parseDurationToMinutes("0.5")).toBe(30);
  });

  it("reads Arabic-Indic digits", () => {
    expect(parseDurationToMinutes("٢")).toBe(120);
    expect(parseDurationToMinutes("١.٥")).toBe(90);
  });

  it("reads Arabic words", () => {
    expect(parseDurationToMinutes("ساعة")).toBe(60);
    expect(parseDurationToMinutes("ساعتين")).toBe(120);
    expect(parseDurationToMinutes("نص ساعة")).toBe(30);
    expect(parseDurationToMinutes("نصف ساعة")).toBe(30);
    expect(parseDurationToMinutes("ثلاث ساعات")).toBe(180);
    expect(parseDurationToMinutes("ساعتين ونص")).toBe(150);
  });

  it("reads English words", () => {
    expect(parseDurationToMinutes("two hours")).toBe(120);
    expect(parseDurationToMinutes("half an hour")).toBe(30);
    expect(parseDurationToMinutes("one hour")).toBe(60);
  });

  it("honours an explicit minutes unit", () => {
    expect(parseDurationToMinutes("45 دقيقة")).toBe(45);
    expect(parseDurationToMinutes("90 min")).toBe(90);
  });

  it("mixes numbers with the hours word", () => {
    expect(parseDurationToMinutes("3 ساعات")).toBe(180);
    expect(parseDurationToMinutes("1.5 ساعة")).toBe(90);
  });

  it("falls back to a bookable default for junk or empty input", () => {
    expect(parseDurationToMinutes("")).toBe(DEFAULT_DURATION_MIN);
    expect(parseDurationToMinutes("   ")).toBe(DEFAULT_DURATION_MIN);
    expect(parseDurationToMinutes("حسب الطلب")).toBe(DEFAULT_DURATION_MIN);
  });

  it("never returns a slot shorter than 15 minutes", () => {
    expect(parseDurationToMinutes("1 دقيقة")).toBe(15);
    expect(parseDurationToMinutes("0.01")).toBe(15);
  });
});

describe("formatServiceDuration", () => {
  it("shows the provider's own wording when present", () => {
    expect(
      formatServiceDuration({ durationText: "ساعتين", durationMin: 120 }, "ساعة"),
    ).toBe("ساعتين");
  });

  it("falls back to hours derived from the stored minutes", () => {
    expect(formatServiceDuration({ durationMin: 90 }, "ساعة")).toBe("1.5 ساعة");
    expect(formatServiceDuration({ durationMin: 120 }, "hour")).toBe("2 hour");
  });

  it("handles a legacy service with no duration at all", () => {
    expect(formatServiceDuration({}, "ساعة")).toBe("1 ساعة");
  });
});
