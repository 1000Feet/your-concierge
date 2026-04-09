import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    // Fetch data in parallel
    const [arrivalsRes, activeReqRes, pendingProvidersRes, weeklyReqRes] = await Promise.all([
      supabase.from("clients").select("first_name, last_name, hotel").eq("arrival_date", today),
      supabase.from("requests").select("id, description, status, service_type, service_date").in("status", ["draft", "sent", "waiting", "confirmed"]),
      supabase.from("request_providers").select("id, status, providers(name)").eq("status", "pending"),
      supabase.from("requests").select("final_price, margin, status").gte("created_at", weekAgo).in("status", ["completed", "confirmed"]),
    ]);

    const arrivals = arrivalsRes.data ?? [];
    const activeRequests = activeReqRes.data ?? [];
    const pendingProviders = pendingProvidersRes.data ?? [];
    const weeklyRequests = weeklyReqRes.data ?? [];

    const weeklyRevenue = weeklyRequests.reduce((s, r) => s + (Number(r.final_price) || 0), 0);
    const weeklyMargin = weeklyRequests.reduce((s, r) => s + (Number(r.margin) || 0), 0);

    const contextText = `
Dati di oggi (${today}):
- Arrivi: ${arrivals.length} clienti (${arrivals.map(a => `${a.first_name} ${a.last_name} @ ${a.hotel ?? '?'}`).join(', ') || 'nessuno'})
- Richieste attive: ${activeRequests.length} (${activeRequests.map(r => `${r.description?.slice(0, 30)} [${r.status}]`).join('; ') || 'nessuna'})
- Provider in attesa di risposta: ${pendingProviders.length}
- Revenue settimanale: €${weeklyRevenue.toFixed(0)}, Margine: €${weeklyMargin.toFixed(0)}
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Sei un assistente concierge di lusso. Genera un briefing giornaliero conciso e professionale in italiano.
Il briefing deve includere: situazione del giorno, azioni prioritarie, eventuali alert.
Rispondi in JSON con questa struttura:
{
  "summary": "testo del briefing",
  "metrics": { "arrivals": N, "active_requests": N, "weekly_revenue": N, "weekly_margin": N },
  "alerts": ["alert1", "alert2"]
}`,
          },
          { role: "user", content: contextText },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Crediti esauriti" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let result;
    try {
      result = JSON.parse(jsonMatch?.[0] ?? "{}");
    } catch {
      result = { summary: raw, metrics: { arrivals: arrivals.length, active_requests: activeRequests.length, weekly_revenue: weeklyRevenue, weekly_margin: weeklyMargin }, alerts: [] };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-summary error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
