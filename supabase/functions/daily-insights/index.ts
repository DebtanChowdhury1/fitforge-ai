import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMIT = 5;

async function withinRateLimit(sb: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const { count } = await sb
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('function_name', 'daily-insights')
    .eq('date', today);
  return (count ?? 0) < DAILY_LIMIT;
}

async function recordUsage(sb: ReturnType<typeof createClient>, userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await sb.from('api_usage').insert({ user_id: userId, function_name: 'daily-insights', date: today });
}

function buildPrompt(goalContext: string, dateStr: string): string {
  return `Today is ${dateStr}. Generate exactly 40 unique, science-backed health and fitness insights as a JSON object with key "insights" containing an array.

User context: ${goalContext || 'general fitness, mixed goals'}

Each insight must follow this exact shape:
{
  "id": "unique_string",
  "category": "Sleep" | "Nutrition" | "Recovery" | "Strength" | "Mindset" | "Cardio",
  "emoji": "single relevant emoji",
  "readMin": 1 | 2,
  "title": "concise compelling title",
  "body": "3-5 sentences. Specific, evidence-based. Real numbers and percentages where possible. No fluff."
}

Distribution: 7 Sleep, 7 Nutrition, 7 Recovery, 7 Strength, 6 Mindset, 6 Cardio = 40 total.

Requirements:
- Every insight must be different from yesterday — vary the topics, angles, and advice within each category.
- Tailor strength/cardio/nutrition advice toward the user's stated goal.
- body must be 3-5 full sentences. Specific. Practical. Scientific where possible.
- No motivational clichés. No vague platitudes.
- Use the date ${dateStr} as a seed to vary content — on different days, cover different sub-topics within each category.
- All content is general wellness guidance. Do not give specific medical, clinical, or therapeutic advice.

Respond with ONLY valid JSON, no extra text. Format: { "insights": [ ... ] }`;
}

async function callGroq(prompt: string): Promise<any[] | null> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('GROQ_API_KEY secret is not configured');
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
      }),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : (parsed.insights ?? null);
  } catch {
    return null;
  }
}

async function callGemini(prompt: string): Promise<any[] | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY secret is not configured');
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 8000 },
        }),
      },
    );
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : (parsed.insights ?? null);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const ok = await withinRateLimit(supabase, user.id);
  if (!ok) {
    return new Response(
      JSON.stringify({ error: 'Daily limit reached. Your cached insights are still available.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const goalContext = typeof body.goalContext === 'string' ? body.goalContext.slice(0, 500) : '';
    const today = new Date().toISOString().split('T')[0];
    const prompt = buildPrompt(goalContext, today);

    let insights = await callGroq(prompt);
    if (!insights || insights.length < 10) insights = await callGemini(prompt);

    if (!insights || insights.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Generation failed', insights: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const normalised = insights.map((item: any, i: number) => ({
      id:       item.id       ?? `insight_${i}`,
      category: item.category ?? 'Strength',
      emoji:    item.emoji    ?? '💪',
      readMin:  item.readMin  ?? 2,
      title:    item.title    ?? '',
      body:     item.body     ?? '',
    }));

    await recordUsage(supabase, user.id);

    return new Response(
      JSON.stringify({ insights: normalised, date: today }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
