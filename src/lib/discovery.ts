// Discovery: trending, top-rated, and new shoes for Home, and reviewers to
// follow for the Feed. The ranking heuristics live in SQL (see the
// 20261013022819_discovery migration); the RPCs return ids plus the numbers
// behind each ranking, and the rows themselves load with the usual queries.
import { fetchNewReleases, fetchShoesByIds, type ShoeListItem } from './shoes';
import { supabase } from './supabase';

/** A shoe in a discovery section, with a short line saying why it's there. */
export type DiscoveryShoe = { shoe: ShoeListItem; caption: string | null };

export type Discovery = {
  trending: DiscoveryShoe[];
  topRated: DiscoveryShoe[];
  newReleases: DiscoveryShoe[];
};

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export async function fetchDiscovery(limit = 10): Promise<Discovery> {
  const [trending, topRated, newReleases] = await Promise.all([
    supabase.rpc('trending_shoes', { max_results: limit }),
    supabase.rpc('top_rated_shoes', { max_results: limit }),
    fetchNewReleases(limit),
  ]);
  if (trending.error) throw trending.error;
  if (topRated.error) throw topRated.error;

  // One query for every shoe either ranking mentions.
  const ids = [...new Set([...trending.data, ...topRated.data].map((row) => row.shoe_id))];
  const shoes = new Map((await fetchShoesByIds(ids)).map((shoe) => [shoe.id, shoe]));

  return {
    trending: trending.data.flatMap((row) => {
      const shoe = shoes.get(row.shoe_id);
      if (!shoe) return [];
      // The section is titled "Trending this week", so no need to repeat it.
      const caption =
        row.reviews_this_week > 0 ? plural(row.reviews_this_week, 'new review') : 'Getting attention';
      return [{ shoe, caption }];
    }),
    topRated: topRated.data.flatMap((row) => {
      const shoe = shoes.get(row.shoe_id);
      if (!shoe) return [];
      return [{ shoe, caption: `★ ${row.average_rating.toFixed(1)} · ${plural(row.review_count, 'review')}` }];
    }),
    newReleases: newReleases.map((shoe) => ({
      shoe,
      caption: shoe.release_year ? `Released ${shoe.release_year}` : null,
    })),
  };
}

export type SuggestedReviewer = {
  id: string;
  username: string;
  display_name: string | null;
  /** Why they're suggested, e.g. "Followed by 2 people you follow". */
  reason: string;
};

export async function fetchSuggestedReviewers(limit = 10): Promise<SuggestedReviewer[]> {
  const { data: ranked, error } = await supabase.rpc('suggested_reviewers', { max_results: limit });
  if (error) throw error;
  if (ranked.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in(
      'id',
      ranked.map((row) => row.profile_id),
    );
  if (profilesError) throw profilesError;
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));

  return ranked.flatMap((row) => {
    const profile = byId.get(row.profile_id);
    if (!profile) return [];
    const reason =
      row.mutual_count > 0
        ? `Followed by ${row.mutual_count} ${row.mutual_count === 1 ? 'person' : 'people'} you follow`
        : plural(row.review_count, 'review');
    return [{ ...profile, reason }];
  });
}
