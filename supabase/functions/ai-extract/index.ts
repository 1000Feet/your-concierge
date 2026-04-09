import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: `Sei un assistente concierge. Analizza il testo e estrai informazioni strutturate per una richiesta di servizio.`,
          },
          { role: "user", content: `Estrai da questo testo: "${text}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_request",
              description: "Estrai i dati strutturati dalla richiesta",
              parameters: {
                type: "object",
                properties: {
                  service_type: { type: "string", enum: ["tour", "chef", "transfer", "yacht", "surf", "babysitter", "restaurant", "wellness", "other"] },
                  description: { type: "string" },
                  group_size: { type: "number" },
                  budget: { type: "number" },
                  service_date: { type: "string", description: "YYYY-MM-DD format if found" },
                },
                required: ["service_type", "description"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_request" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit superato" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Crediti AI esauriti" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let extracted = {};
    if (toolCall?.function?.arguments) {
      try {
        extracted = JSON.parse(toolCall.function.arguments);
      } catch {}
    }

    return new Response(JSON.stringify({ extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-extract error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
