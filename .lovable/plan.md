

# Piano di Implementazione - Funzionalità Mancanti ConciergeDesk.com

## Analisi Gap: Documento Architettura vs Stato Attuale

**Implementato:**
- Auth (login/registrazione)
- CRUD Clienti, Fornitori, Richieste
- Dashboard con KPI base
- State machine richieste (draft → completed)
- RLS su tutte le tabelle

**Mancante dal documento di architettura:**

| Modulo | Stato |
|--------|-------|
| Gestione Preferenze Cliente | Non implementato |
| Disponibilità/Calendario Fornitori | Non implementato |
| Assegnazione Fornitori a Richieste | Non implementato (tabella `request_providers` esiste ma nessuna UI) |
| Messaging Module | Non implementato |
| AI Module (4 task) | Non implementato |
| Excel Import/Export | Non implementato |
| Analytics/Grafici | Non implementato |
| Notifiche In-App | Non implementato |
| Profilo Utente/Settings | Non implementato |

---

## Piano di Implementazione (6 step)

### Step 1: Gestione Request-Provider (Assegnazione Fornitori)
La funzionalità core mancante. Nella pagina di dettaglio richiesta:
- Vista dettaglio richiesta (pagina dedicata `/requests/:id`)
- Lista fornitori assegnabili (filtrati per categoria = service_type)
- Aggiunta/rimozione fornitori con stato (pending → contacted → accepted → declined)
- Campo prezzo quotato e note per ogni provider assegnato
- Calcolo automatico margine (final_price - quoted_price)

### Step 2: Preferenze Cliente e Dettaglio
- Pagina dettaglio cliente (`/clients/:id`)
- Editor preferenze strutturato (dieta, budget, lingua, servizi preferiti) salvato nel campo JSONB `preferences`
- Storico richieste del cliente
- Timeline arrivi/partenze

### Step 3: Analytics Dashboard con Grafici
- Grafici con Recharts (già disponibile nel progetto via `chart.tsx`)
- Richieste per mese (bar chart)
- Margine totale per mese (line chart)
- Distribuzione per tipo di servizio (pie chart)
- Performance fornitori (affidabilità media, tasso accettazione)
- Pagina dedicata `/analytics`

### Step 4: AI Module (via Lovable AI Gateway)
Edge function che usa i modelli Lovable AI (nessuna API key richiesta):
- **Extract**: da testo libero estrae richiesta strutturata (tipo servizio, data, gruppo, budget)
- **Suggest Providers**: dato una richiesta, suggerisce i 3 migliori fornitori per categoria, affidabilità e commissione
- **Generate Message**: genera messaggio professionale per fornitore o cliente
- **Daily Summary**: riepilogo giornaliero (arrivi, richieste aperte, conferme pendenti)

UI: bottoni "AI Suggest" nella pagina dettaglio richiesta, "AI Extract" nel form nuova richiesta

### Step 5: Excel Import/Export
Edge function + UI per:
- **Export**: clienti, fornitori, richieste come file XLSX scaricabile
- **Import**: upload XLSX con validazione e preview prima dell'inserimento
- Bottoni export in ogni pagina lista, bottone import nel dialog

### Step 6: Profilo Utente e Notifiche
- Pagina `/settings` con modifica profilo (nome, cognome, avatar)
- Sistema notifiche in-app (nuova tabella `notifications`)
- Icona campanella nell'header con badge contatore
- Notifiche per: richiesta confermata, fornitore accettato/rifiutato, arrivo cliente imminente

---

## Dettagli Tecnici

**Database migrations necessarie:**
- Tabella `notifications` (id, user_id, type, title, message, read, created_at)
- Nessuna modifica alle tabelle esistenti (request_providers è già pronta)

**Nuovi file:**
- `src/pages/RequestDetail.tsx` - dettaglio richiesta con gestione fornitori
- `src/pages/ClientDetail.tsx` - dettaglio cliente con preferenze
- `src/pages/Analytics.tsx` - dashboard grafici
- `src/pages/Settings.tsx` - profilo utente
- `src/components/NotificationBell.tsx` - campanella notifiche
- `src/components/AIAssistant.tsx` - componenti UI per funzioni AI
- `src/components/ExcelImportExport.tsx` - import/export
- `supabase/functions/ai-extract/index.ts`
- `supabase/functions/ai-suggest/index.ts`
- `supabase/functions/ai-generate/index.ts`
- `supabase/functions/ai-summary/index.ts`
- `supabase/functions/export-excel/index.ts`

**Rotte aggiunte in App.tsx:**
- `/requests/:id`, `/clients/:id`, `/analytics`, `/settings`

**Nota**: WhatsApp Business API e Calendar Sync sono esclusi da questo piano perche richiedono configurazione di account esterni. Possono essere aggiunti in una fase successiva.

