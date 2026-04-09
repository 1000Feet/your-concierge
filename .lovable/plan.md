

# Piano di Integrazione - Funzionalità Mancanti ConciergeDesk

## Panoramica

I file descritti non sono ancora presenti nel progetto. Devo creare tutto da zero seguendo le specifiche fornite. Il lavoro si divide in 4 blocchi principali.

---

## Blocco 1: Database Migration

Creo `supabase/migrations/20260409210000_add_missing_features.sql` con:
- 5 nuove tabelle: `provider_availability`, `conversations`, `messages`, `message_templates`, `request_status_history`
- RLS su tutte con policy per `auth.uid()`
- Trigger: `validate_request_status_transition()`, `on_request_status_notification()`, `on_provider_response_notification()`, `on_new_message_notification()`
- Auto-calcolo margine su provider accettato
- Auto-update `last_message_at` su conversazione
- 6 template messaggi italiani di default
- `updated_at` trigger su tutte le nuove tabelle

---

## Blocco 2: Librerie e Componenti Utility

**Nuovi file lib:**
- `src/lib/request-state-machine.ts` — `canTransition()`, `getNextStatuses()`, `getStatusLabel()`, `getStatusColor()`, `getStatusIcon()`. Transizioni: draft→sent→waiting→confirmed→in_progress→completed, cancelled da qualsiasi stato
- `src/lib/csv-parser.ts` — Parser CSV robusto (campi quotati, escape, BOM, auto-detect delimitatore)
- `src/lib/column-mapper.ts` — Auto-mapping colonne multilingua con fuzzy matching Levenshtein

**Nuovi componenti:**
- `src/components/RequestStatusSelect.tsx` — Dropdown con solo transizioni valide dalla state machine, dialog conferma per cancellazione
- `src/components/ProviderAvailabilityCalendar.tsx` — Calendario mensile con CRUD su `provider_availability`
- `src/components/NewConversationDialog.tsx` — Dialog per creare conversazioni (tipo contatto, link richiesta, canale)
- `src/components/MessageTemplateSelector.tsx` — Dropdown template raggruppati per categoria
- `src/components/ImportDialog.tsx` — Wizard 4 step (Upload → Mapping → Preview → Import) con csv-parser e column-mapper
- `src/components/DailySummary.tsx` — Card briefing AI giornaliero per Dashboard

---

## Blocco 3: Nuove Pagine e Edge Functions

**Pagine:**
- `src/pages/Messages.tsx` — Inbox completa con pannello conversazioni + thread chat, AI genera, template
- `src/pages/ProviderDetail.tsx` — 3 tab (Disponibilita/Storico/Performance)

**Edge Functions:**
- `supabase/functions/ai-suggest/index.ts` — Upgrade v2: interroga DB reale per provider, controlla disponibilita, ritorna suggerimenti strutturati con `provider_id`, `score`, `reason`, `estimated_cost`
- `supabase/functions/ai-summary/index.ts` — Briefing giornaliero: arrivi, richieste attive, provider in attesa, revenue/margini settimanali

---

## Blocco 4: Modifiche ai File Esistenti

- **`src/App.tsx`**: Aggiunta route `/providers/:id` → ProviderDetail, `/messages` → Messages
- **`src/components/AppSidebar.tsx`**: Voce "Messaggi" con icona `MessageSquare`
- **`src/pages/Dashboard.tsx`**: Aggiunta `DailySummary` in cima
- **`src/pages/RequestDetail.tsx`**: Badge statico → `RequestStatusSelect` interattivo con mutation per cambio stato
- **`src/pages/Providers.tsx`**: Nome provider cliccabile (Link a `/providers/:id`) + pulsante import con `ImportDialog`
- **`src/pages/Clients.tsx`**: Pulsante import con `ImportDialog`
- **`src/components/ExcelImportExport.tsx`**: `ImportCSVButton` apre `ImportDialog`

---

## Dettagli Tecnici

- La migrazione verra eseguita con il migration tool dopo le 2 esistenti
- `ai-suggest` viene sostituito (non creato come v2 separato) per mantenere le chiamate esistenti funzionanti
- `ai-summary` e una nuova edge function da deployare
- I tipi TypeScript in `types.ts` si aggiorneranno automaticamente dopo la migrazione
- Realtime non necessario in questa fase (puo essere aggiunto dopo)

**Vincoli rispettati:**
- State machine restrittiva (solo transizioni valide)
- Template messaggi in italiano
- Parser CSV con gestione BOM e delimitatori misti
- RLS su tutte le nuove tabelle

