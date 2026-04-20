

# Piano: Import Avanzato (XLSX + AI Mapping + Normalizzazione)

Estendo il wizard `ImportDialog` con tre migliorie integrate nel flusso esistente a 4 step.

## 1. Supporto XLSX nativo

- Aggiungo libreria `xlsx` (SheetJS) al progetto
- Aggiorno `src/lib/csv-parser.ts` (rinominato concettualmente in "file-parser") con nuova funzione `parseFile(file: File)` che:
  - Rileva estensione (.csv, .txt, .xlsx, .xls)
  - Per Excel: legge con `XLSX.read()`, prende il primo foglio, converte in array di array
  - Per CSV: usa il parser esistente
- Aggiorno `ImportDialog.tsx` per accettare `.xlsx,.xls,.csv,.txt` nell'`<input type="file">`
- Se il file Excel ha più fogli, aggiungo uno step intermedio "Selezione foglio" (dropdown)

## 2. AI Mapping intelligente per colonne sconosciute

- Nuova edge function `supabase/functions/ai-column-mapper/index.ts`:
  - Riceve: headers non mappati, prime 3 righe di esempio, lista campi target con label
  - Usa Lovable AI (`google/gemini-3-flash-preview`) con tool calling per ritornare suggerimenti `{ header: string, suggested_key: string, confidence: number }[]`
  - Gestione errori 429/402 con messaggio chiaro
- In `ImportDialog`, dopo `autoMapColumns()`:
  - Se ci sono header non mappati, mostro pulsante "Suggerimenti AI" nello step Mapping
  - Al click chiamo l'edge function e pre-popolo i mapping con badge "AI" accanto
  - L'utente può sempre modificare manualmente

## 3. Normalizzazione automatica dati

- Nuovo file `src/lib/data-normalizer.ts` con funzioni pure:
  - `normalizeDate(value)`: converte formati (DD/MM/YYYY, MM-DD-YYYY, "15 gen 2026", Excel serial date) → ISO `YYYY-MM-DD`
  - `normalizePhone(value, defaultCountry='IT')`: aggiunge prefisso internazionale, rimuove spazi/trattini
  - `splitFullName(value)`: separa "Mario Rossi" → `{first_name, last_name}` se la colonna mappata è `first_name` ma il valore contiene spazi
  - `normalizeEmail(value)`: trim + lowercase + validazione base
  - `normalizeNumber(value)`: gestisce virgola/punto decimale (formato IT vs EN)
- In `ImportDialog`, nello step Preview:
  - Applico le normalizzazioni in base al tipo di campo (date → normalizeDate, phone → normalizePhone, ecc.)
  - Mostro un toggle "Normalizza dati automaticamente" (default: on)
  - Le righe normalizzate sono evidenziate con un'icona piccola "wand" e il valore originale è in tooltip

## 4. Aggiornamenti UI ed i18n

- Nuove chiavi i18n in `it.json`, `en.json`, `es.json`:
  - `import.ai_suggest`, `import.ai_suggesting`, `import.normalized`, `import.original_value`, `import.select_sheet`, `import.xlsx_supported`
- Aggiorno `ExcelImportExport.tsx`: il pulsante import ora apre direttamente `ImportDialog` (rimuovendo il parser CSV legacy inline)
- Aggiorno testo upload step: "CSV, XLSX, XLS supportati"

## File modificati/creati

**Nuovi:**
- `src/lib/data-normalizer.ts`
- `supabase/functions/ai-column-mapper/index.ts`

**Modificati:**
- `src/lib/csv-parser.ts` → estende con supporto XLSX
- `src/components/ImportDialog.tsx` → integra i 3 nuovi flow
- `src/components/ExcelImportExport.tsx` → usa ImportDialog
- `src/i18n/locales/{it,en,es}.json` → nuove chiavi
- `package.json` → aggiunge `xlsx`

## Note tecniche

- `xlsx` (SheetJS) community edition è MIT, ~400KB gzipped
- L'edge function AI viene chiamata solo se ci sono colonne non mappate (risparmio crediti)
- Le normalizzazioni sono client-side (zero costi AI)
- Il mapping manuale dell'utente ha sempre priorità su AI e autoMap

