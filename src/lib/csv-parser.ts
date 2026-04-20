export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  // Remove BOM
  const cleaned = text.replace(/^\uFEFF/, "");

  // Detect delimiter
  const firstLine = cleaned.split("\n")[0] ?? "";
  const delimiter = detectDelimiter(firstLine);

  const lines = parseLines(cleaned, delimiter);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].map((h) => h.trim());
  const rows = lines.slice(1).filter((r) => r.some((c) => c.trim()));

  return { headers, rows };
}

export interface ParsedFile {
  headers: string[];
  rows: string[][];
  sheetNames?: string[];
  workbook?: any;
}

export async function parseFile(file: File, sheetName?: string): Promise<ParsedFile> {
  const name = file.name.toLowerCase();
  const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".xlsm");

  if (isExcel) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: false });
    const targetSheet = sheetName && wb.SheetNames.includes(sheetName) ? sheetName : wb.SheetNames[0];
    const ws = wb.Sheets[targetSheet];
    const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "", raw: true, blankrows: false });
    if (aoa.length === 0) return { headers: [], rows: [], sheetNames: wb.SheetNames, workbook: wb };
    const headers = (aoa[0] as any[]).map((h) => String(h ?? "").trim());
    const rows = (aoa.slice(1) as any[][])
      .map((r) => headers.map((_, i) => (r[i] === undefined || r[i] === null ? "" : String(r[i]))))
      .filter((r) => r.some((c) => c.trim()));
    return { headers, rows, sheetNames: wb.SheetNames, workbook: wb };
  }

  const text = await file.text();
  const { headers, rows } = parseCSV(text);
  return { headers, rows };
}

export async function parseFileFromWorkbook(workbook: any, sheetName: string): Promise<ParsedFile> {
  const XLSX = await import("xlsx");
  const ws = workbook.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "", raw: true, blankrows: false });
  if (aoa.length === 0) return { headers: [], rows: [], sheetNames: workbook.SheetNames, workbook };
  const headers = (aoa[0] as any[]).map((h) => String(h ?? "").trim());
  const rows = (aoa.slice(1) as any[][])
    .map((r) => headers.map((_, i) => (r[i] === undefined || r[i] === null ? "" : String(r[i]))))
    .filter((r) => r.some((c) => c.trim()));
  return { headers, rows, sheetNames: workbook.SheetNames, workbook };
}

function detectDelimiter(line: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (!inQuote && ch in counts) counts[ch]++;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : ",";
}

function parseLines(text: string, delimiter: string): string[][] {
  const results: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        current.push(field);
        field = "";
        i++;
      } else if (ch === "\r" || ch === "\n") {
        current.push(field);
        field = "";
        results.push(current);
        current = [];
        if (ch === "\r" && i + 1 < text.length && text[i + 1] === "\n") i++;
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  if (field || current.length > 0) {
    current.push(field);
    results.push(current);
  }

  return results;
}
