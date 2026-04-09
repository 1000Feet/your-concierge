import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, request_description, service_type, service_date, group_size, target_name, client_name } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = type === "provider"
      ? `Sei un concierge di lusso. Genera un messaggio professionale in italiano per contattare un fornitore di servizi.
Il messaggio deve essere cortese, chiaro e includere i dettagli della richiesta. Usa un tono formale ma amichevole.`
      : `Sei un concierge di lusso. Genera un messaggio professionale in italiano per aggiornare un cliente sul suo servizio.
Il messaggio deve essere elegante, rassicurante e professionale. Usa un tono raffinato.`;

    const userPrompt = type === "provider"
      ? `Genera un messaggio per il fornitore "${target_name}" riguardo:
- Servizio: ${service_type}
- Descrizione: ${request_description}
- Data: ${service_date ?? "Da definire"}
- Gruppo: ${group_size ?? 1} persone
- Cliente: ${client_name ?? "Non specificato"}`
      : `Genera un messaggio per il cliente "${target_name}" riguardo:
- Servizio: ${service_type}
- Descrizione: ${request_description}
- Data: ${service_date ?? "Da definire"}
- Gruppo: ${group_size ?? 1} persone`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit superato" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Crediti AI esauriti" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-generate error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
