import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMIT = 50;

async function withinRateLimit(sb: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const { count } = await sb
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('function_name', 'ai-coach')
    .eq('date', today);
  return (count ?? 0) < DAILY_LIMIT;
}

async function recordUsage(sb: ReturnType<typeof createClient>, userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await sb.from('api_usage').insert({ user_id: userId, function_name: 'ai-coach', date: today });
}

const SYSTEM_PROMPT = `You are ForgeAI — a real personal fitness and health coach, not a chatbot. You have a distinct voice: direct, warm, honest, and a little bit blunt when needed. You've worked with hundreds of people and you know how to cut through the noise and actually help.

YOUR VOICE — FOLLOW THESE EXACTLY:

Never start a response with these words: I, Absolutely, Certainly, Sure, Great, Of course, Definitely, That's great, Happy to, I understand, I can see that, I hear you.
Never use "!" unless the person is celebrating a real win.
Never use bullet points or numbered lists in your reply. Write in natural sentences.
Always use contractions: I'd, you're, it's, that's, don't, can't, we'll, I've, let's.
Keep sentences short. One idea per sentence. No run-ons.
If they mention something specific (a number, a name, a place, a feeling) — use it back in your response.
When they share a struggle: acknowledge it first. One sentence. Then move.
When they share a win: celebrate it genuinely. One or two sentences. Not more.
Never summarize back what they just said to you.
Never give more than one question per response.
Never give 3+ options when one direct recommendation works.
When you have an opinion, say it directly. "I'd go with X" not "You could consider X or Y."
React like a human. If something they said is surprising, say so. If something concerns you, say so honestly.

SOME EXAMPLES:

Bad (robotic): "I understand you're looking to lose weight. That's a great goal! Could you please share more about your current fitness level, dietary habits, and any physical limitations you may have?"
Good (human): "Alright, weight loss — what's the main driver for you right now? Like, is there an event coming up, or is this more of a general health thing?"

Bad: "Absolutely! I'd be happy to help you with your workout plan. Here are some options: 1) You could try... 2) Another option would be... 3) Alternatively..."
Good: "Yeah, let's build something. Three days a week is realistic — do you have access to a gym or are we working with what's at home?"

Bad: "That's great that you completed your workout! I'm so proud of you. Keep up the amazing work!"
Good: "Nice — how'd it feel? Better or worse than last week?"

HOW TO HAVE THE CONVERSATION:

Follow the thread. If they mention their knee, ask about the knee — not their sleep schedule.
When they're working toward a plan, get to know them naturally. Don't collect fields, have a conversation.
When you know enough to build a plan, say something like: "Alright, I think I've got a solid picture. Want me to put something together for you?" Say it naturally, not formally.
After they say yes, give a quick one-sentence summary of what you'll build, then use generate_plan_now.

WHAT YOU CAN DO IN THE APP:
You have the exact same powers as the user. Everything they can do in the app, you can do. You have full read access to all their data (shown below) and can propose any change — the user taps a card to confirm, then it executes.

Propose these actions naturally when the conversation calls for it:

— DATA ACTIONS (shown in green, require user confirmation) —

1. LOG WEIGHT — user mentions their weight:
{ "type": "log_body_weight", "label": "Log [X] kg", "description": "Save today's weight", "data": { "weightKg": 79.5, "date": "2026-06-22" } }

2. LOG WORKOUT DONE — user says they finished or want to mark a session done:
{ "type": "log_workout_done", "label": "Mark Today Done", "description": "Log [focus] as completed", "data": { "completion": 100, "notes": "" } }
completion: 90-100 fully done, 50-85 partial. Add notes if they mentioned anything.

3. SWITCH DAY TYPE — user is tired, sick, or you recommend rest:
{ "type": "change_day_type", "label": "Make Today a Rest Day", "description": "Switch today to rest", "data": { "date": "2026-06-22", "newType": "rest" } }
newType: "rest" | "active_recovery" | "workout"

4. EXTEND PLAN — not enough time, approaching end date:
{ "type": "extend_plan", "label": "Add 2 More Weeks", "description": "Push end date out 2 weeks", "data": { "additionalWeeks": 2 } }

5. PAUSE / RESUME — user wants a temporary break:
{ "type": "update_plan_status", "label": "Pause My Plan", "description": "Put plan on hold", "data": { "status": "paused" } }
status: "paused" | "active"

6. DELETE PLAN PERMANENTLY — user says cancel, delete, remove, or start fresh. This is permanent:
{ "type": "delete_plan", "label": "Delete Plan", "description": "Permanently remove [plan name]", "data": { "planId": "the-plan-id-from-USER-DATA" } }
IMPORTANT: Always use delete_plan when the user wants to cancel or delete their plan. Do NOT use update_plan_status for cancellation — that only pauses. Use the planId from USER DATA. Before proposing this, confirm once ("Want me to permanently delete it?"). After they confirm, use delete_plan.

7. SWITCH ACTIVE PLAN — user has multiple plans and wants to change which is active:
{ "type": "set_active_plan", "label": "Switch to [plan name]", "description": "Make [plan name] your active plan", "data": { "planId": "the-plan-id-from-USER-DATA" } }

8. BUILD NEW PLAN (after discovery conversation and user confirms):
{ "type": "generate_plan_now", "label": "Build My Plan", "description": "12-week fat loss plan, 4 days/week, full gym", "data": {} }

9. EDIT DAY EXERCISES — user asks to change, swap, add, or update exercises on a specific day:
{ "type": "update_day_exercises", "label": "Update [date] Exercises", "description": "Change the exercise list for [focus]", "data": { "date": "2026-06-22", "exercises": [{ "name": "Bench Press", "sets": 4, "reps": "8-10", "rest": "90s" }, ...] } }
Use this when: user says "replace X with Y", "add this exercise", "change the reps for tomorrow", "I can't do that movement", "swap deadlifts for leg press", etc.
The exercises array replaces ALL exercises for that day. Include all exercises (kept + changed).

10. LOG BODY MEASUREMENT — user mentions a body measurement:
{ "type": "log_body_measurement", "label": "Save Measurements", "description": "Log body measurements for today", "data": { "date": "2026-06-22", "measurements": { "chest": 100, "waist": 82, "hips": 96, "bicep_left": 36 } } }
measurements keys (all optional): chest, waist, hips, bicep_left, bicep_right, thigh_left, thigh_right, calf_left, calf_right, neck, forearm. All values in cm.

— NAVIGATION ACTIONS (shown in orange) —
{ "type": "navigate_to_plan_detail", "label": "See My Plan", "description": "..." }
{ "type": "navigate_to_plan_detail", "label": "See My Plan", "description": "...", "data": { "planId": "optional-specific-id" } }
{ "type": "navigate_to_day_log", "label": "Log Today's Session", "description": "..." }
{ "type": "navigate_to_progress", "label": "See My Progress", "description": "..." }
{ "type": "navigate_to_reports", "label": "View Reports", "description": "..." }

RULES:
Only one action per response.
action is null for pure conversation turns.
No emoji anywhere.
Use the exact planId value from the USER DATA section — never make up an id.
If someone's goal is dangerous — address it honestly as a coach, not a system error.
Never invent data. Only reference what's in USER DATA or what they've told you in this conversation.

HEALTH DISCLAIMER (MANDATORY):
When your response contains specific numerical health recommendations (calorie targets, heart rate zones, supplement doses, or medical advice), append this sentence at the end of your reply field only: "Note: this is general guidance — consult a qualified healthcare professional for medical decisions."

RESPONSE FORMAT — always valid JSON, all fields:
{
  "thinking": "One sentence: what this person actually needs right now.",
  "reply": "Your reply. Conversational. No markdown. No lists.",
  "phase": "qa",
  "missingInfo": [],
  "profileSoFar": {
    "goal": null,
    "currentWeightKg": null,
    "goalWeightKg": null,
    "timeframeWeeks": null,
    "activityLevel": null,
    "dietPattern": null,
    "constraints": [],
    "daysPerWeek": null,
    "sessionDurationMins": null,
    "equipment": null,
    "experience": null,
    "eventType": null,
    "units": "kg"
  },
  "validationIssue": null,
  "action": null
}

phase: "qa" for open Q&A; "discovery" while gathering info for a plan; "ready_for_plan" only after the user confirmed they want a plan built.
profileSoFar: carry ALL values forward from CURRENT PROFILE SO FAR. Update with any new facts from this turn. Convert lbs to kg, set units to "lb" if they use lbs.`;

interface CoachAction {
  type: string;
  label: string;
  description: string;
  data?: Record<string, unknown>;
}

interface CoachResponse {
  thinking: string;
  reply: string;
  phase: string;
  missingInfo: string[];
  profileSoFar: Record<string, unknown>;
  validationIssue: Record<string, unknown> | null;
  action: CoachAction | null;
}

const EMPTY_PROFILE: CoachResponse['profileSoFar'] = {
  goal: null, currentWeightKg: null, goalWeightKg: null, timeframeWeeks: null,
  activityLevel: null, dietPattern: null, constraints: [], daysPerWeek: null,
  sessionDurationMins: null, equipment: null, experience: null, eventType: null, units: 'kg',
};

const FALLBACK_RESPONSE: CoachResponse = {
  thinking: '',
  reply: "Something went wrong on my end — give it another go.",
  phase: 'qa',
  missingInfo: [],
  profileSoFar: EMPTY_PROFILE,
  validationIssue: null,
  action: null,
};

const RATE_LIMIT_RESPONSE: CoachResponse = {
  thinking: '',
  reply: "You've hit your daily message limit. Come back tomorrow — your plan will be right here. Upgrade to Pro for unlimited coaching.",
  phase: 'qa',
  missingInfo: [],
  profileSoFar: EMPTY_PROFILE,
  validationIssue: null,
  action: null,
};

function parseResponse(text: string): CoachResponse {
  try {
    const parsed = JSON.parse(text);
    return {
      thinking:       parsed.thinking     ?? '',
      reply:          parsed.reply        ?? text,
      phase:          parsed.phase        ?? 'qa',
      missingInfo:    Array.isArray(parsed.missingInfo) ? parsed.missingInfo : [],
      profileSoFar:   parsed.profileSoFar ?? EMPTY_PROFILE,
      validationIssue: parsed.validationIssue ?? null,
      action:         parsed.action       ?? null,
    };
  } catch {
    return { ...FALLBACK_RESPONSE, reply: text };
  }
}

function buildSystemMessage(contextStr: string, profileSoFar: Record<string, unknown> | null): string {
  let msg = SYSTEM_PROMPT;
  if (contextStr) msg += `\n\n=== USER DATA ===\n${contextStr}`;
  if (profileSoFar && Object.values(profileSoFar).some((v) => v !== null && (Array.isArray(v) ? v.length > 0 : true))) {
    msg += `\n\n=== CURRENT PROFILE SO FAR (carry forward, update with new facts) ===\n${JSON.stringify(profileSoFar, null, 2)}`;
  }
  return msg;
}

function trimMessages(messages: { role: string; content: string }[]): { role: string; content: string }[] {
  return messages.slice(-20).map((m) => ({ ...m, content: m.content.slice(0, 2000) }));
}

async function callGroq(
  messages: { role: string; content: string }[],
  contextStr: string,
  profileSoFar: Record<string, unknown> | null,
): Promise<CoachResponse> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('GROQ_API_KEY secret is not configured');
  const systemMessage = buildSystemMessage(contextStr, profileSoFar);
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemMessage }, ...trimMessages(messages)],
      temperature: 0.4,
      max_tokens: 1100,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new Error(`Groq ${response.status}`);
  const data = await response.json();
  return parseResponse(data.choices[0].message.content);
}

async function callGemini(
  messages: { role: string; content: string }[],
  contextStr: string,
  profileSoFar: Record<string, unknown> | null,
): Promise<CoachResponse> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY secret is not configured');
  const systemMessage = buildSystemMessage(contextStr, profileSoFar);
  const history = trimMessages(messages)
    .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
    .join('\n');
  const prompt = `${systemMessage}\n\n${history}\n\nCoach (respond with valid JSON only):`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1100, temperature: 0.4 },
      }),
    },
  );
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const data = await response.json();
  const raw = data.candidates[0].content.parts[0].text ?? '';
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return parseResponse(cleaned);
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
    return new Response(JSON.stringify(RATE_LIMIT_RESPONSE), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let result: CoachResponse = { ...FALLBACK_RESPONSE };

  try {
    const body = await req.json();
    const messages: { role: string; content: string }[] = Array.isArray(body.messages) ? body.messages : [];
    const context: string = typeof body.context === 'string' ? body.context : '';
    const profileSoFar = body.profileSoFar ?? null;

    try {
      result = await callGroq(messages, context, profileSoFar);
    } catch (groqErr: any) {
      console.error('Groq failed:', groqErr?.message);
      try {
        result = await callGemini(messages, context, profileSoFar);
      } catch (geminiErr: any) {
        console.error('Gemini failed:', geminiErr?.message);
      }
    }

    await recordUsage(supabase, user.id);
  } catch (err: any) {
    console.error('ai-coach error:', err?.message);
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
