// Client-side data normalization helpers used by the import wizard.
// All functions are pure: they return { value, changed } so callers can show
// a "wand" badge with the original value in a tooltip when changed === true.

export interface NormalizeResult {
  value: string;
  changed: boolean;
}

const DATE_FIELD_KEYS = new Set([
  "arrival_date",
  "departure_date",
  "service_date",
  "date",
]);
const PHONE_FIELD_KEYS = new Set(["phone", "telephone", "mobile"]);
const EMAIL_FIELD_KEYS = new Set(["email"]);
const NUMBER_FIELD_KEYS = new Set([
  "budget",
  "commission_pct",
  "reliability",
  "group_size",
  "final_price",
  "quoted_price",
]);

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Convert various date formats to ISO YYYY-MM-DD. */
export function normalizeDate(input: string): NormalizeResult {
  const original = input ?? "";
  const v = original.trim();
  if (!v) return { value: "", changed: false };

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { value: v, changed: false };

  // Excel serial date (numeric only, between 1 and 60000)
  if (/^\d+(\.\d+)?$/.test(v)) {
    const n = parseFloat(v);
    if (n > 1 && n < 60000) {
      // Excel epoch: 1899-12-30 (accounts for the 1900 leap-year bug)
      const ms = (n - 25569) * 86400 * 1000;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        const iso = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
        return { value: iso, changed: iso !== original };
      }
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (European default)
  const m1 = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m1) {
    let [, d, mo, y] = m1;
    let day = parseInt(d, 10);
    let month = parseInt(mo, 10);
    let year = parseInt(y, 10);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    // Heuristic: if first part > 12, it's definitely day; if month > 12, swap (US format)
    if (month > 12 && day <= 12) [day, month] = [month, day];
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const iso = `${year}-${pad(month)}-${pad(day)}`;
      return { value: iso, changed: true };
    }
  }

  // YYYY/MM/DD
  const m2 = v.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (m2) {
    const [, y, mo, d] = m2;
    const iso = `${y}-${pad(parseInt(mo, 10))}-${pad(parseInt(d, 10))}`;
    return { value: iso, changed: iso !== original };
  }

  // Try Date.parse fallback
  const parsed = new Date(v);
  if (!isNaN(parsed.getTime())) {
    const iso = `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
    return { value: iso, changed: iso !== original };
  }

  return { value: original, changed: false };
}

/** Normalize phone numbers: keep + and digits, add default prefix when missing. */
export function normalizePhone(input: string, defaultCountry: "IT" | "ES" | "UK" | "US" = "IT"): NormalizeResult {
  const original = input ?? "";
  const v = original.trim();
  if (!v) return { value: "", changed: false };

  // Strip everything except digits and leading +
  let cleaned = v.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);

  if (!cleaned.startsWith("+")) {
    const prefixes: Record<string, string> = { IT: "+39", ES: "+34", UK: "+44", US: "+1" };
    // If starts with 0 and country is IT, drop the leading 0 only for some countries
    if (defaultCountry === "ES" && cleaned.startsWith("0")) cleaned = cleaned.slice(1);
    cleaned = prefixes[defaultCountry] + cleaned;
  }

  return { value: cleaned, changed: cleaned !== original };
}

/** Trim + lowercase email; return original if invalid. */
export function normalizeEmail(input: string): NormalizeResult {
  const original = input ?? "";
  const v = original.trim().toLowerCase();
  if (!v) return { value: "", changed: false };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { value: original, changed: false };
  return { value: v, changed: v !== original };
}

/** Normalize numeric strings: handle EU comma decimals and thousands separators. */
export function normalizeNumber(input: string): NormalizeResult {
  const original = input ?? "";
  const v = original.trim();
  if (!v) return { value: "", changed: false };
  // If contains both . and , the last one is the decimal separator
  let cleaned = v.replace(/[\s€$£¥]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    cleaned = cleaned.replace(",", ".");
  }
  const n = parseFloat(cleaned);
  if (isNaN(n)) return { value: original, changed: false };
  return { value: String(n), changed: String(n) !== original };
}

/** Split "Mario Rossi" into first/last when first_name received a multi-word value. */
export function splitFullName(value: string): { first_name: string; last_name: string } | null {
  const v = (value ?? "").trim().replace(/\s+/g, " ");
  if (!v.includes(" ")) return null;
  const parts = v.split(" ");
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

/** Apply normalization to a row in-place based on the field key. */
export function normalizeRow(
  row: Record<string, string>,
  defaultCountry: "IT" | "ES" | "UK" | "US" = "IT"
): { row: Record<string, string>; changes: Record<string, string> } {
  const out: Record<string, string> = { ...row };
  const changes: Record<string, string> = {};

  // Auto-split full name into first/last if last_name is missing/empty
  if (out.first_name && (!out.last_name || !out.last_name.trim())) {
    const split = splitFullName(out.first_name);
    if (split) {
      changes.first_name = out.first_name;
      out.first_name = split.first_name;
      out.last_name = split.last_name;
    }
  }

  for (const key of Object.keys(out)) {
    const val = out[key];
    if (val === undefined || val === null || val === "") continue;

    let result: NormalizeResult | null = null;
    if (DATE_FIELD_KEYS.has(key)) result = normalizeDate(val);
    else if (PHONE_FIELD_KEYS.has(key)) result = normalizePhone(val, defaultCountry);
    else if (EMAIL_FIELD_KEYS.has(key)) result = normalizeEmail(val);
    else if (NUMBER_FIELD_KEYS.has(key)) result = normalizeNumber(val);

    if (result && result.changed) {
      changes[key] = val;
      out[key] = result.value;
    }
  }

  return { row: out, changes };
}