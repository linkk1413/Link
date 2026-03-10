/**
 * Content filter utility for detecting objectionable content in user-generated text.
 * Covers common English and Arabic profanity / hate speech patterns.
 */

// English offensive words (partial list — extend as needed)
const EN_BLOCKLIST = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "pussy",
  "slut",
  "whore",
  "cunt",
  "nigger",
  "faggot",
  "retard",
  "porn",
  "nazi",
  "kill yourself",
  "kys",
];

// Arabic offensive words (partial list — extend as needed)
const AR_BLOCKLIST = [
  "كلب",
  "حمار",
  "غبي",
  "أحمق",
  "شرموط",
  "عاهر",
  "زنا",
  "لعن",
  "تبا",
  "خنزير",
  "منيوك",
  "قحبه",
  "قحبة",
  "عرص",
  "متخلف",
  "حيوان",
];

/**
 * Normalise text for comparison: lowercase, remove diacritics / tatweel,
 * collapse whitespace, strip common letter substitutions (leet-speak).
 */
function normalise(text: string): string {
  return (
    text
      .toLowerCase()
      // Strip Arabic diacritics (tashkeel) and tatweel
      .replace(
        /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0640]/g,
        "",
      )
      // Common leet-speak substitutions
      .replace(/0/g, "o")
      .replace(/1/g, "i")
      .replace(/3/g, "e")
      .replace(/4/g, "a")
      .replace(/5/g, "s")
      .replace(/@/g, "a")
      .replace(/\$/g, "s")
      // Collapse repeated characters (e.g., "fuuuck" -> "fuck")
      .replace(/(.)\1{2,}/g, "$1$1")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Check whether `text` contains objectionable content.
 * Returns `true` if the text is clean; `false` if objectionable.
 */
export function isContentClean(text: string): boolean {
  if (!text || !text.trim()) return true;

  const normalised = normalise(text);

  for (const word of EN_BLOCKLIST) {
    if (normalised.includes(word)) return false;
  }

  for (const word of AR_BLOCKLIST) {
    if (normalised.includes(word)) return false;
  }

  return true;
}

/**
 * Returns the first matching blocked word found, or `null` if clean.
 */
export function getBlockedWord(text: string): string | null {
  if (!text || !text.trim()) return null;

  const normalised = normalise(text);

  for (const word of EN_BLOCKLIST) {
    if (normalised.includes(word)) return word;
  }

  for (const word of AR_BLOCKLIST) {
    if (normalised.includes(word)) return word;
  }

  return null;
}
