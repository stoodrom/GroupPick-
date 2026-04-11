const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

export function getPosterUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${TMDB_IMG}${path}`;
}

export async function searchTMDB(
  title: string,
  type: 'movie' | 'show',
  year?: number
): Promise<{ tmdbId: number; posterPath: string | null } | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  const endpoint = type === 'movie' ? 'search/movie' : 'search/tv';
  const yearParam = year
    ? type === 'movie'
      ? `&primary_release_year=${year}`
      : `&first_air_date_year=${year}`
    : '';

  try {
    const res = await fetch(
      `${TMDB_BASE}/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(title)}${yearParam}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const first = data.results?.[0];
    if (!first) return null;
    return {
      tmdbId: first.id,
      posterPath: first.poster_path ?? null,
    };
  } catch {
    return null;
  }
}
