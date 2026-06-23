# FitForge AI

An AI-powered personal fitness coach built with React Native (Expo), Supabase, and Groq LLaMA 3.3 70B.

---

## Download

> **Android APK — Version 1.0**

### [⬇ Download Latest APK](../../releases/latest)

Or browse all versions on the [Releases page](../../releases).

**How to install on Android:**
1. Download the `.apk` file from the Releases page above
2. On your phone go to **Settings → Apps → Install unknown apps** and allow your browser
3. Open the downloaded `.apk` file and tap **Install**

---

## Features

- AI workout plan generation tailored to your goal, equipment, and schedule
- Live workout session tracker with set/rep logging
- AI coach chat (Groq LLaMA 3.3 70B with Gemini 2.0 fallback)
- Day logging with AI assessment and automatic plan adjustment
- Progress tracking — body weight, measurements, streak counter
- AI-generated daily health insights (cached per day)
- Reports with PDF export

---

## Tech Stack

| Layer | Technology |
|---|---|
| App | React Native + Expo SDK 54 |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Primary AI | Groq — LLaMA 3.3 70B Versatile |
| Fallback AI | Google Gemini 2.0 Flash |
| Auth | Supabase Auth |
| State | Zustand (persisted via AsyncStorage) |

---

## Developer Setup

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/fitforge-ai.git
cd fitforge-ai
npm install
```

### 2. Environment variables
Create `.env` in the project root:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Supabase — run SQL
In Supabase Dashboard → SQL Editor, run:
- `supabase/schema.sql`
- `supabase/migrations/20260623_api_usage.sql`

### 4. Deploy edge functions
```bash
npx supabase functions deploy ai-coach
npx supabase functions deploy assess-day
npx supabase functions deploy create-roadmap
npx supabase functions deploy modify-plan
npx supabase functions deploy generate-plan
npx supabase functions deploy daily-insights
npx supabase secrets set GROQ_API_KEY=your_key GEMINI_API_KEY=your_key
```

### 5. Start development
```bash
npx expo start --android
```

### 6. Run tests
```bash
npm test
```

---

## License

MIT — free to use and modify.
