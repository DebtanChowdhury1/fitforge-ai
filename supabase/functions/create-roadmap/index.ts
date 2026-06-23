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
    .eq('function_name', 'create-roadmap')
    .eq('date', today);
  return (count ?? 0) < DAILY_LIMIT;
}

async function recordUsage(sb: ReturnType<typeof createClient>, userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await sb.from('api_usage').insert({ user_id: userId, function_name: 'create-roadmap', date: today });
}

const VALID_GOALS = ['weight_loss', 'muscle_gain', 'endurance', 'general_fitness'];
const VALID_EQUIPMENT = ['none', 'home_dumbbells', 'full_gym'];
const VALID_LEVELS = ['beginner', 'intermediate', 'advanced'];

function sanitizeInput(raw: any): { valid: boolean; input?: any; error?: string } {
  if (!raw || typeof raw !== 'object') return { valid: false, error: 'Invalid input' };
  const goal_type = String(raw.goal_type ?? '').slice(0, 50);
  if (!VALID_GOALS.includes(goal_type)) return { valid: false, error: 'Invalid goal_type' };

  const gd = raw.goal_details ?? {};
  const equipment = String(gd.equipment ?? '').slice(0, 50);
  const experience_level = String(gd.experience_level ?? '').slice(0, 50);
  if (!VALID_EQUIPMENT.includes(equipment)) return { valid: false, error: 'Invalid equipment' };
  if (!VALID_LEVELS.includes(experience_level)) return { valid: false, error: 'Invalid experience_level' };

  const days_per_week = Number(gd.days_per_week);
  const session_duration = Number(gd.session_duration);
  if (!Number.isInteger(days_per_week) || days_per_week < 1 || days_per_week > 7) return { valid: false, error: 'days_per_week must be 1–7' };
  if (!Number.isInteger(session_duration) || session_duration < 15 || session_duration > 180) return { valid: false, error: 'session_duration must be 15–180' };

  const total_days = Number(raw.total_days);
  if (!Number.isInteger(total_days) || total_days < 7 || total_days > 365) return { valid: false, error: 'total_days must be 7–365' };

  return {
    valid: true,
    input: {
      ...raw,
      goal_type,
      total_days,
      goal_details: {
        ...gd,
        equipment,
        experience_level,
        days_per_week,
        session_duration,
        limitations: String(gd.limitations ?? '').replace(/[<>"']/g, '').slice(0, 500),
      },
    },
  };
}

function buildPrompt(input: any): string {
  const totalWeeks = Math.ceil(input.total_days / 7);
  const goalDescriptions: Record<string, string> = {
    weight_loss:     `lose weight (current: ${input.goal_details.current_weight}${input.goal_details.units}, target: ${input.goal_details.target_weight}${input.goal_details.units})`,
    muscle_gain:     `gain muscle (current: ${input.goal_details.current_weight}${input.goal_details.units}, target: ${input.goal_details.target_weight ?? 'lean bulk'}${input.goal_details.units})`,
    endurance:       `build endurance for ${input.goal_details.event_type ?? 'general cardio'}`,
    general_fitness: 'improve overall health and fitness',
  };
  const equipMap: Record<string, string> = {
    none:           'bodyweight only',
    home_dumbbells: 'home dumbbells and bands',
    full_gym:       'full gym (barbells, cables, machines)',
  };

  return `You are an elite personal trainer and coach. Create a structured ${totalWeeks}-week training roadmap for a ${input.goal_details.experience_level} athlete aiming to ${goalDescriptions[input.goal_type] ?? input.goal_type}.

Schedule: ${input.goal_details.days_per_week} training days per week, ${input.goal_details.session_duration} min sessions.
Equipment: ${equipMap[input.goal_details.equipment] ?? input.goal_details.equipment}
${input.goal_details.limitations ? `Limitations: ${input.goal_details.limitations}` : 'No injuries.'}

Divide the ${totalWeeks} weeks into 3-4 progressive phases. For EACH phase give a full 7-day weekly template (including rest/recovery days).

Return ONLY valid JSON with this exact structure:
{
  "plan_name": "Short descriptive name",
  "phases": [
    {
      "name": "Phase name e.g. Foundation",
      "week_range": [1, 4],
      "theme": "One line describing this phase's focus",
      "weekly_template": [
        {
          "day_of_week": "Monday",
          "day_type": "workout",
          "focus": "Upper Body Strength",
          "exercises": [
            {"name": "Bench Press", "sets": 4, "reps": "8-10", "rest_seconds": 90, "notes": "Control eccentric", "muscle_group": "Chest"}
          ],
          "cardio": {"type": "Treadmill", "duration": 20, "intensity": "moderate"}
        },
        {
          "day_of_week": "Tuesday",
          "day_type": "rest",
          "focus": "Rest Day",
          "exercises": [],
          "cardio": null
        }
      ]
    }
  ],
  "nutrition_note": "Brief nutrition guidance for this goal"
}

Rules:
- Include ALL 7 days per phase template (workout + rest days)
- Cardio field is null for pure strength days or rest days
- Progression: each phase should be harder than the last
- For weight_loss: mix strength + cardio (HIIT/steady state)
- For muscle_gain: focus on progressive overload, minimal cardio
- For endurance: cardio-focused with supporting strength
- rest_seconds between 45-180 based on intensity
- exercises: 4-7 per workout day
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
      temperature: 0.35,
      max_tokens: 6000,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new Error(`Groq ${response.status}: ${await response.text()}`);
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
        generationConfig: { temperature: 0.35, maxOutputTokens: 6000 },
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
      JSON.stringify({ error: 'Daily roadmap limit reached. Try again tomorrow.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const rawBody = await req.json();
    const { valid, input, error: validationError } = sanitizeInput(rawBody);
    if (!valid || !input) {
      return new Response(
        JSON.stringify({ error: validationError ?? 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const prompt = buildPrompt(input);
    let result: any;
    try {
      result = await callGroq(prompt);
    } catch {
      result = await callGemini(prompt);
    }

    if (!result?.phases?.length) throw new Error('Invalid roadmap structure from AI');

    await recordUsage(supabase, user.id);

    return new Response(JSON.stringify({ roadmap: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
