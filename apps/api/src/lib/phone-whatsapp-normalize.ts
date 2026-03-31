/**
 * Normalize phone input to digits-only international form for WhatsApp (no + prefix).
 * If no country code is present, assumes South Africa (+27).
 * Examples: 0662236440 → 27662236440, 662236440 → 27662236440, +27 66 223 6440 → 27662236440.
 */
export function normalizePhoneDigitsForWhatsApp(input: string): string | null {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, "");
  if (!digits.length) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);

  // South African national: leading 0 + nine further digits (10 total)
  if (digits.startsWith("0") && digits.length === 10) {
    digits = `27${digits.slice(1)}`;
  } else if (digits.length === 9 && /^[6789]/.test(digits)) {
    // Typical ZA mobile without leading 0
    digits = `27${digits}`;
  }

  // E.164: max 15 digits including country code
  if (digits.length < 10 || digits.length > 15) return null;

  return digits;
}
