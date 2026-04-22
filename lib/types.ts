export type ContentType = 'movie' | 'show' | 'both';

export type Mood =
  | 'fun'
  | 'emotional'
  | 'thrilling'
  | 'mind-bending'
  | 'chill'
  | 'tired'
  | 'binge'
  | 'snacking';

export const MOOD_OPTIONS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'fun', emoji: '😂', label: 'Fun' },
  { value: 'emotional', emoji: '😢', label: 'Emotional' },
  { value: 'thrilling', emoji: '😱', label: 'Thrilling' },
  { value: 'mind-bending', emoji: '🤯', label: 'Mind-bending' },
  { value: 'chill', emoji: '😴', label: 'Chill' },
  { value: 'tired', emoji: '🥱', label: 'Tired' },
  { value: 'binge', emoji: '🍿', label: 'Binge-watch' },
  { value: 'snacking', emoji: '🍕', label: 'Snacking' },
];

export const GENRE_OPTIONS = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery',
  'Romance', 'Sci-Fi', 'Thriller', 'Western',
];

// Curated "collection" filters — love-only, pass to the model as positive hints.
export const CURATED_OPTIONS: { label: string; emoji: string }[] = [
  { label: 'Audience Favorites', emoji: '⭐' },
  { label: 'Oscar Winners', emoji: '🏆' },
  { label: 'Trending Now', emoji: '🔥' },
  { label: 'Hidden Gems', emoji: '💎' },
  { label: 'Critically Acclaimed', emoji: '📰' },
  { label: 'Family-Friendly', emoji: '👨\u200d👩\u200d👧' },
  { label: 'Classics', emoji: '🎞️' },
  { label: 'Foreign Films', emoji: '🌍' },
];

export interface Submission {
  name: string;
  mood: Mood;
  likedGenres: string[];
  hatedGenres: string[];
  contentType: ContentType;
  vibe: string;
  recentlyWatched: string[];
  submittedAt: number;
}

export interface ScorecardEntry {
  person: string;
  score: number; // 0-100
  reason: string;
}

export interface Pick {
  title: string;
  type: 'movie' | 'show';
  genre: string;
  year: number;
  synopsis: string;
  scorecard: ScorecardEntry[];
  overallScore: number;
  tmdbId?: number;
  posterPath?: string;
  trailerUrl?: string;
}

export interface ResolveResult {
  topPick: Pick;
  runnerUps: Pick[];
  resolvedAt: number;
}

export interface Analytics {
  totalSessions: number;
  totalResolutions: number;
  avgGroupSize: number;
  topMoods: Record<string, number>;
  topGenres: Record<string, number>;
  resolutionRate: number;
  avgTimeToResolveMs: number;
}

export interface Session {
  id: string;
  createdAt: number;
  resolved: boolean;
  groupNames: string[];
  submissions: Submission[];
  result?: ResolveResult;
}
