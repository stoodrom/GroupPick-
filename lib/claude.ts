import Groq from 'groq-sdk';
import type { Submission, ResolveResult } from '@/lib/types';

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function resolveGroupPick(submissions: Submission[]): Promise<Omit<ResolveResult, 'resolvedAt'>> {
  const submissionSummary = submissions.map((s) => ({
    name: s.name,
    mood: s.mood,
    likedGenres: s.likedGenres,
    hatedGenres: s.hatedGenres,
    contentType: s.contentType,
    vibe: s.vibe || 'no specific vibe noted',
  }));

  const prompt = `You are GroupPick, an expert at finding the perfect movie or TV show for a group of people with different tastes.

Here are the group members' preferences:
${JSON.stringify(submissionSummary, null, 2)}

MOOD GLOSSARY (interpret each person's mood using these definitions):
- "fun": wants laughs, light-hearted comedy, upbeat energy.
- "emotional": wants a tearjerker, heartfelt drama, character-driven feels.
- "thrilling": wants edge-of-seat tension, action, suspense.
- "mind-bending": wants twists, puzzles, sci-fi or cerebral stories.
- "chill": wants something cozy, easy to follow, low-stakes.
- "tired": low-effort viewing — prefer shorter runtimes, familiar formats, avoid dense plots or heavy subtitles.
- "binge": in the mood for a multi-episode TV series they can tear through (favor shows over movies when this mood dominates).
- "snacking": wants something they can watch while eating — visually fun, not too dark, minimal need to read subtitles.

CURATED COLLECTIONS:
Some entries in a person's "likedGenres" may be curated collection labels instead of literal genres. Treat these as strong positive filters when choosing titles:
- "Audience Favorites" → crowd-pleasers with very high audience ratings.
- "Oscar Winners" → Academy Award winning or nominated films.
- "Trending Now" → recently popular titles people are talking about.
- "Hidden Gems" → excellent but lesser-known titles.
- "Critically Acclaimed" → top-rated by professional critics.
- "Family-Friendly" → safe for all ages, no heavy content.
- "Classics" → iconic older titles that stand the test of time.
- "Foreign Films" → non-English-language cinema.
If multiple people share a curated label, lean heavily into that collection. Literal genre names (Action, Comedy, etc.) should still be respected as genre preferences.

Your task:
1. Analyze everyone's preferences, moods, liked genres (including curated collection hints), hated genres, content type preferences, and vibe notes.
2. Find the BEST single movie or TV show that satisfies the most people while avoiding dealbreakers (hated genres).
3. Also pick 2 runner-up options.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation, just JSON):
{
  "topPick": {
    "title": "string",
    "type": "movie" | "show",
    "genre": "Primary Genre",
    "year": number,
    "synopsis": "2-3 sentence synopsis",
    "overallScore": number (0-100),
    "scorecard": [
      { "person": "name", "score": number (0-100), "reason": "1 sentence why this works or doesn't for them" }
    ]
  },
  "runnerUps": [
    {
      "title": "string",
      "type": "movie" | "show",
      "genre": "Primary Genre",
      "year": number,
      "synopsis": "2-3 sentence synopsis",
      "overallScore": number (0-100),
      "scorecard": [
        { "person": "name", "score": number (0-100), "reason": "1 sentence" }
      ]
    },
    {
      "title": "string",
      "type": "movie" | "show",
      "genre": "Primary Genre",
      "year": number,
      "synopsis": "2-3 sentence synopsis",
      "overallScore": number (0-100),
      "scorecard": [
        { "person": "name", "score": number (0-100), "reason": "1 sentence" }
      ]
    }
  ]
}

Rules:
- Only recommend real, well-known titles that actually exist.
- Avoid any title whose primary genre someone explicitly hated (this is a hard rule).
- The scorecard MUST have exactly one entry per group member, using their exact names.
- overallScore should reflect how well the pick satisfies the whole group, weighted toward compromise.
- If most people are "tired", prefer shorter / easier watches. If most people are "binge", prefer TV series. If most people are "snacking", prefer visually-driven English-language titles.
- Respect curated collection hints (Oscar Winners, Hidden Gems, etc.) as strong filters.
- Pick titles that are highly rated and widely available on mainstream streaming.`;

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 2000,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are GroupPick, an expert movie/TV recommender. Always respond with valid JSON only, no markdown or commentary.',
      },
      { role: 'user', content: prompt },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? '';

  // Strip markdown code fences if present (safety net)
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let result: Omit<ResolveResult, 'resolvedAt'>;
  try {
    result = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse model response: ${text.slice(0, 200)}`);
  }

  return result;
}
