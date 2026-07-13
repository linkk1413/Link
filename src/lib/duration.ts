// Service duration is entered by the provider as free text ("ساعتين", "1.5",
// "half an hour"). We keep the numeric `durationMin` because booking needs it to
// compute `endAt`, so the text is parsed down to minutes on save and the raw text
// is kept for display.

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

const normalizeDigits = (value: string): string =>
  value.replace(ARABIC_DIGITS, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });

// Written numbers, Arabic and English. Order matters: longer forms first so
// "ساعتين ونص" doesn't match on "ساعة".
const WORD_NUMBERS: Array<[RegExp, number]> = [
  [/نص(ف)?\s*ساعة|half\s*an?\s*hour|half\s*hour/i, 0.5],
  [/ساعتين|ساعتان|two\s*hours?/i, 2],
  [/ثلاث(ة)?\s*ساعات|three\s*hours?/i, 3],
  [/أربع(ة)?\s*ساعات|four\s*hours?/i, 4],
  [/خمس(ة)?\s*ساعات|five\s*hours?/i, 5],
  [/ست(ة)?\s*ساعات|six\s*hours?/i, 6],
  [/سبع(ة)?\s*ساعات|seven\s*hours?/i, 7],
  [/ثماني(ة)?\s*ساعات|eight\s*hours?/i, 8],
  [/تسع(ة)?\s*ساعات|nine\s*hours?/i, 9],
  [/عشر(ة)?\s*ساعات|ten\s*hours?/i, 10],
  [/ساعة|ساعه|one\s*hour|hour/i, 1],
];

const MINUTES_UNIT = /دقيق|دقائق|min/i;
const HALF_SUFFIX = /(و\s*نص(ف)?|and\s*a\s*half)/i;

export const DEFAULT_DURATION_MIN = 60;

/**
 * Best-effort conversion of the provider's free-text duration into minutes.
 * A bare number means hours ("1.5" → 90 min) unless the text says minutes.
 * Returns DEFAULT_DURATION_MIN when nothing usable is found, so a booking can
 * still be scheduled.
 */
export const parseDurationToMinutes = (input: string): number => {
  if (!input?.trim()) return DEFAULT_DURATION_MIN;

  const text = normalizeDigits(input).trim();
  const numberMatch = text.match(/\d+([.,]\d+)?/);

  if (numberMatch) {
    const amount = parseFloat(numberMatch[0].replace(",", "."));
    if (Number.isFinite(amount) && amount > 0) {
      const minutes = MINUTES_UNIT.test(text)
        ? amount
        : (amount + (HALF_SUFFIX.test(text) ? 0.5 : 0)) * 60;
      return Math.max(15, Math.round(minutes));
    }
  }

  for (const [pattern, hours] of WORD_NUMBERS) {
    if (pattern.test(text)) {
      const total = hours + (HALF_SUFFIX.test(text) ? 0.5 : 0);
      return Math.max(15, Math.round(total * 60));
    }
  }

  return DEFAULT_DURATION_MIN;
};

/** Minutes → a readable hours label, e.g. 90 → "1.5" */
export const minutesToHoursLabel = (minutes: number): string => {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
};

/**
 * What the client sees. Prefers the provider's own wording; falls back to the
 * stored minutes rendered in hours.
 */
export const formatServiceDuration = (
  service: { durationText?: string; durationMin?: number },
  hourUnit: string,
): string => {
  if (service.durationText?.trim()) return service.durationText.trim();
  const minutes = service.durationMin || DEFAULT_DURATION_MIN;
  return `${minutesToHoursLabel(minutes)} ${hourUnit}`;
};
