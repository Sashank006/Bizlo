import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { businessData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { name, type, sellsFood, sellsAlcohol, budget, employees, hasLocation, address, area, targetCustomers, avgTicket, dailyCustomers, operatingHours, sqft, rentBudget, launchDate } = businessData;

    const systemPrompt = `You are Bizlo AI, a Chicago business advisor specializing in helping first-time entrepreneurs open businesses in Chicago's Loop area. Provide practical, actionable advice in a professional but encouraging tone. Keep your response to 3-4 paragraphs.`;

    const userPrompt = `Analyze this business plan for a new ${type} called "${name}" in Chicago's Loop:

Business Details:
- Type: ${type}
- Sells food: ${sellsFood ? "Yes" : "No"}
- Sells alcohol: ${sellsAlcohol ? "Yes" : "No"}
- Startup budget: $${budget?.toLocaleString() || "Not specified"}
- Number of employees: ${employees || "Not specified"}
- Target opening date: ${launchDate || "Not specified"}
- Location: ${hasLocation ? address : `Preferred area: ${area}`}
- Square footage: ${sqft || "Not specified"} sq ft
- Monthly rent budget: $${rentBudget?.toLocaleString() || "Not specified"}
- Target customers: ${targetCustomers?.join(", ") || "Not specified"}
- Average ticket size: $${avgTicket || "Not specified"}
- Expected daily customers: ${dailyCustomers || "Not specified"}
- Operating hours: ${operatingHours || "Not specified"}

Please provide:
1. A summary of what permits they'll need and the estimated total cost
2. An assessment of how competitive their chosen location is for this type of business
3. Top 3 recommended next steps they should take immediately
4. Any potential risks or concerns they should be aware of`;

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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "Unable to generate summary.";

    return new Response(JSON.stringify({ summary: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
