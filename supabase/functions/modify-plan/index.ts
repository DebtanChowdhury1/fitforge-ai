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
    .eq('function_name', 'modify-plan')
    .eq('date', today);
  return (count ?? 0) < DAILY_LIMIT;
}

async function recordUsage(sb: ReturnType<typeof createClient>, userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await sb.from('api_usage').insert({ user_id: userId, function_name: 'modify-plan', date: today });
}

function sanitizeInstruction(raw: unknown): { valid: boolean; instruction?: string; error?: string } {
  if (typeof raw !== 'string') return { valid: false, error: 'instruction must be a string' };
  const trimmed = raw.trim().slice(0, 500);
  if (!trimmed) return { valid: false, error: 'instruction is empty' };
  // Strip characters that enable prompt injection
  const sanitized = trimmed.replace(/[<>{}]/g, '').trim();
  return { valid: true, instruction: sanitized };
}

async function callGroq(messages: any[]): Promise<any> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('GROQ_API_KEY secret is not configured');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new Error(`Groq error: ${response.status}`);
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
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
    },
  );
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Gemini response');
  return JSON.parse(jsonMatch[0]);
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
      JSON.stringify({ error: 'Daily modification limit reached.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const { current_plan, instruction: rawInstruction } = await req.json();

    const { valid, instruction, error: instrError } = sanitizeInstruction(rawInstruction);
    if (!valid || !instruction) {
      return new Response(
        JSON.stringify({ error: instrError ?? 'Invalid instruction' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!current_plan || typeof current_plan !== 'object') {
      return new Response(
        JSON.stringify({ error: 'current_plan is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const systemPrompt = `You are an expert personal trainer modifying an existing workout plan.
The user has given an instruction to change their plan. Apply the change and return the COMPLETE updated plan as valid JSON only — same schema as the input, no markdown, no explanation.
Only modify what the instruction asks for. Do not remove exercises or days unless specifically requested.`;

    const userPrompt = `Current plan:
${JSON.stringify(current_plan, null, 2).slice(0, 6000)}

Instruction: ${instruction}

Return the complete modified plan as JSON only.`;

    let plan: any;
    try {
      plan = await callGroq([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
    } catch {
      plan = await callGemini(`${systemPrompt}\n\n${userPrompt}\n\nRespond with only valid JSON.`);
    }

    if (!plan?.schedule) throw new Error('Invalid plan structure');

    await recordUsage(supabase, user.id);

    return new Response(
      JSON.stringify({ plan }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
