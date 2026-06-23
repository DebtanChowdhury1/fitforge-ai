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
    .eq('function_name', 'generate-report')
    .eq('date', today);
  return (count ?? 0) < DAILY_LIMIT;
}

async function recordUsage(sb: ReturnType<typeof createClient>, userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await sb.from('api_usage').insert({ user_id: userId, function_name: 'generate-report', date: today });
}

const SYSTEM_PROMPT = `You are ForgeAI — a world-class personal fitness and health coach with 20 years of experience. You are writing a detailed, personalised performance report for your client. This is a premium coaching document, not a quick summary.

VOICE & TONE — NON-NEGOTIABLE:
Write exactly like an experienced human coach who genuinely knows this person. Be direct, specific, warm, and honest. Say what needs to be said. Use second person ("you", "your") throughout. Write in full paragraphs, never bullet points, never numbered lists. Use contractions always. Short punchy sentences mixed with longer explanatory ones. Be honest — if they missed sessions, say so constructively. Reference SPECIFIC numbers and dates from their data. Vagueness is a failure.
Never write: "Based on your data...", "It's important to...", "Great job!", "I'm proud of you".
Never use bullet points, numbered lists, or sub-headers within section content.

STRUCTURE — return exactly 8 sections, each with 3-4 substantial paragraphs of content:

Section 1 — id: "executive", title: "The Honest Picture"
Section 2 — id: "work", title: "What You Put In"
Section 3 — id: "numbers", title: "The Numbers Don't Lie"
Section 4 — id: "momentum", title: "Where Momentum Is Building"
Section 5 — id: "gaps", title: "What Needs Your Attention"
Section 6 — id: "recovery", title: "Recovery & The Bigger Picture"
Section 7 — id: "nextweek", title: "Your Next 7 Days"
Section 8 — id: "coach", title: "A Word From Your Coach"

LENGTH: Each section must be at least 180 words. The full report must be 2000-2800 words total.

DISCLAIMER: End the "coach" section with: "Remember: this report is general coaching guidance. For medical decisions or health conditions, always consult a qualified healthcare professional."

VISUAL RICHNESS: You may use 1-2 emojis per section to emphasise key points.

Return valid JSON only, no markdown, no code blocks:
{
  "title": "Performance Report — [specific date or date range]",
  "sections": [
    { "id": "executive", "title": "The Honest Picture", "content": "full content here..." },
    { "id": "work", "title": "What You Put In", "content": "..." },
    { "id": "numbers", "title": "The Numbers Don't Lie", "content": "..." },
    { "id": "momentum", "title": "Where Momentum Is Building", "content": "..." },
    { "id": "gaps", "title": "What Needs Your Attention", "content": "..." },
    { "id": "recovery", "title": "Recovery & The Bigger Picture", "content": "..." },
    { "id": "nextweek", "title": "Your Next 7 Days", "content": "..." },
    { "id": "coach", "title": "A Word From Your Coach", "content": "..." }
  ]
}`;

interface ReportSection { id: string; title: string; content: string; }
interface ReportResponse { title: string; sections: ReportSection[]; }

function parseReport(text: string): ReportResponse | null {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.title && Array.isArray(parsed.sections) && parsed.sections.length >= 5) return parsed;
    return null;
  } catch { return null; }
}

async function callGroq(prompt: string): Promise<ReportResponse | null> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('GROQ_API_KEY secret is not configured');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.78,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new Error(`Groq ${response.status}`);
  const data = await response.json();
  return parseReport(data.choices[0].message.content);
}

async function callGemini(prompt: string): Promise<ReportResponse | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY secret is not configured');
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${prompt}\n\nRespond with valid JSON only, no code blocks:`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.78 },
      }),
    },
  );
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const data = await response.json();
  const raw = data.candidates[0].content.parts[0].text ?? '';
  return parseReport(raw);
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
      JSON.stringify({ error: 'Daily report limit reached. Try again tomorrow.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const { context, reportType, dateRange } = await req.json();

    let periodLine: string;
    if (reportType === 'custom' && dateRange?.from && dateRange?.to) {
      const fmt = (d: string) =>
        new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      periodLine = `Generate a comprehensive performance report for the period ${fmt(dateRange.from)} to ${fmt(dateRange.to)}.`;
    } else {
      const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      periodLine = `Generate a comprehensive daily performance report for ${today}.`;
    }

    const safeContext = typeof context === 'string' ? context.slice(0, 8000) : '';

    const prompt = `${periodLine}

Write a premium, detailed coaching report. Each section must be at least 180 words with 3-4 full paragraphs. Use every specific number in the data below. Sound like a real experienced coach — direct, warm, specific, honest.

USER DATA:
${safeContext}

Critical: 8 sections, each 3-4 paragraphs, total 2000-2800 words. Be specific, be human, be direct. No bullet points anywhere.`;

    let result: ReportResponse | null = null;
    try {
      result = await callGroq(prompt);
    } catch (groqErr) {
      console.error('Groq report failed:', groqErr);
      result = await callGemini(prompt);
    }

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Report generation failed — try again in a moment.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    await recordUsage(supabase, user.id);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('generate-report error:', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Unexpected error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
