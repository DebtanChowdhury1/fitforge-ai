import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMIT = 20;

async function withinRateLimit(sb: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const { count } = await sb
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('function_name', 'assess-day')
    .eq('date', today);
  return (count ?? 0) < DAILY_LIMIT;
}

async function recordUsage(sb: ReturnType<typeof createClient>, userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await sb.from('api_usage').insert({ user_id: userId, function_name: 'assess-day', date: today });
}

function buildPrompt(input: any): string {
  const { planned_day, user_log, goal_type, goal_details, start_date, end_date, days_remaining, total_days } = input;
  const completion = user_log.completion_percentage;
  const daysElapsed = total_days - days_remaining;

  return `You are a strict but supportive fitness coach AI. Analyze today's workout completion and decide if the user's plan needs adjustment.

GOAL: ${goal_type.replace('_', ' ')} — ${goal_type === 'weight_loss'
    ? `lose ${(goal_details.current_weight ?? 0) - (goal_details.target_weight ?? 0)}${goal_details.units ?? 'kg'}`
    : goal_type === 'muscle_gain' ? `gain muscle mass`
    : goal_type === 'endurance' ? `improve endurance (${goal_details.event_type ?? 'general'})`
    : 'improve fitness'}
Plan: ${start_date} → ${end_date} (${total_days} total days, ${daysElapsed} elapsed, ${days_remaining} remaining)

TODAY'S PLANNED SESSION:
- Focus: ${planned_day.focus}
- Exercises: ${planned_day.exercises?.length ?? 0} exercises
- Cardio: ${planned_day.cardio ? `${planned_day.cardio.duration}min ${planned_day.cardio.type} (${planned_day.cardio.intensity})` : 'None'}

USER'S ACTUAL COMPLETION:
- Completion: ${completion}%
- Notes: ${user_log.notes || 'None'}
- Exercises completed: ${user_log.exercises_done?.length ?? 0}

Assess whether:
1. Was today a success? (>=80% = achieved, 50-79% = partial, <50% = missed)
2. With ${days_remaining} days left, can the original goal still be achieved by ${end_date}?
3. If completion < 80%, what adjustment is needed?

Logic:
- If achieved (>=80%): no plan change
- If partial/missed AND goal still achievable by increasing remaining day intensity: increase load (flag as "increased_load")
- If partial/missed AND increasing load would be unsafe or physically impossible: extend end date (flag as "extended_deadline"). New end date must be realistic (add 10-30% of remaining days)
- Safety check: NEVER recommend more than 2 sessions per day or >90min sessions for beginners
- Be concise in analysis (2-3 sentences max)

Return ONLY valid JSON:
{
  "achieved": true,
  "achievement_percentage": 85,
  "analysis": "Great session — you hit all your main lifts...",
  "adjustment_type": "none",
  "adjustment_message": null,
  "new_end_date": null,
  "is_harmful": false,
  "load_increase_note": null
}

adjustment_type options: "none" | "increased_load" | "extended_deadline"
If "extended_deadline": set new_end_date to a new ISO date string and explain in adjustment_message.
If "increased_load": set load_increase_note explaining how remaining sessions should be harder.
`;
}

async function callGroq(prompt: string): Promise<any> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('GROQ_API_KEY secret is not configured');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 512,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new Error(`Groq ${response.status}`);
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function callGemini(prompt: string): Promise<any> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY secret is not configured');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt + '\n\nRespond with ONLY valid JSON.' }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
      }),
    },
  );
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in Gemini response');
  return JSON.parse(match[0]);
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
      JSON.stringify({ error: 'Daily assessment limit reached.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const input = await req.json();
    let assessment: any;
    try {
      assessment = await callGroq(buildPrompt(input));
    } catch {
      assessment = await callGemini(buildPrompt(input));
    }

    await recordUsage(supabase, user.id);

    return new Response(JSON.stringify({ assessment }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
