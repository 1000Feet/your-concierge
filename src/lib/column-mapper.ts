export interface ColumnDef {
  key: string;
  label: string;
  aliases?: string[];
}

const DEFAULT_ALIASES: Record<string, string[]> = {
  first_name: ["nome", "name", "nombre", "first name", "firstname", "prenom", "primer nombre"],
  last_name: ["cognome", "surname", "lastname", "last name", "apellido", "nom", "family name"],
  email: ["e-mail", "mail", "correo", "email address", "correo electrónico", "dirección de correo"],
  phone: ["telefono", "telephone", "tel", "cellulare", "mobile", "telefon", "teléfono", "número de teléfono", "phone number", "mobile number"],
  hotel: ["albergo", "struttura", "accommodation", "alojamiento", "lodging", "property"],
  arrival_date: ["arrivo", "arrival", "check-in", "checkin", "data arrivo", "fecha de llegada", "arrival date", "fecha llegada"],
  departure_date: ["partenza", "departure", "check-out", "checkout", "data partenza", "fecha de salida", "departure date", "fecha salida"],
  notes: ["note", "commenti", "comments", "observaciones", "notas", "remarks", "comentarios"],
  name: ["nome", "ragione sociale", "company", "empresa", "company name", "nombre empresa", "business name"],
  category: ["categoria", "tipo", "type", "categoría", "category type", "tipo de servicio"],
  reliability: ["affidabilità", "affidabilita", "rating", "punteggio", "fiabilidad", "reliability score", "puntuación"],
  commission_pct: ["commissione", "commission", "comisión", "percentuale", "commission rate", "tasa de comisión", "porcentaje"],
  description: ["descrizione", "description", "descripción", "detail", "detalle", "details"],
  budget: ["budget", "preventivo", "presupuesto", "estimated cost", "costo estimado"],
  service_type: ["tipo servizio", "service type", "servizio", "tipo de servicio", "service category"],
  service_date: ["data servizio", "service date", "data", "fecha del servicio", "fecha servicio", "event date"],
  group_size: ["gruppo", "group size", "persone", "pax", "tamaño del grupo", "number of people", "personas", "guests", "attendees"],
};

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

export function autoMapColumns(
  fileHeaders: string[],
  columns: ColumnDef[]
): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const header of fileHeaders) {
    const norm = normalize(header);

    // Exact match on key or label
    const exact = columns.find(
      (c) => normalize(c.key) === norm || normalize(c.label) === norm
    );
    if (exact) { mapping[header] = exact.key; continue; }

    // Alias match
    const aliased = columns.find((c) => {
      const allAliases = [...(c.aliases ?? []), ...(DEFAULT_ALIASES[c.key] ?? [])];
      return allAliases.some((a) => normalize(a) === norm);
    });
    if (aliased) { mapping[header] = aliased.key; continue; }

    // Fuzzy match
    let bestKey = "";
    let bestDist = Infinity;
    for (const c of columns) {
      const candidates = [c.key, c.label, ...(c.aliases ?? []), ...(DEFAULT_ALIASES[c.key] ?? [])];
      for (const cand of candidates) {
        const d = levenshtein(norm, normalize(cand));
        if (d < bestDist) { bestDist = d; bestKey = c.key; }
      }
    }
    const threshold = Math.max(2, Math.floor(norm.length * 0.3));
    if (bestDist <= threshold) mapping[header] = bestKey;
  }

  return mapping;
}
