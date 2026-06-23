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
    .eq('function_name', 'generate-plan')
    .eq('date', today);
  return (count ?? 0) < DAILY_LIMIT;
}

async function recordUsage(sb: ReturnType<typeof createClient>, userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await sb.from('api_usage').insert({ user_id: userId, function_name: 'generate-plan', date: today });
}

const VALID_GOALS = ['muscle_gain', 'fat_loss', 'endurance', 'general_fitness'];
const VALID_EQUIPMENT = ['none', 'home_dumbbells', 'full_gym'];
const VALID_LEVELS = ['beginner', 'intermediate', 'advanced'];

function sanitizeProfile(raw: any): { valid: boolean; profile?: any; error?: string } {
  if (!raw || typeof raw !== 'object') return { valid: false, error: 'Invalid profile data' };
  const goal = String(raw.goal ?? '').slice(0, 50);
  const equipment = String(raw.equipment ?? '').slice(0, 50);
  const fitness_level = String(raw.fitness_level ?? '').slice(0, 50);
  const days_per_week = Number(raw.days_per_week);
  const session_duration = Number(raw.session_duration);
  const limitations = String(raw.limitations ?? '').replace(/[<>"']/g, '').slice(0, 500);

  if (!VALID_GOALS.includes(goal)) return { valid: false, error: `Invalid goal` };
  if (!VALID_EQUIPMENT.includes(equipment)) return { valid: false, error: `Invalid equipment` };
  if (!VALID_LEVELS.includes(fitness_level)) return { valid: false, error: `Invalid fitness level` };
  if (!Number.isInteger(days_per_week) || days_per_week < 1 || days_per_week > 7) return { valid: false, error: 'days_per_week must be 1–7' };
  if (!Number.isInteger(session_duration) || session_duration < 15 || session_duration > 180) return { valid: false, error: 'session_duration must be 15–180 minutes' };

  return { valid: true, profile: { goal, equipment, fitness_level, days_per_week, session_duration, limitations } };
}

const PLAN_SCHEMA = `{
  "weeks": 4,
  "schedule": [
    {
      "day": "Monday",
      "focus": "Push (Chest, Shoulders, Triceps)",
      "exercises": [
        {
          "name": "Bench Press",
          "sets": 4,
          "reps": "8-10",
          "rest_seconds": 90,
          "muscle_group": "Chest",
          "notes": "Control the eccentric"
        }
      ]
    }
  ],
  "notes": "Optional plan-level notes"
}`;

function buildPrompt(profile: any): string {
  const goalMap: Record<string, string> = {
    muscle_gain:     'building muscle mass and strength',
    fat_loss:        'burning fat while preserving muscle',
    endurance:       'improving cardiovascular endurance and stamina',
    general_fitness: 'improving overall health and fitness',
  };
  const equipMap: Record<string, string> = {
    none:           'no equipment (bodyweight only)',
    home_dumbbells: 'home dumbbells, resistance bands, and possibly a bench',
    full_gym:       'full gym access including barbells, cables, and machines',
  };

  return `You are an expert personal trainer. Generate a personalized ${profile.days_per_week}-day per week workout plan for a ${profile.fitness_level} level person focused on ${goalMap[profile.goal]}.

Equipment available: ${equipMap[profile.equipment]}
Session duration: ${profile.session_duration} minutes per session
${profile.limitations ? `Injuries/limitations: ${profile.limitations}` : 'No injuries or limitations.'}

Requirements:
- Provide exactly ${profile.days_per_week} workout days (the rest are implied rest days)
- Each session must fit within ${profile.session_duration} minutes
- Use only the available equipment
- Avoid any exercises that could aggravate the listed injuries/limitations
- Progress logically through the week (e.g. push/pull/legs or upper/lower split)
- Include sets, reps as a range (e.g. "8-12"), rest_seconds, and brief notes where helpful
- For beginners: simpler movements, more rest, fewer exercises per session
- For advanced: compound-heavy, progressive overload focus

Return ONLY valid JSON matching this exact schema — no markdown, no preamble, no explanation:
${PLAN_SCHEMA}`;
}

async function callGroq(prompt: string): Promise<any> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('GROQ_API_KEY secret is not configured');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
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
        contents: [{ parts: [{ text: prompt + '\n\nRespond with only valid JSON.' }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
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
      JSON.stringify({ error: 'Daily plan generation limit reached. Try again tomorrow.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const rawBody = await req.json();
    const { valid, profile, error: validationError } = sanitizeProfile(rawBody);
    if (!valid || !profile) {
      return new Response(
        JSON.stringify({ error: validationError ?? 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const prompt = buildPrompt(profile);
    let plan: any;
    let usedFallback = false;

    try {
      plan = await callGroq(prompt);
    } catch {
      usedFallback = true;
      plan = await callGemini(prompt);
    }

    if (!plan?.schedule || !Array.isArray(plan.schedule)) {
      throw new Error('Invalid plan structure returned by AI');
    }

    await recordUsage(supabase, user.id);

    return new Response(
      JSON.stringify({ plan, provider: usedFallback ? 'gemini' : 'groq' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
