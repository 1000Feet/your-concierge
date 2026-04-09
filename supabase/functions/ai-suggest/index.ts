import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { service_type, description, budget, group_size, service_date } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch real providers
    const { data: providers } = await supabase
      .from("providers")
      .select("id, name, category, reliability, commission_pct, email, phone, notes")
      .eq("category", service_type)
      .eq("is_active", true)
      .order("reliability", { ascending: false });

    // Check availability if date provided
    let availabilityMap: Record<string, any> = {};
    if (service_date && providers?.length) {
      const { data: avail } = await supabase
        .from("provider_availability")
        .select("provider_id, max_capacity, current_bookings, start_time, end_time")
        .eq("date", service_date)
        .in("provider_id", providers.map((p) => p.id));
      
      for (const a of avail ?? []) {
        availabilityMap[a.provider_id] = a;
      }
    }

    const providerInfo = (providers ?? []).map((p) => {
      const avail = availabilityMap[p.id];
      return {
        id: p.id,
        name: p.name,
        reliability: p.reliability,
        commission_pct: p.commission_pct,
        available: avail ? avail.current_bookings < avail.max_capacity : null,
        capacity: avail ? `${avail.current_bookings}/${avail.max_capacity}` : "N/A",
      };
    });

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
            content: `Sei un assistente concierge. Analizza i fornitori disponibili e suggerisci i migliori.
Rispondi SOLO con un JSON array. Ogni elemento ha: provider_id (string), score (1-10), reason (string in italiano), estimated_cost (number o null).
Ordina per score decrescente. Massimo 3 risultati.`,
          },
          {
            role: "user",
            content: `Richiesta: ${description}
Tipo servizio: ${service_type}
Budget: ${budget ? `€${budget}` : "Non specificato"}
Gruppo: ${group_size ?? 1} persone
Data: ${service_date ?? "Non specificata"}

Fornitori disponibili:
${JSON.stringify(providerInfo, null, 2)}

Suggerisci i migliori fornitori per questa richiesta.`,
          },
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
    const raw = data.choices?.[0]?.message?.content ?? "[]";
    
    // Extract JSON from possible markdown code blocks
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    let suggestions = [];
    try {
      suggestions = JSON.parse(jsonMatch?.[0] ?? "[]");
    } catch {
      suggestions = [];
    }

    // Also return text suggestion for backward compat
    const suggestion = suggestions.length > 0
      ? suggestions.map((s: any) => `${s.score}/10 - ${providerInfo.find((p) => p.id === s.provider_id)?.name ?? "?"}: ${s.reason}${s.estimated_cost ? ` (~€${s.estimated_cost})` : ""}`).join("\n")
      : data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ suggestion, suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-suggest error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
