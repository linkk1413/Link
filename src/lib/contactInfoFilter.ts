/**
 * Detects contact-info sharing attempts (phone numbers, WhatsApp, social
 * media handles/links) in chat text. Used to *flag* messages for admin
 * review — it never blocks sending, per product decision.
 */

const PATTERNS: RegExp[] = [
  // Saudi mobile numbers: 05xxxxxxxx, 5xxxxxxxx, +9665xxxxxxxx, 9665xxxxxxxx
  /(?:\+?966|0)?5\d{8}\b/,
  // Any run of 7+ digits, optionally separated by spaces/dashes/dots
  // (catches spaced-out numbers like "05 555 5555" or "0555-5555").
  /(?:\d[\s.-]?){7,}\d/,
  // WhatsApp
  /wa\.me\//i,
  /whats\s*app/i,
  // Social platforms / handles
  /instagram\.com/i,
  /snapchat\.com/i,
  /(?:^|[\s(])@[a-zA-Z][\w.]{2,29}\b/,
  /t\.me\//i,
  /telegram/i,
  /twitter\.com/i,
  /(?:^|[\s(])x\.com\//i,
  /tiktok\.com/i,
];

/**
 * Returns the first matching snippet if `text` looks like it contains
 * contact info, otherwise null.
 */
export function detectContactInfo(text: string): string | null {
  if (!text || !text.trim()) return null;

  for (const pattern of PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }

  return null;
}
